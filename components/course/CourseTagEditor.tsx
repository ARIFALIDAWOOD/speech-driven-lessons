"use client";

/**
 * CourseTagEditor Component
 *
 * Allows users to tag their uploaded courses with B/S/C/T curriculum hierarchy
 * so the course materials can be used in tutor sessions.
 */

import { useState, useEffect, useCallback } from "react";
import { Save, Tag, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectionStep } from "@/components/curriculum-selection/SelectionStep";
import {
  SelectionOption,
  EDUCATION_BOARDS,
  SUBJECTS,
} from "@/components/curriculum-selection/types";

interface CourseTagData {
  board_id?: string;
  subject_id?: string;
  chapter_id?: string;
  curriculum_topic?: string;
  board_name?: string;
  subject_name?: string;
  chapter_name?: string;
}

interface CourseTagEditorProps {
  courseId: string;
  initialData?: CourseTagData;
  accessToken: string;
  onSave?: (data: CourseTagData) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

// Mock chapters based on subject (reusing from HierarchicalSelector)
async function fetchChapters(boardId: string, subjectId: string): Promise<SelectionOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const chaptersBySubject: Record<string, SelectionOption[]> = {
    MATH: [
      { id: "CH1", name: "Real Numbers", description: "Properties and operations" },
      { id: "CH2", name: "Polynomials", description: "Algebraic expressions" },
      { id: "CH3", name: "Linear Equations", description: "Two variables" },
      { id: "CH4", name: "Quadratic Equations", description: "Solutions and roots" },
      { id: "CH5", name: "Arithmetic Progressions", description: "Sequences and series" },
      { id: "CH6", name: "Triangles", description: "Properties and theorems" },
      { id: "CH7", name: "Coordinate Geometry", description: "Points and lines" },
      { id: "CH8", name: "Trigonometry", description: "Ratios and identities" },
    ],
    PHY: [
      { id: "CH1", name: "Light - Reflection", description: "Mirrors and images" },
      { id: "CH2", name: "Light - Refraction", description: "Lenses and prisms" },
      { id: "CH3", name: "Electricity", description: "Current and circuits" },
      { id: "CH4", name: "Magnetic Effects", description: "Electromagnets" },
      { id: "CH5", name: "Sources of Energy", description: "Conventional and non-conventional" },
    ],
    CHEM: [
      { id: "CH1", name: "Chemical Reactions", description: "Types and equations" },
      { id: "CH2", name: "Acids and Bases", description: "pH and salts" },
      { id: "CH3", name: "Metals and Non-metals", description: "Properties and reactions" },
      { id: "CH4", name: "Carbon Compounds", description: "Organic chemistry basics" },
      { id: "CH5", name: "Periodic Classification", description: "Elements and trends" },
    ],
    BIO: [
      { id: "CH1", name: "Life Processes", description: "Nutrition, respiration" },
      { id: "CH2", name: "Control and Coordination", description: "Nervous system" },
      { id: "CH3", name: "Reproduction", description: "Plants and animals" },
      { id: "CH4", name: "Heredity and Evolution", description: "Genetics" },
      { id: "CH5", name: "Our Environment", description: "Ecosystem" },
    ],
    ENG: [
      { id: "CH1", name: "Reading Comprehension", description: "Understanding texts" },
      { id: "CH2", name: "Grammar", description: "Rules and usage" },
      { id: "CH3", name: "Writing Skills", description: "Essays and letters" },
      { id: "CH4", name: "Literature", description: "Prose and poetry" },
    ],
    HIST: [
      { id: "CH1", name: "Rise of Nationalism", description: "India and Europe" },
      { id: "CH2", name: "Industrialization", description: "Age of industry" },
      { id: "CH3", name: "Print Culture", description: "Modern world" },
      { id: "CH4", name: "Novels and Society", description: "History and literature" },
    ],
    GEO: [
      { id: "CH1", name: "Resources and Development", description: "Types and conservation" },
      { id: "CH2", name: "Water Resources", description: "Management and dams" },
      { id: "CH3", name: "Agriculture", description: "Types and patterns" },
      { id: "CH4", name: "Minerals and Energy", description: "Distribution" },
      { id: "CH5", name: "Manufacturing Industries", description: "Industrial regions" },
    ],
    CS: [
      { id: "CH1", name: "Computer Fundamentals", description: "Hardware and software" },
      { id: "CH2", name: "Programming Basics", description: "Logic and algorithms" },
      { id: "CH3", name: "Data Structures", description: "Arrays and lists" },
      { id: "CH4", name: "Internet and Web", description: "Networks and protocols" },
    ],
  };

