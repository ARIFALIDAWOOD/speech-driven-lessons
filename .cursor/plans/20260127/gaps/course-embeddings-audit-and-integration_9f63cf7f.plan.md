---
name: course-embeddings-audit-and-integration
overview: Assess and strengthen how course/document embeddings are created and used as per-course knowledge boundaries in the speech-driven-lessons backend.
todos:
  - id: survey-embedding-pipeline
    content: Reconfirm all code paths that build and consume course embeddings, including assistant and help-center flows.
    status: pending
  - id: normalize-course-identity
    content: Standardize on course_id as the key for storage and vector tables across CourseManager, S3ContextManager, and assistant routes.
    status: pending
  - id: wire-embeddings-into-lifecycle
    content: Hook CourseManager.process_course_content into course creation completion and document upload/delete flows.
    status: pending
  - id: optimize-vector-search
    content: Refactor vector_utils.search_similar_chunks to use the match_course_embeddings SQL function via Supabase RPC and remove Python-side full-table scans.
    status: pending
  - id: clarify-session-vs-course-context
    content: Define and, if needed, implement a clear strategy for combining course-level embeddings with session-scoped MaterialsContextManager context in the tutor.
    status: pending
---

### Goals

- **Map current embedding capabilities** for courses and per-session materials.
- **Assess how embeddings tie into course creation and document updates** for admins/students.
- **Identify concrete gaps and refactors** needed to make embeddings a reliable knowledge boundary per course.

### Current Embedding Capabilities

- **Persistent course embeddings (per-course boundary)**
- Implemented via `process_course_context_s3` in [`backend/utils/load_and_process_index.py`](backend/utils/load_and_process_index.py), which:
  - Reads all `*.txt` files under the course prefix in Supabase Storage, using `get_course_s3_folder(username, coursename)` from [`backend/utils/s3_utils.py`](backend/utils/s3_utils.py).
  - Chunks combined content with `tiktoken` (`gpt-4` encoding, `max_tokens` ~2000 per chunk).
  - Generates embeddings with OpenAI `text-embedding-3-large` in batches and normalizes to 3072-dim vectors.
  - Calls `vector_utils.store_course_embeddings(username, coursename, chunks, embeddings)` to write to pgvector-backed tables.
- **Vector store data model, with per-user/per-course boundary**, is defined in [`supabase/migrations/20260127_create_vector_store.sql`](supabase/migrations/20260127_create_vector_store.sql):
  - `course_embeddings(user_email, course_title, chunk_index, embedding, source_file, ...)` with HNSW index and RLS.
  - `course_chunks(user_email, course_title, chunk_index, chunk_text, ...)`.
  - `course_inverted_index(user_email, course_title, phrase, chunk_index, ...)` for quote/phrase lookups.
  - Helper SQL function `match_course_embeddings(...)` to run pgvector similarity search server-side.
- **Access / retrieval** is implemented in [`backend/s3_context_manager.py`](backend/s3_context_manager.py) and [`backend/utils/vector_utils.py`](backend/utils/vector_utils.py):
  - `ContextManager.load_saved_indices()` loads `chunks` from `course_chunks` via `vector_utils.get_course_chunks(...)` and falls back to `chunks.json` in storage.
  - `ContextManager.get_relevant_chunks(query, max_chunks)`:
  - Tries exact + fuzzy phrase lookup (inverted index) and then
  - Calls `vector_utils.search_similar_chunks(user, course_title, query_embedding, ...)` for semantic search.
  - `ContextManager.build_faiss_index()` is already repurposed to generate embeddings with `text-embedding-3-large` and call `store_course_embeddings(...)` instead of persisting a FAISS index.
  - `vector_utils` also provides `course_embeddings_exist`, `delete_course_embeddings`, `get_inverted_index_match`, `get_course_chunks`.

- **Session-scoped, in-memory embeddings for user-uploaded materials**
- Implemented in [`backend/services/materials_context.py`](backend/services/materials_context.py) as `MaterialsContextManager`:
  - Extracts text from PDFs via `pypdf`, chunks into ~500-word segments, and embeds with `text-embedding-3-small`.
  - Stores vectors in **in-memory FAISS** (or falls back to cosine similarity) keyed by `session_id` + `user_id`.
  - Provides `get_relevant_context(query, ...)` for session-only supplementary context.
- This is **separate** from the persistent course vector store and acts as an additional, ephemeral knowledge source boundary.

