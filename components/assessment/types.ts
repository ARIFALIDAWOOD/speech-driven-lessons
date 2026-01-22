/**
 * Types for the adaptive assessment system
 */

export type QuestionType = "mcq" | "true_false" | "short_answer";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface AssessmentQuestion {
  questionIndex: number;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  difficulty: DifficultyLevel;
  timeLimit?: number; // Optional time limit in seconds
}

export interface AssessmentAnswer {
  questionIndex: number;
  answer: string;
  timeSpent?: number; // Time spent on question in seconds
}

export interface AssessmentFeedback {
  questionIndex: number;
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
}

export interface AssessmentResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number; // Percentage
  studentLevel: "beginner" | "intermediate" | "advanced";
  timeSpent: number; // Total time in seconds
  feedback: string;
}

export interface AssessmentState {
  currentQuestionIndex: number;
  totalQuestions: number;
  answers: AssessmentAnswer[];
  isComplete: boolean;
  result?: AssessmentResult;
}
