"""Assistant and chatbot routes for Robyn."""

import logging
import os
import time
from datetime import datetime

import requests
from robyn import SubRouter, Request

from .auth import get_auth_handler, require_auth
from chatbot import ChatBot
from s3_context_manager import ContextManager as S3ContextManager
import utils.s3_utils as s3_utils

router = SubRouter(__file__, prefix="/api")
logger = logging.getLogger(__name__)

# Add authentication to all routes
router.configure_authentication(get_auth_handler())

API_KEY = os.getenv("OPENAI_API_KEY")
s3_bucket = "anantra-lms-store"


def process_course_context_s3(bucket, username, course_title, api_key):
    """Process course context from S3."""
    from utils.load_and_process_index import process_course_context_s3 as _process
    return _process(bucket, username, course_title, api_key)


@router.post("/initialize-chatbot", auth_required=True)
async def initialize_chatbot(request: Request):
    """Initialize chatbot for a course."""
    try:
        user = require_auth(request)
        username = user["email"]

        body = request.json()
        course_title = body.get("course_title")

        # Create a new context manager instance
        new_context_manager = S3ContextManager(
            api_key=API_KEY, user=username, course_title=course_title
        )

        # Try to load saved indices for the course
        if new_context_manager.load_saved_indices():
            logger.info(f"Successfully loaded saved indices for course: {course_title}")
        else:
            logger.info(f"No saved indices found for course: {course_title}")
            process_course_context_s3(
                new_context_manager.s3_bucket, username, course_title, API_KEY
            )

        # Load the course configuration to get the system prompt
        try:
            config_json = s3_utils.get_json_from_s3(
                new_context_manager.s3_bucket,
                s3_utils.get_s3_file_path(username, course_title, "course_config.json"),
            )
            system_prompt = config_json.get("system_prompt")
            if not system_prompt:
                raise ValueError("No system prompt found in course configuration")
        except Exception as e:
            logger.error(f"Error loading course configuration: {str(e)}")
            return {"detail": "Failed to load course configuration"}, 500, {}

        # Create chatbot instance for this session
        chatbot = ChatBot(context_manager=new_context_manager, api_key=API_KEY)
        chatbot.update_system_prompt(system_prompt)

        return {
            "message": "Chatbot initialized successfully",
            "course": course_title,
            "system_prompt": system_prompt,
        }

    except Exception as e:
        logger.error(f"Error initializing chatbot: {str(e)}")
        return {"detail": str(e)}, 500, {}


@router.post("/get-ai-response", auth_required=True)
async def get_ai_response(request: Request):
    """Get AI response from chatbot."""
    try:
        user = require_auth(request)
        username = user["email"]

        body = request.json()
        user_input = body.get("input", "")
        course_title = body.get("course_title")

        if not course_title:
            return {"detail": "course_title required in request"}, 400, {}

        start = time.time()

        # Get chatbot from session (or recreate from course data)
        chatbot = ChatBot(
            context_manager=S3ContextManager(
                user=username, course_title=course_title, api_key=API_KEY
            )
        )

        response = chatbot.process_message(user_input)

        logger.info(f"AI response time: {time.time() - start:.2f}s")

        history_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input,
            "ai_response": response,
        }

        start = time.time()

        try:
            # Get the course path from the course title
            history_s3_key = s3_utils.get_s3_file_path(
                username, course_title, "course_history.json"
            )

            # Load existing history or create new
            history = s3_utils.get_json_from_s3(s3_bucket, history_s3_key)
            if history is None:
                logger.info("No existing conversation history found")
                history = {"conversations": []}

            # Append new conversation
            history["conversations"].append(history_entry)

            # Save updated history to S3
            s3_utils.upload_json_to_s3(history, s3_bucket, history_s3_key)
            logger.info(f"Conversation history updated successfully at {history_s3_key}")

            logger.info(f"History saving time: {time.time() - start:.2f}s")
            return response

        except Exception as e:
            logger.error(f"Error saving conversation history: {str(e)}")
            # Still return the response even if saving history fails
            return response

    except Exception as e:
        logger.error(f"Error getting AI response: {str(e)}")
        return {"detail": str(e)}, 500, {}


@router.post("/help-center/chat", auth_required=True)
async def help_center_chat(request: Request):
    """Handle Help Center chat requests with AI-powered responses."""
    try:
        user = require_auth(request)
        username = user["email"]

        body = request.json()
        user_message = body.get("message", "")

        if not user_message:
            return {"detail": "Message is required"}, 400, {}

        # Get conversation history for context (limited to last 5 messages)
        history = body.get("history", [])[-5:] if body.get("history") else []

        # Build conversation messages
        messages = [
            {
                "role": "system",
                "content": """You are a helpful AI assistant for Tutorion, an AI-powered learning management system.
You help users with questions about:
- Creating and managing courses
- Understanding learning paths and progress tracking
- Using the AI tutor features for personalized learning
- Technical support and troubleshooting
- Account and settings management

Be friendly, concise, and helpful. If you don't know something specific about Tutorion's features,
provide general guidance and suggest the user contact support for detailed help.
Keep responses under 150 words unless the question requires a detailed explanation.""",
            }
        ]

        # Add conversation history
        for msg in history:
            role = "user" if msg.get("type") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Use OpenRouter API (primary LLM provider)
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7,
                },
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
        else:
            # Fallback: Use OpenAI directly if available
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                from openai import OpenAI

                client = OpenAI(api_key=openai_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    max_tokens=500,
                    temperature=0.7,
                )
                ai_response = response.choices[0].message.content
            else:
                return {"detail": "No AI provider configured"}, 500, {}

        return {"response": ai_response}

    except requests.exceptions.Timeout:
        return {"detail": "Request timed out. Please try again."}, 504, {}
    except Exception as e:
        logger.error(f"Help center chat error: {str(e)}")
        return {"detail": "Failed to generate response. Please try again."}, 500, {}
