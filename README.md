# Speech-Driven-Lessons
If you'd like to view the full codebase, please contact robertadm1n10@gmail.com

🌟Realtime Interactive Lesson Page Demo (with Sound!):

https://github.com/user-attachments/assets/e34477f9-a241-49af-856e-16cb9b35e57c

✨Workflow Demo:

https://github.com/user-attachments/assets/d4a19b38-0fb4-47a9-86c8-d560b265ad40


## Backend Architecture and Workflow

## 1. Overview

This document provides a detailed description of the backend architecture for the AI Tutor platform. The backend is responsible for handling course creation, content generation, AI-powered chat interactions, and real-time communication for in-class experiences.

The backend is built using a modern Python technology stack:

-   **Web Framework:** Robyn (high-performance Python framework powered by Rust)
-   **Real-time Communication:** Native WebSockets
-   **AI/ML:** OpenAI (for chat), Google Gemini (for content generation)
-   **Data Storage:** Supabase Storage for file storage (course materials, conversation history) and Supabase's native pgvector extension for vector embeddings in Retrieval-Augmented Generation (RAG).
-   **Authentication:** Supabase Authentication

## 2. Architecture

The backend is designed with a modular architecture, with clear separation of concerns. The main components are:

-   **Robyn Application (`main.py`):** The main entry point of the backend. It initializes the Robyn app, configures CORS, registers API routers, and sets up WebSockets for real-time communication.
-   **API Endpoints (`robyn_routers/`):** This directory defines the RESTful API for the application. The endpoints are organized into routers based on functionality (e.g., `course`, `tutor_session`, `assistant`).
-   **Chat Logic (`chatbot.py`):** The `ChatBot` class encapsulates the logic for handling chat interactions. It works with the `S3ContextManager` to retrieve relevant context and interacts with the OpenAI API to generate responses.
-   **Content Generation (`course_content_generation/`):** This module is responsible for generating course content using Google's Gemini models. It can generate course outlines and detailed slide-by-slide content with accompanying speech.
-   **Data and Context Management (`s3_context_manager.py`, `utils/`):** These modules handle all interactions with AWS S3, including storing and retrieving files, managing course context for the RAG system, and handling user data.
-   **WebSocket Handler (`robyn_routers/websocket_router.py`):** Handles real-time WebSocket connections for course collaboration, slide synchronization, and live interactions.

The following diagram illustrates the typical workflow for an AI chat interaction:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant "Robyn Backend (main.py)"
    participant ChatBot
    participant S3ContextManager
    participant "Supabase Vector Store"
    participant "OpenAI API"
    participant "Supabase Storage (for history)"

    User->>+Frontend: Sends message
    Frontend->>+"Robyn Backend (main.py)": POST /api/get-ai-response
    "Robyn Backend (main.py)"->>+"Robyn Backend (main.py)": Authenticate user
    "Robyn Backend (main.py)"->>+ChatBot: Create instance
    ChatBot->>+S3ContextManager: Create instance for course
    S3ContextManager->>+"Supabase Vector Store": Query course embeddings
    "Supabase Vector Store"-->>-S3ContextManager: Returns relevant chunks
    ChatBot->>+ChatBot: process_message(input)
    ChatBot->>S3ContextManager: get_context(input)
    S3ContextManager-->>ChatBot: returns relevant documents
    ChatBot->>+"OpenAI API": Generate response with context
    "OpenAI API"-->>-ChatBot: Returns AI response
    ChatBot-->>-"Robyn Backend (main.py)": Returns response
    "Robyn Backend (main.py)"->>+"Supabase Storage (for history)": Save conversation history
    "Supabase Storage (for history)"-->>-"Robyn Backend (main.py)": Confirms save
    "Robyn Backend (main.py)"-->>-Frontend: Returns AI response
    Frontend-->>-User: Displays response
