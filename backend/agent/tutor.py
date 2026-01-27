"""
Proactive Tutor Agent

Main agent class that drives tutoring sessions with adaptive pacing.
"""

import json
import logging
from datetime import datetime
from typing import Callable, Iterator, Optional

from llm import get_llm_provider
from models import (
    AssessmentDifficulty,
    AssessmentQuestion,
    AssessmentResponse,
    LLMConfig,
    LLMMessage,
    MessageRole,
    SessionContext,
    StudentLevel,
    TopicProgress,
    TutorEvent,
    TutorState,
)

from .machine import TutorStateMachine
from .prompts import get_system_prompt, get_transition_prompt

logger = logging.getLogger(__name__)


class ProactiveTutor:
    """
    Proactive tutoring agent that drives lessons.

    The tutor:
    - Initiates teaching without waiting for prompts
    - Adapts pace based on student responses
    - Suggests breaks at appropriate times
    - Handles interruptions gracefully
    """

    def __init__(
        self,
        context: SessionContext,
        on_state_change: Optional[Callable[[TutorState, TutorState], None]] = None,
    ):
        """
        Initialize the tutor agent.

        Args:
            context: Session context
            on_state_change: Optional callback for state changes
        """
        self.context = context
        self.machine = TutorStateMachine(context)
        self.llm = get_llm_provider()
        self.on_state_change = on_state_change

        # Assessment tracking
        self.current_assessment_index = 0
        self.consecutive_correct = 0
        self.consecutive_wrong = 0

    def start_session(self) -> Iterator[TutorEvent]:
        """
        Start a new tutoring session.

        Yields:
            TutorEvent objects for SSE streaming
        """
        logger.info(f"Starting session {self.context.session_id}")

        self.context.session_started_at = datetime.utcnow()
        self.context.last_activity_at = datetime.utcnow()
        self.context.current_phase_started_at = datetime.utcnow()

        # Transition to course setup
        yield TutorEvent("session_start", state=TutorState.IDLE)

        self._transition_to(TutorState.COURSE_SETUP)
        yield from self._process_current_state()

    def process_input(self, user_input: str) -> Iterator[TutorEvent]:
        """
        Process user input and generate appropriate responses.

        Args:
            user_input: The user's message

        Yields:
            TutorEvent objects for SSE streaming
        """
        self.context.add_message("user", user_input)
        self.context.last_activity_at = datetime.utcnow()

        # Detect input type
        input_type = self._classify_input(user_input)
        logger.info(f"Input classified as: {input_type}")

        yield TutorEvent("input_received", data={"input_type": input_type})

        if input_type == "question":
            # Handle student question
            self.context.pending_student_question = user_input
            if self.machine.is_teaching_state():
                self._transition_to(TutorState.ANSWERING_QUESTION)
                yield from self._process_current_state()
                # Return to previous state
                if self.context.previous_state and self.machine.is_teaching_state():
                    self._transition_to(self.context.previous_state)
            else:
                yield from self._answer_question(user_input)

        elif input_type == "confusion":
            # Handle confusion
            self.context.pending_student_question = user_input
            self._transition_to(TutorState.HANDLING_CONFUSION)
            yield from self._process_current_state()

        elif input_type == "assessment_answer":
            # Handle assessment response
            yield from self._process_assessment_answer(user_input)

        elif input_type == "practice_answer":
            # Handle practice problem response
            yield from self._process_practice_answer(user_input)

        elif input_type == "continue" or input_type == "ready":
            # Continue to next step
            yield from self._continue_lesson()

        elif input_type == "end_session":
            # End the session
            self.context.student_requested_end = True
            self._transition_to(TutorState.SESSION_COMPLETE)
            yield from self._process_current_state()

        elif input_type == "take_break":
            # Take a break
            self.context.record_break()
            self._transition_to(TutorState.SESSION_PAUSED)
            yield TutorEvent(
                "session_paused",
                content="Session paused. Take your time! I'll be here when you're ready.",
                state=TutorState.SESSION_PAUSED,
            )

        elif input_type == "resume":
            # Resume from pause
            self._transition_to(TutorState.LESSON_INTRODUCTION)
            yield from self._process_current_state()

        else:
            # Default: process as conversation
            yield from self._process_conversation(user_input)

    def _classify_input(self, user_input: str) -> str:
        """Classify the type of user input."""
        lower = user_input.lower().strip()

        # Direct commands
        if any(word in lower for word in ["quit", "exit", "end", "stop", "bye"]):
            return "end_session"

        if any(word in lower for word in ["break", "pause", "rest"]):
            return "take_break"

        if any(word in lower for word in ["resume", "continue", "back", "ready"]):
            if self.context.is_paused:
                return "resume"
            return "continue"

        if lower in ["yes", "yeah", "yep", "ok", "okay", "sure", "next", "go on", "ready"]:
            return "ready"

        # Assessment state
        if self.context.current_state == TutorState.INITIAL_ASSESSMENT:
            return "assessment_answer"

        # Practice state
        if self.context.current_state == TutorState.GUIDED_PRACTICE:
            return "practice_answer"

        # Question detection
        if "?" in user_input or any(
            lower.startswith(word)
            for word in [
                "what",
                "why",
                "how",
                "when",
                "where",
                "can",
                "could",
                "would",
                "is",
                "are",
                "do",
                "does",
            ]
        ):
            return "question"

        # Confusion indicators
        if any(
            word in lower
            for word in [
                "confused",
                "don't understand",
                "don't get",
                "lost",
                "unclear",
                "huh",
                "what do you mean",
            ]
        ):
            return "confusion"

        return "conversation"

    def _transition_to(self, state: TutorState):
        """Transition to a new state."""
        old_state = self.context.current_state

        if self.machine.transition_to(state):
            if self.on_state_change:
                self.on_state_change(old_state, state)
            logger.info(f"Transitioned: {old_state} -> {state}")

    def _process_current_state(self) -> Iterator[TutorEvent]:
        """Process the current state and generate output."""
        state = self.context.current_state

        yield TutorEvent("state_change", state=state)

        if state == TutorState.COURSE_SETUP:
            yield from self._do_course_setup()

        elif state == TutorState.INITIAL_ASSESSMENT:
            yield from self._do_initial_assessment()

        elif state == TutorState.ASSESSMENT_REVIEW:
            yield from self._do_assessment_review()

        elif state == TutorState.LESSON_INTRODUCTION:
            yield from self._do_lesson_introduction()

        elif state == TutorState.CONCEPT_EXPLANATION:
            yield from self._do_concept_explanation()

        elif state == TutorState.EXAMPLE_DEMONSTRATION:
            yield from self._do_example_demonstration()

        elif state == TutorState.GUIDED_PRACTICE:
            yield from self._do_guided_practice()

        elif state == TutorState.CHECK_UNDERSTANDING:
            yield from self._do_check_understanding()

        elif state == TutorState.TOPIC_SUMMARY:
            yield from self._do_topic_summary()

        elif state == TutorState.ANSWERING_QUESTION:
            yield from self._do_answer_question()

        elif state == TutorState.HANDLING_CONFUSION:
            yield from self._do_handle_confusion()

        elif state == TutorState.BREAK_SUGGESTION:
            yield from self._do_break_suggestion()

        elif state == TutorState.LESSON_COMPLETE:
            yield from self._do_lesson_complete()

        elif state == TutorState.SESSION_COMPLETE:
            yield from self._do_session_complete()

    def _generate_response(self, additional_context: str = "") -> str:
        """Generate a response using the LLM."""
        system_prompt = get_system_prompt(self.context.current_state, self.context)

        messages = [
            LLMMessage(role=MessageRole.SYSTEM, content=system_prompt),
        ]

        # Add recent conversation history
        for msg in self.context.get_recent_history(8):
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))

        if additional_context:
            messages.append(LLMMessage(role=MessageRole.USER, content=additional_context))

        config = LLMConfig(temperature=0.8, max_tokens=1000)
        response = self.llm.complete(messages, config)

        return response.content

    def _stream_response(self, additional_context: str = "") -> Iterator[str]:
        """Stream a response using the LLM."""
        system_prompt = get_system_prompt(self.context.current_state, self.context)

        messages = [
            LLMMessage(role=MessageRole.SYSTEM, content=system_prompt),
        ]

        for msg in self.context.get_recent_history(8):
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))

        if additional_context:
            messages.append(LLMMessage(role=MessageRole.USER, content=additional_context))

        config = LLMConfig(temperature=0.8, max_tokens=1000)

        for chunk in self.llm.stream(messages, config):
            if chunk.content:
                yield chunk.content

    # State handlers
    def _do_course_setup(self) -> Iterator[TutorEvent]:
        """Handle course setup state."""
        response = self._generate_response("Welcome the student and introduce the lesson.")
        self.context.add_message("assistant", response)

        yield TutorEvent("agent_speak", content=response, state=TutorState.COURSE_SETUP)

        # Auto-transition to assessment
        self._transition_to(TutorState.INITIAL_ASSESSMENT)
        yield from self._process_current_state()

    def _do_initial_assessment(self) -> Iterator[TutorEvent]:
        """Handle initial assessment state."""
        # Generate assessment questions
        response = self._generate_response()

        try:
            # Try to parse questions from response
            questions_data = self._parse_assessment_questions(response)
            self.context.assessment_questions = questions_data
            self.current_assessment_index = 0

            # Present first question
            if self.context.assessment_questions:
                yield from self._present_assessment_question(0)
        except Exception as e:
            logger.error(f"Failed to generate assessment: {e}")
            # Skip assessment and go to lesson
            self._transition_to(TutorState.LESSON_INTRODUCTION)
            yield from self._process_current_state()

    def _parse_assessment_questions(self, response: str) -> list[AssessmentQuestion]:
        """Parse assessment questions from LLM response."""
        # Try to extract JSON
        import re

        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            try:
                data = json.loads(json_match.group())
                questions = []

                for q in data.get("questions", []):
                    questions.append(
                        AssessmentQuestion(
                            question_text=q.get("question", ""),
                            question_type=q.get("type", "mcq"),
                            options=q.get("options", []),
                            correct_answer=q.get("correct", ""),
                            difficulty=AssessmentDifficulty(q.get("difficulty", "medium")),
                            explanation=q.get("explanation", ""),
                        )
                    )

                return questions
            except (json.JSONDecodeError, KeyError):
                pass

        return []

    def _present_assessment_question(self, index: int) -> Iterator[TutorEvent]:
        """Present an assessment question."""
        if index >= len(self.context.assessment_questions):
            return

        question = self.context.assessment_questions[index]

        content = f"**Question {index + 1}:** {question.question_text}\n\n"
        if question.options:
            content += "\n".join(question.options)

        self.context.add_message("assistant", content)

        yield TutorEvent(
            "ask_question",
            content=content,
            data={
                "question_index": index,
                "question_type": question.question_type,
                "options": question.options,
                "total_questions": len(self.context.assessment_questions),
            },
            state=TutorState.INITIAL_ASSESSMENT,
        )

    def _process_assessment_answer(self, answer: str) -> Iterator[TutorEvent]:
        """Process an assessment answer."""
        if self.current_assessment_index >= len(self.context.assessment_questions):
            yield from self._continue_lesson()
            return

        question = self.context.assessment_questions[self.current_assessment_index]

        # Determine if correct
        is_correct = self._check_answer(answer, question)

        # Record response
        self.context.assessment_responses.append(
            AssessmentResponse(
                question_index=self.current_assessment_index,
                question_text=question.question_text,
                question_type=question.question_type,
                student_answer=answer,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                difficulty=question.difficulty,
            )
        )

        # Provide feedback
        if is_correct:
            feedback = "Correct!"
            self.consecutive_correct += 1
            self.consecutive_wrong = 0
        else:
            feedback = f"Not quite. The answer is {question.correct_answer}."
            if question.explanation:
                feedback += f" {question.explanation}"
            self.consecutive_correct = 0
            self.consecutive_wrong += 1

        yield TutorEvent(
            "assessment_feedback",
            content=feedback,
            data={"is_correct": is_correct},
        )

        # Move to next question or finish
        self.current_assessment_index += 1

        if self.current_assessment_index < len(self.context.assessment_questions):
            yield from self._present_assessment_question(self.current_assessment_index)
        else:
            # Calculate score and determine level
            self._calculate_student_level()
            self._transition_to(TutorState.ASSESSMENT_REVIEW)
            yield from self._process_current_state()

    def _check_answer(self, answer: str, question: AssessmentQuestion) -> bool:
        """Check if an answer is correct."""
        answer = answer.strip().upper()
        correct = question.correct_answer.strip().upper()

        # For MCQ, check first letter
        if question.question_type == "mcq":
            return answer.startswith(correct) or answer == correct

        # For true/false
        if question.question_type == "true_false":
            answer_bool = answer in ["TRUE", "T", "YES", "Y"]
            correct_bool = correct in ["TRUE", "T", "YES", "Y"]
            return answer_bool == correct_bool

        # For short answer, use fuzzy matching
        return answer.lower() == correct.lower()

    def _calculate_student_level(self):
        """Calculate student level from assessment responses."""
        if not self.context.assessment_responses:
            return

        correct = sum(1 for r in self.context.assessment_responses if r.is_correct)
        total = len(self.context.assessment_responses)
        score = correct / total if total > 0 else 0

        self.context.assessment_score = score * 100

        if score >= 0.8:
            self.context.student_level = StudentLevel.ADVANCED
        elif score >= 0.5:
            self.context.student_level = StudentLevel.INTERMEDIATE
        else:
            self.context.student_level = StudentLevel.BEGINNER

    def _do_assessment_review(self) -> Iterator[TutorEvent]:
        """Handle assessment review state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "agent_speak",
            content=response,
            data={
                "student_level": self.context.student_level.value,
                "assessment_score": self.context.assessment_score,
            },
            state=TutorState.ASSESSMENT_REVIEW,
        )

        # Advance to first topic
        self.context.advance_to_next_topic()
        self._transition_to(TutorState.LESSON_INTRODUCTION)
        yield from self._process_current_state()

    def _do_lesson_introduction(self) -> Iterator[TutorEvent]:
        """Handle lesson introduction state."""
        current_topic = self.context.get_current_topic()

        if not current_topic:
            self._transition_to(TutorState.LESSON_COMPLETE)
            yield from self._process_current_state()
            return

        # Start tracking this topic
        self.context.topic_progress.append(
            TopicProgress(
                topic_index=len(self.context.topic_progress),
                topic_title=current_topic["subtopic"]["title"],
                started_at=datetime.utcnow(),
            )
        )

        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "agent_speak",
            content=response,
            data={
                "topic": current_topic["subtopic"]["title"],
                "section": current_topic["section"]["title"],
            },
            state=TutorState.LESSON_INTRODUCTION,
        )

        # Auto-transition to concept explanation
        self._transition_to(TutorState.CONCEPT_EXPLANATION)
        yield from self._process_current_state()

    def _do_concept_explanation(self) -> Iterator[TutorEvent]:
        """Handle concept explanation state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        current_topic = self.context.get_current_topic()
        if current_topic:
            self.context.concepts_covered.append(current_topic["subtopic"]["title"])

        yield TutorEvent("agent_speak", content=response, state=TutorState.CONCEPT_EXPLANATION)

        # Transition prompt
        transition = get_transition_prompt(
            TutorState.CONCEPT_EXPLANATION, TutorState.EXAMPLE_DEMONSTRATION
        )
        if transition:
            yield TutorEvent("transition", content=transition)

        self._transition_to(TutorState.EXAMPLE_DEMONSTRATION)
        yield from self._process_current_state()

    def _do_example_demonstration(self) -> Iterator[TutorEvent]:
        """Handle example demonstration state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        # Update progress
        if self.context.topic_progress:
            self.context.topic_progress[-1].examples_shown += 1

        yield TutorEvent("agent_speak", content=response, state=TutorState.EXAMPLE_DEMONSTRATION)

        # Transition to practice
        transition = get_transition_prompt(
            TutorState.EXAMPLE_DEMONSTRATION, TutorState.GUIDED_PRACTICE
        )
        if transition:
            yield TutorEvent("transition", content=transition)

        self._transition_to(TutorState.GUIDED_PRACTICE)
        yield from self._process_current_state()

    def _do_guided_practice(self) -> Iterator[TutorEvent]:
        """Handle guided practice state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "ask_question",
            content=response,
            data={"type": "practice"},
            state=TutorState.GUIDED_PRACTICE,
        )

    def _process_practice_answer(self, answer: str) -> Iterator[TutorEvent]:
        """Process a practice problem answer."""
        # Use LLM to evaluate
        eval_prompt = f"""The student answered: "{answer}"

Evaluate their response:
1. Is it correct or on the right track?
2. If correct, provide brief positive feedback
3. If incorrect, provide a hint or gentle correction
4. Keep response brief (1-2 sentences)"""

        response = self._generate_response(eval_prompt)
        self.context.add_message("assistant", response)

        # Update progress
        if self.context.topic_progress:
            self.context.topic_progress[-1].practice_problems_attempted += 1
            if "correct" in response.lower() or "right" in response.lower():
                self.context.topic_progress[-1].practice_problems_correct += 1

        yield TutorEvent("agent_speak", content=response)

        # Move to understanding check
        self._transition_to(TutorState.CHECK_UNDERSTANDING)
        yield from self._process_current_state()

    def _do_check_understanding(self) -> Iterator[TutorEvent]:
        """Handle understanding check state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "ask_question",
            content=response,
            data={"type": "understanding_check"},
            state=TutorState.CHECK_UNDERSTANDING,
        )

    def _do_topic_summary(self) -> Iterator[TutorEvent]:
        """Handle topic summary state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        # Mark topic as complete
        if self.context.topic_progress:
            self.context.topic_progress[-1].completed_at = datetime.utcnow()

        yield TutorEvent("agent_speak", content=response, state=TutorState.TOPIC_SUMMARY)

        # Update time tracking
        self.context.update_time_tracking()

        # Determine next state
        if self.context.is_lesson_complete():
            self._transition_to(TutorState.LESSON_COMPLETE)
        elif self.context.should_suggest_break():
            self._transition_to(TutorState.BREAK_SUGGESTION)
        else:
            # Advance to next topic
            self.context.advance_to_next_topic()
            self._transition_to(TutorState.LESSON_INTRODUCTION)

        yield from self._process_current_state()

    def _do_answer_question(self) -> Iterator[TutorEvent]:
        """Handle answering a student question."""
        response = self._generate_response()
        self.context.add_message("assistant", response)
        self.context.pending_student_question = None

        yield TutorEvent("agent_speak", content=response, state=TutorState.ANSWERING_QUESTION)

    def _do_handle_confusion(self) -> Iterator[TutorEvent]:
        """Handle student confusion."""
        response = self._generate_response()
        self.context.add_message("assistant", response)
        self.context.pending_student_question = None

        yield TutorEvent("agent_speak", content=response, state=TutorState.HANDLING_CONFUSION)

    def _do_break_suggestion(self) -> Iterator[TutorEvent]:
        """Handle break suggestion state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "suggest_break",
            content=response,
            data={"time_elapsed_minutes": self.context.total_time_spent_minutes},
            state=TutorState.BREAK_SUGGESTION,
        )

    def _do_lesson_complete(self) -> Iterator[TutorEvent]:
        """Handle lesson complete state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "lesson_complete",
            content=response,
            data={
                "topics_covered": len(self.context.topic_progress),
                "time_spent": self.context.total_time_spent_minutes,
            },
            state=TutorState.LESSON_COMPLETE,
        )

        self._transition_to(TutorState.SESSION_COMPLETE)
        yield from self._process_current_state()

    def _do_session_complete(self) -> Iterator[TutorEvent]:
        """Handle session complete state."""
        response = self._generate_response()
        self.context.add_message("assistant", response)

        yield TutorEvent(
            "session_complete",
            content=response,
            data={
                "final_summary": {
                    "topics_covered": len(self.context.topic_progress),
                    "concepts_learned": self.context.concepts_covered,
                    "assessment_score": self.context.assessment_score,
                    "time_spent_minutes": self.context.total_time_spent_minutes,
                    "student_level": self.context.student_level.value,
                }
            },
            state=TutorState.SESSION_COMPLETE,
        )

    def _continue_lesson(self) -> Iterator[TutorEvent]:
        """Continue to the next appropriate state."""
        next_state = self.machine.get_next_auto_state()

        if next_state:
            self._transition_to(next_state)
            yield from self._process_current_state()
        else:
            yield TutorEvent(
                "agent_speak",
                content="Let's continue with our lesson.",
            )

    def _answer_question(self, question: str) -> Iterator[TutorEvent]:
        """Answer a direct question outside of teaching flow."""
        self.context.pending_student_question = question
        response = self._generate_response(f"Answer this question: {question}")
        self.context.add_message("assistant", response)

        yield TutorEvent("agent_speak", content=response)

    def _process_conversation(self, user_input: str) -> Iterator[TutorEvent]:
        """Process general conversation input."""
        response = self._generate_response(user_input)
        self.context.add_message("assistant", response)

        yield TutorEvent("agent_speak", content=response)