- **Tutor chatbot integration with course embeddings**
- FastAPI assistant router [`backend/routers/assistant.py`](backend/routers/assistant.py) wires the course-level context into the tutor:
  - Uses `S3ContextManager` from `s3_context_manager.ContextManager` when initializing and serving chat for `course_title`.
  - `initialize-chatbot` attempts to `load_saved_indices()` (course chunks + inverted index) and, if missing, intends to fall back to `process_course_context_s3(...)` to build them.
  - `get-ai-response` constructs a new `ChatBot` with a fresh `S3ContextManager(user=email, course_title=..., api_key=...)` and calls `chatbot.process_message`, which in [`backend/chatbot.py`](backend/chatbot.py):
  - Calls `context_manager.get_relevant_chunks(message)` to retrieve per-course context.
  - Calls the LLM (either via the new abstraction or legacy OpenAI client) and optionally parses slides from the response.
- A helper in [`backend/functions/get_detailed_content.py`](backend/functions/get_detailed_content.py) wraps the same pattern for `get_detailed_content(course_title, user, user_query)`.

### How This Relates to Course Creation & Document Updates

- **Course metadata and storage layout**
- Course metadata is managed by `CourseManager` in [`backend/utils/course_manager.py`](backend/utils/course_manager.py) with `course_info.json` per course under `user_data/{user_email}/{course_id}/`.
- Uploads are handled by the FastAPI and Flask course routes in [`backend/routers/course.py`](backend/routers/course.py) and [`backend/api/course.py`](backend/api/course.py):
  - Files are stored under `user_data/{user_email}/{course_id}/course_materials/{filename}` via `get_s3_course_materials_path(...)`.
  - `CourseManager.add_uploaded_file` and `remove_uploaded_file` update the `uploadedFiles` array in `course_info.json`.
- There is a **separate, legacy notion of `course_title` used as part of the storage path**, e.g. `get_course_s3_folder(username, coursename)`.

- **Where (re)building embeddings is wired today**
- `CourseManager.process_course_content(course_id)` exists and calls `process_course_context_s3(self.s3_bucket, self.user_email, course_id, self.api_key)`.
  - Importantly, this uses `course_id` as the `coursename` key for both storage (`get_course_s3_folder`) and the vector store (`course_title` column), which aligns with your preference to key embeddings by **`course_id`**.
- However, in the main FastAPI course flow (`/api/course/*` in [`backend/routers/course.py`](backend/routers/course.py)):
  - `create-course`, `auto-save-content`, `update-step`, `upload-file`, `delete-file` **do NOT currently trigger `process_course_content` or any embedding rebuild**.
  - `/process-content/{course_id}` endpoint currently only calls `generate_slides` and has the old FAISS-based call commented out.
- In the assistant router (`initialize-chatbot`):
  - On missing indices it calls `process_course_context_s3(...)` **directly but with an unqualified name**, while only `faiss_utils` is imported, which looks like a bug and may not actually run the embedding build.

- **Admin/Student perspective when creating/updating courses**
- When an admin/student:
  - **Creates or edits a course**: the system updates `course_info.json` and tracks `create_course_process.current_step` / `is_creation_complete`, but **does not yet mark or enforce that embeddings exist**.
  - **Uploads or deletes documents**: metadata and storage are kept in sync, but **embeddings are not automatically recomputed**; the vector store can become stale if new PDFs are added or removed.
- The tutor endpoints (`/api/initialize-chatbot`, `/api/get-ai-response`) assume a valid set of chunks/embeddings for the given `(user_email, course_title)` pair and default to `course_title` in their API.

### Direct Answers to Your Questions

- **1. How well are we equipped to create embeddings for courses?**
- **Technically we are well-equipped at the infrastructure level**:
  - There is a complete pipeline from Supabase Storage → chunking → OpenAI embeddings → Supabase pgvector tables, with RLS, indexes, and a SQL helper function for similarity search.
  - There is a dedicated `ContextManager` that wraps retrieval logic (exact quotes, fuzzy matching, and vector search) and is already plugged into the `ChatBot` used by the assistant endpoints.
- **However, wiring and ergonomics are incomplete**:
  - The main FastAPI course creation/upload flows do not reliably trigger embedding builds.
  - Assistant initialization has at least one wiring bug when trying to call `process_course_context_s3` as a fallback.
  - Vector search currently pulls all embeddings for a course into Python and computes cosine similarity client-side, instead of delegating to the `match_course_embeddings` SQL function, which is inefficient for scale.

- **2. When an Admin or Student creates/updates a course and its documents, are we equipped to create embeddings as a knowledge source boundary?**
- **Conceptually, yes**:
  - The data model creates a clear boundary per **user_email + course_id** (or `course_title` in older code) for:
  - Persistent chunks (`course_chunks`) and embeddings (`course_embeddings`).
  - Phrase/index metadata (`course_inverted_index`).
  - The assistant’s `S3ContextManager` is scoped per user + course and is used consistently in `ChatBot` for retrieval.
