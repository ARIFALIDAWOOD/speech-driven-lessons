"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, BookOpen, Loader2, PenLine, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectionStep } from "./SelectionStep";
import { SelectionBreadcrumb } from "./SelectionBreadcrumb";
import { TopicSpecification } from "./TopicSpecification";
import { CustomCourseInput } from "./CustomCourseInput";
import {
  CurriculumSelection,
  SelectionOption,
  SELECTION_STEPS,
  INITIAL_STATES,
  EDUCATION_BOARDS,
  SUBJECTS,
} from "./types";

interface HierarchicalSelectorProps {
  onStartLearning: (selection: CurriculumSelection) => void;
  isStarting?: boolean;
}

// Mock API functions - replace with actual API calls
async function fetchCities(stateId: string): Promise<SelectionOption[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const citiesByState: Record<string, SelectionOption[]> = {
    MH: [
      { id: "MUM", name: "Mumbai", description: "Financial capital" },
      { id: "PUN", name: "Pune", description: "Education hub" },
      { id: "NAG", name: "Nagpur", description: "Orange city" },
    ],
    KA: [
      { id: "BLR", name: "Bangalore", description: "Silicon Valley of India" },
      { id: "MYS", name: "Mysore", description: "City of palaces" },
    ],
    DL: [
      { id: "NDL", name: "New Delhi", description: "Capital city" },
    ],
    TN: [
      { id: "CHN", name: "Chennai", description: "Detroit of India" },
      { id: "CBE", name: "Coimbatore", description: "Manchester of South India" },
    ],
    UP: [
      { id: "LKO", name: "Lucknow", description: "City of Nawabs" },
      { id: "AGR", name: "Agra", description: "City of Taj" },
    ],
    GJ: [
      { id: "AMD", name: "Ahmedabad", description: "Manchester of India" },
      { id: "SRT", name: "Surat", description: "Diamond city" },
    ],
    WB: [
      { id: "KOL", name: "Kolkata", description: "City of Joy" },
    ],
    RJ: [
      { id: "JAI", name: "Jaipur", description: "Pink city" },
      { id: "JDH", name: "Jodhpur", description: "Blue city" },
    ],
    AP: [
      { id: "HYD", name: "Hyderabad", description: "City of pearls" },
      { id: "VIJ", name: "Vijayawada", description: "Business hub" },
    ],
    KL: [
      { id: "TVM", name: "Thiruvananthapuram", description: "Capital city" },
      { id: "KOC", name: "Kochi", description: "Queen of Arabian Sea" },
    ],
  };

  return citiesByState[stateId] || [];
}

async function fetchChapters(boardId: string, subjectId: string): Promise<SelectionOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock chapters based on subject
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