```

## 3. Core Workflows

### Course Creation & Content Generation

1.  **Upload Initial Documents:** The user uploads initial course materials (e.g., a syllabus, notes) through the frontend. The `upload_routes.py` endpoint on the backend receives these files and stores them in a dedicated folder for the course in Supabase Storage.
2.  **Generate Course Outline:** The frontend triggers the course outline generation. The backend's `course_generation_routes.py` calls the `gemini_course_outline_generator.py` module. This module uses the Google Gemini API to read the initial documents and generate a structured course outline in JSON format.
3.  **Generate Slides and Speech:** Once the outline is approved, the backend uses `gemini_slide_speech_generator.py` to generate the detailed content for each slide, including the text and a script for text-to-speech conversion.
4.  **Create Vector Index:** After the content is generated, the backend processes the text content of the slides. It chunks the text, generates embeddings (using an OpenAI model), and stores them in Supabase's native vector store using the pgvector extension. This vector store is crucial for the RAG system.

### Chat Interaction (Retrieval-Augmented Generation - RAG)

The chat functionality allows the AI to answer questions based on the specific content of a course.

1.  **Initialize Chatbot:** When a user starts a chat for a course, the frontend calls the `/api/initialize-chatbot` endpoint. The backend creates an instance of `S3ContextManager`, which loads course chunks and uses Supabase's vector store for semantic search.
2.  **User Sends Message:** The user types a message in the chat interface. The frontend sends this message to the `/api/get-ai-response` endpoint.
3.  **Retrieve Relevant Context:** The `ChatBot` instance receives the user's message. It uses the `S3ContextManager` to query Supabase's vector store. The query finds the most relevant chunks of text from the course materials based on semantic similarity using pgvector.
4.  **Generate Response:** The retrieved text chunks (the context) are prepended to the user's message and a system prompt, and this combined text is sent to the OpenAI API (e.g., `gpt-4`). This technique, known as Retrieval-Augmented Generation (RAG), allows the AI to provide answers that are grounded in the course content, reducing hallucinations and improving accuracy.
5.  **Save History and Return Response:** The AI's response is sent back to the user. The backend also saves the user's question and the AI's response in a JSON file (`course_history.json`) on S3 for future reference.

### Real-time Features

The backend uses native WebSockets to provide real-time functionality for the in-class experience.

-   **Rooms:** When a user joins a course, they join a specific "room" for that course's assistant ID. This allows the backend to send targeted messages to all users in a specific class.
-   **Slide Navigation:** When the instructor (or the AI) changes the slide, the backend broadcasts an `update_viewing_slide` event to all users in the room, ensuring that everyone's view is synchronized.
-   **Live Interaction:** The WebSocket connection can be used for other live interactions, such as polls, Q&A sessions, and real-time subtitles.

## 4. Data Management

-   **AWS S3:** S3 is the primary data store. Each user has a dedicated "folder" in the S3 bucket. Inside each user's folder, there are sub-folders for each course they have created. A typical course folder contains:
    -   `course_config.json`: Configuration for the course, including the system prompt for the AI.
    -   `course_history.json`: The chat history for the course.
    -   Vector embeddings stored in Supabase database using pgvector extension.
    -   The original uploaded documents.
    -   Generated course content (slides, etc.).
-   **Redis (`dump.rdb`):** The presence of `dump.rdb` suggests that Redis is used, likely for caching, session management, or as a message broker for Socket.IO, improving performance and scalability.

## 5. Authentication

User authentication is handled through Supabase.

1.  **Login on Frontend:** The user logs in on the frontend using Supabase Authentication.
2.  **Send Token to Backend:** For requests that require authentication, the frontend includes the user's Supabase JWT token in the `Authorization` header as `Bearer <token>`.
3.  **Verify Token on Backend:** The `robyn_routers/auth.py` module on the backend uses Supabase client to verify the JWT token. If the token is valid, user info is attached to the request. If not, it returns a 401 Unauthorized error.

This architecture provides a robust and scalable foundation for the AI Tutor platform, enabling advanced features like on-demand content generation, context-aware AI chat, and real-time collaborative learning experiences. 