  return chaptersBySubject[subjectId] || [];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CourseTagEditor({
  courseId,
  initialData,
  accessToken,
  onSave,
  onError,
  compact = false,
}: CourseTagEditorProps) {
  // Selection state
  const [board, setBoard] = useState<SelectionOption | null>(null);
  const [subject, setSubject] = useState<SelectionOption | null>(null);
  const [chapter, setChapter] = useState<SelectionOption | null>(null);
  const [topic, setTopic] = useState<string>("");

  // UI state
  const [chapters, setChapters] = useState<SelectionOption[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize from initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.board_id) {
        const foundBoard = EDUCATION_BOARDS.find((b) => b.id === initialData.board_id);
        if (foundBoard) setBoard(foundBoard);
      }
      if (initialData.subject_id) {
        const foundSubject = SUBJECTS.find((s) => s.id === initialData.subject_id);
        if (foundSubject) setSubject(foundSubject);
      }
      setTopic(initialData.curriculum_topic || "");
    }
  }, [initialData]);

  // Load chapters from initial data after chapters are fetched
  useEffect(() => {
    if (initialData?.chapter_id && chapters.length > 0) {
      const foundChapter = chapters.find((c) => c.id === initialData.chapter_id);
      if (foundChapter) setChapter(foundChapter);
    }
  }, [initialData?.chapter_id, chapters]);

  // Fetch chapters when board and subject change
  useEffect(() => {
    if (board && subject) {
      setIsLoadingChapters(true);
      fetchChapters(board.id, subject.id)
        .then(setChapters)
        .finally(() => setIsLoadingChapters(false));
    } else {
      setChapters([]);
      setChapter(null);
    }
  }, [board, subject]);

  // Handle selection changes
  const handleBoardChange = useCallback((value: SelectionOption | null) => {
    setBoard(value);
    setSubject(null);
    setChapter(null);
    setSaveStatus("idle");
  }, []);

  const handleSubjectChange = useCallback((value: SelectionOption | null) => {
    setSubject(value);
    setChapter(null);
    setSaveStatus("idle");
  }, []);

  const handleChapterChange = useCallback((value: SelectionOption | null) => {
    setChapter(value);
    setSaveStatus("idle");
  }, []);

  const handleTopicChange = useCallback((value: string) => {
    setTopic(value);
    setSaveStatus("idle");
  }, []);

  // Save tags to API
  const handleSave = useCallback(async () => {
    if (!board) {
      setErrorMessage("Please select a board");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    const tagData: CourseTagData = {
      board_id: board.id,
      board_name: board.name,
      subject_id: subject?.id,
      subject_name: subject?.name,
      chapter_id: chapter?.id,
      chapter_name: chapter?.name,
      curriculum_topic: topic || undefined,
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/course/tags/${courseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(tagData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save tags");
      }

      setSaveStatus("saved");
      onSave?.(tagData);

      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setErrorMessage(message);
      setSaveStatus("error");
      onError?.(message);
    }
  }, [courseId, accessToken, board, subject, chapter, topic, onSave, onError]);

  // Check if there are any changes to save
  const hasChanges = board !== null;

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Tag className="h-4 w-4" />
          Curriculum Tags
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SelectionStep
            label="Board"
            placeholder="Select..."
            options={EDUCATION_BOARDS}
            value={board}
            onChange={handleBoardChange}
            compact
          />
          <SelectionStep
            label="Subject"
            placeholder="Select..."
            options={SUBJECTS}
            value={subject}
            onChange={handleSubjectChange}
            disabled={!board}
            compact
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SelectionStep
            label="Chapter"
            placeholder="Select..."
            options={chapters}
            value={chapter}
            onChange={handleChapterChange}
            disabled={!subject}
            isLoading={isLoadingChapters}
            compact
          />
          <div>
            <Label className="text-xs">Topic (optional)</Label>
            <Input
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              placeholder="Specific topic..."
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveStatus === "saving"}
          size="sm"
          className="w-full"
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Saving...
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Save Tags
            </>
          )}
        </Button>

        {errorMessage && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-blue-600" />
          Curriculum Tags
        </CardTitle>
        <CardDescription>
          Link this course to your curriculum so materials can be used in tutoring sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectionStep
            label="Education Board"
            placeholder="Select board..."
            description="CBSE, ICSE, State Board, etc."
            options={EDUCATION_BOARDS}
            value={board}
            onChange={handleBoardChange}
          />
          <SelectionStep
            label="Subject"
            placeholder="Select subject..."
            description="Choose the subject"
            options={SUBJECTS}
            value={subject}
            onChange={handleSubjectChange}
            disabled={!board}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectionStep
            label="Chapter"
            placeholder="Select chapter..."
            description="Choose the chapter"
            options={chapters}
            value={chapter}
            onChange={handleChapterChange}
            disabled={!subject}
            isLoading={isLoadingChapters}
          />
          <div className="space-y-2">
            <Label>Topic (optional)</Label>
            <Input
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              placeholder="Enter a specific topic within the chapter..."
            />
            <p className="text-xs text-muted-foreground">
              Narrow down to a specific topic for more relevant materials
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Tags
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