export function HierarchicalSelector({
  onStartLearning,
  isStarting = false,
}: HierarchicalSelectorProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selection, setSelection] = useState<CurriculumSelection>({
    state: null,
    city: null,
    board: null,
    subject: null,
    chapter: null,
    topic: "",
    isCustomMode: false,
    customBoard: "",
    customSubject: "",
    customChapter: "",
  });

  const [cities, setCities] = useState<SelectionOption[]>([]);
  const [chapters, setChapters] = useState<SelectionOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // Fetch cities when state changes
  useEffect(() => {
    if (selection.state) {
      setIsLoadingCities(true);
      fetchCities(selection.state.id)
        .then(setCities)
        .finally(() => setIsLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [selection.state]);

  // Fetch chapters when board and subject are selected
  useEffect(() => {
    if (selection.board && selection.subject) {
      setIsLoadingChapters(true);
      fetchChapters(selection.board.id, selection.subject.id)
        .then(setChapters)
        .finally(() => setIsLoadingChapters(false));
    } else {
      setChapters([]);
    }
  }, [selection.board, selection.subject]);

  const updateSelection = useCallback(
    (key: keyof CurriculumSelection, value: SelectionOption | string | null) => {
      setSelection((prev) => {
        const newSelection = { ...prev };

        // For dependent dropdowns, clear downstream selections
        if (key === "state") {
          newSelection.state = value as SelectionOption | null;
          newSelection.city = null;
          newSelection.board = null;
          newSelection.subject = null;
          newSelection.chapter = null;
          newSelection.topic = "";
        } else if (key === "city") {
          newSelection.city = value as SelectionOption | null;
          newSelection.board = null;
          newSelection.subject = null;
          newSelection.chapter = null;
          newSelection.topic = "";
        } else if (key === "board") {
          newSelection.board = value as SelectionOption | null;
          newSelection.subject = null;
          newSelection.chapter = null;
          newSelection.topic = "";
        } else if (key === "subject") {
          newSelection.subject = value as SelectionOption | null;
          newSelection.chapter = null;
          newSelection.topic = "";
        } else if (key === "chapter") {
          newSelection.chapter = value as SelectionOption | null;
        } else if (key === "topic") {
          newSelection.topic = value as string;
        }

        return newSelection;
      });
    },
    []
  );

  const clearFromStep = useCallback(
    (stepId: keyof Omit<CurriculumSelection, "topic">) => {
      updateSelection(stepId, null);
    },
    [updateSelection]
  );

  // Toggle between custom and dropdown mode
  const toggleCustomMode = useCallback(() => {
    setIsCustomMode((prev) => !prev);
    // Reset selection when toggling
    setSelection({
      state: null,
      city: null,
      board: null,
      subject: null,
      chapter: null,
      topic: "",
      isCustomMode: !isCustomMode,
      customBoard: "",
      customSubject: "",
      customChapter: "",
    });
  }, [isCustomMode]);

  // Custom input handlers
  const updateCustomField = useCallback(
    (field: "customBoard" | "customSubject" | "customChapter" | "topic", value: string) => {
      setSelection((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Check if selection is complete based on mode
  const isSelectionComplete = isCustomMode
    ? Boolean(
        selection.customBoard?.trim() &&
        selection.customSubject?.trim() &&
        selection.customChapter?.trim()
      )
    : Boolean(
        selection.state &&
        selection.city &&
        selection.board &&
        selection.subject &&
        selection.chapter
      );

  const handleStartLearning = () => {
    if (isSelectionComplete) {
      // Include the custom mode flag in the selection
      onStartLearning({ ...selection, isCustomMode });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                {isCustomMode ? "Enter Custom Course" : "Select Your Curriculum"}
              </CardTitle>
              <CardDescription>
                {isCustomMode
                  ? "Enter your own course details manually."
                  : "Choose what you want to learn today. Navigate through state, city, board, subject, and chapter."}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCustomMode}
              className="flex items-center gap-2"
            >
              {isCustomMode ? (
                <>
                  <List className="h-4 w-4" />
                  Use Dropdowns
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4" />
                  Enter Custom
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCustomMode ? (
            /* Custom Course Input Mode */
            <CustomCourseInput
              customBoard={selection.customBoard || ""}
              customSubject={selection.customSubject || ""}
              customChapter={selection.customChapter || ""}
              topic={selection.topic || ""}
              onCustomBoardChange={(val) => updateCustomField("customBoard", val)}
              onCustomSubjectChange={(val) => updateCustomField("customSubject", val)}
              onCustomChapterChange={(val) => updateCustomField("customChapter", val)}
              onTopicChange={(val) => updateCustomField("topic", val)}
            />
          ) : (
            <>
              {/* Breadcrumb */}
              <SelectionBreadcrumb
                selection={selection}
                onClearFrom={clearFromStep}
              />

              {/* Selection Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* State */}
                <SelectionStep
                  label="State"
                  placeholder="Select your state..."
                  description="Choose the state for your curriculum"
                  options={INITIAL_STATES}
                  value={selection.state}
                  onChange={(val) => updateSelection("state", val)}
                />

                {/* City */}
                <SelectionStep
                  label="City"
                  placeholder="Select your city..."
                  description="Choose your city"
                  options={cities}
                  value={selection.city}
                  onChange={(val) => updateSelection("city", val)}
                  disabled={!selection.state}
                  isLoading={isLoadingCities}
                />

                {/* Board */}
                <SelectionStep
                  label="Education Board"
                  placeholder="Select board..."
                  description="CBSE, ICSE, State Board, etc."
                  options={EDUCATION_BOARDS}
                  value={selection.board}
                  onChange={(val) => updateSelection("board", val)}
                  disabled={!selection.city}
                />

                {/* Subject */}
                <SelectionStep
                  label="Subject"
                  placeholder="Select subject..."
                  description="Choose the subject to learn"
                  options={SUBJECTS}
                  value={selection.subject}
                  onChange={(val) => updateSelection("subject", val)}
                  disabled={!selection.board}
                />

                {/* Chapter */}
                <SelectionStep
                  label="Chapter"
                  placeholder="Select chapter..."
                  description="Choose the chapter to study"
                  options={chapters}
                  value={selection.chapter}
                  onChange={(val) => updateSelection("chapter", val)}
                  disabled={!selection.subject}
                  isLoading={isLoadingChapters}
                />
              </div>

              {/* Topic Specification (shown when chapter is selected) */}
              {selection.chapter && (
                <div className="pt-4 border-t">
                  <TopicSpecification
                    value={selection.topic || ""}
                    onChange={(val) => updateSelection("topic", val)}
                    chapterName={selection.chapter.name}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Start Learning Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleStartLearning}
          disabled={!isSelectionComplete || isStarting}
          className="gap-2"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting Session...
            </>
          ) : (
            <>
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Selection Summary */}
      {isSelectionComplete && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Ready to Learn</h3>
                <p className="text-sm text-green-700 mt-1">
                  {isCustomMode ? (
                    <>
                      {selection.customBoard} - {selection.customSubject} - {selection.customChapter}
                    </>
                  ) : (
                    <>
                      {selection.board?.name} - {selection.subject?.name} - {selection.chapter?.name}
                    </>
                  )}
                  {selection.topic && (
                    <span className="block mt-1 text-green-600">
                      Focus: {selection.topic}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
