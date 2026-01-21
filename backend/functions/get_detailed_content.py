import os

import utils.s3_utils as s3_utils
from dotenv import load_dotenv
from s3_context_manager import ContextManager as S3ContextManager

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")

s3_bucket = "anantra-lms-store"


def get_detailed_content(course_title, user, user_query):
    s3_context_manager = S3ContextManager(user, course_title, api_key=API_KEY)
    s3_context_manager.load_saved_indices()
    return s3_context_manager.get_relevant_chunks(user_query)