- **Practically, not fully yet**:
  - There is no guarantee that embeddings have been built or refreshed after:
  - Course creation is marked complete.
  - PDFs are uploaded, replaced, or deleted in `course_materials`.
  - There is no field in `course_info.json` that records `embeddings_status` or `last_vector_build_at`, so the UI/backend cannot reliably know if the vector store is in sync with the course documents.
  - The assistant router uses `course_title` in its API and storage paths, while `CourseManager` and uploads are clearly oriented around `course_id` for S3 organization, which can lead to mismatched boundaries if title and ID diverge.

- **3. What do you find missing?**

- **Boundary and identity consistency**
  - Standardize on **`course_id` as the canonical key** for embeddings (vector tables and storage paths), and:
  - Ensure `S3ContextManager` and assistant routes use `course_id` consistently instead of `course_title` as the storage key.
  - Keep `course_title` as display/metadata only.

- **Automatic rebuilds on document changes**
  - Wire `CourseManager.process_course_content(course_id)` into:
  - Course creation flow when `create_course_process.is_creation_complete` flips to `true`.
  - Upload/delete endpoints (`upload-file`, `delete-file`) so that embeddings are **automatically rebuilt when course materials change**, matching your preference.
  - Add debouncing or background job support once performance requires it, so large courses don’t block HTTP requests.

- **Status tracking and observability**
  - Extend `course_info.json` to include, for example:
  - `embeddings_status`: `"not_built" | "building" | "up_to_date" | "error"`.
  - `last_vector_build_at`: ISO timestamp.
  - `last_vector_source_hash` or similar to capture which set of text files the embeddings were built from.
  - Surface this in the API (and eventually UI) so admins/students know when the “Knowledge source” is ready.

- **Use of pgvector-native search instead of Python-side cosine**
  - Update `vector_utils.search_similar_chunks(...)` to call the database function `match_course_embeddings(...)` via Supabase RPC, so that:
  - Similarity search runs entirely in Postgres with HNSW index support.
  - We avoid loading all vectors into application memory for every query.

- **Robustness and correctness issues**
  - Fix the assistant router’s `initialize-chatbot` fallback to explicitly call `faiss_utils.process_course_context_s3(...)` (the new Supabase vector store version) and ensure it passes `course_id` consistently.
  - Audit and clean up legacy FAISS-based code paths (`backend/context_manager.py`, `backend/chatServer.py`) that are no longer aligned with the pgvector approach, to avoid confusion.
  - Ensure the inverted index is consistently stored and read from the database rather than relying on older `inverted_index.json` files wherever possible.

- **Alignment between per-course and per-session knowledge**
  - Define a clear strategy for combining:
  - Persistent, course-level embeddings from `S3ContextManager` (keyed by `course_id`).
  - Session-scoped materials from `MaterialsContextManager` (keyed by `session_id` + `user_id`).
  - For example, the tutor could:
  - Always retrieve top-N course chunks from pgvector.
  - Optionally retrieve top-M session-material chunks, and then merge or prioritize them based on scenario.

### Proposed Next Steps (High-Level)

- **1) Normalize identity & wiring**
- Refactor assistant and RAG-related code to consistently use `course_id` as the key for S3 storage and pgvector (`course_title` column becomes the ID, or a new `course_id` column is added if you prefer explicit separation).
- Fix `initialize-chatbot` so that, on first use of a course, it correctly invokes `process_course_context_s3(bucket, user_email, course_id, API_KEY)` and then uses `load_saved_indices()`.

- **2) Integrate embeddings into the course lifecycle**
- In the FastAPI course router:
  - After `create-course` marks `is_creation_complete=True`, trigger `CourseManager.process_course_content(course_id)` to build initial embeddings.
  - After each successful `upload-file` or `delete-file`, trigger a rebuild (with safeguards to avoid excessive rebuilds if many files are uploaded in quick succession).
- Extend API responses to reflect current embedding status so the frontend can show when the knowledge base is ready.

- **3) Harden retrieval and performance**
- Update `vector_utils.search_similar_chunks` to use the `match_course_embeddings` SQL function for server-side similarity, keeping the shape of results the same for existing callers.
- Add basic logging/metrics around vector search and build times for future tuning.

- **4) Clean up legacy / parallel implementations**
- Deprecate or clearly separate older, filesystem/FAISS-based `ContextManager` classes in `backend/context_manager.py` and `backend/chatServer.py` so new code only uses `s3_context_manager.ContextManager` + pgvector.
- Document in `AGENTS.md` (and perhaps a short `backend/FASTAPI_MIGRATION.md`) how embeddings are supposed to work end-to-end now.

These steps will move you from “infrastructure mostly there but loosely wired” to **a robust, automatic per-course knowledge source boundary**, keyed by `course_id`, that stays in sync whenever admins/students change course documents.