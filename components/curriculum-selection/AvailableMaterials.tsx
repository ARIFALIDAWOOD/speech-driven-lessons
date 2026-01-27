"use client";

/**
 * AvailableMaterials Component
 *
 * Shows courses that match the current B/S/C selection, allowing users
 * to attach their uploaded course materials to a tutoring session.
 */

import { useState, useEffect } from "react";
import { BookOpen, FileText, Check, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseData {
  id: string;
  title: string;
  description: string;
  board_id?: string;
  subject_id?: string;
  chapter_id?: string;
  board_name?: string;
  subject_name?: string;
  chapter_name?: string;
  curriculum_topic?: string;
  uploadedFiles?: Array<{ name: string; size: number }>;
}

interface AvailableMaterialsProps {
  boardId: string;
  subjectId?: string;
  chapterId?: string;
  accessToken: string;
  onCourseSelect?: (courseId: string | null) => void;
  selectedCourseId?: string | null;
}

type LoadingState = "idle" | "loading" | "loaded" | "error";

export function AvailableMaterials({
  boardId,
  subjectId,
  chapterId,
  accessToken,
  onCourseSelect,
  selectedCourseId,
}: AvailableMaterialsProps) {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Fetch courses matching the curriculum criteria
  useEffect(() => {
    if (!boardId) {
      setCourses([]);
      setLoadingState("idle");
      return;
    }

    const fetchCourses = async () => {
      setLoadingState("loading");
      setError(null);

      try {
        const params = new URLSearchParams({ board: boardId });
        if (subjectId) params.append("subject", subjectId);
        if (chapterId) params.append("chapter", chapterId);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/course/by-curriculum?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }

        const data = await response.json();
        setCourses(data.courses || []);
        setLoadingState("loaded");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
        setLoadingState("error");
        setCourses([]);
      }
    };

    fetchCourses();
  }, [boardId, subjectId, chapterId, accessToken]);

  // Handle course selection
  const handleSelect = (courseId: string) => {
    if (selectedCourseId === courseId) {
      // Deselect
      onCourseSelect?.(null);
    } else {
      onCourseSelect?.(courseId);
    }
  };

  // Don't show anything if no board selected
  if (!boardId) {
    return null;
  }

  // Loading state
  if (loadingState === "loading") {
    return (
      <div className="py-4 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Looking for your materials...</span>
      </div>
    );
  }

  // Error state
  if (loadingState === "error") {
    return (
      <div className="py-4 flex items-center justify-center text-red-600">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // No courses found
  if (courses.length === 0) {
    return (
      <div className="py-4 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">No materials found</p>
            <p className="text-xs text-gray-500 mt-1">
              Upload course materials and tag them with this curriculum to use them here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          Your Materials ({courses.length})
        </span>
        <span className="text-xs text-gray-500">
          - Select one to enhance your session
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {courses.map((course) => (
          <MaterialCard
            key={course.id}
            course={course}
            isSelected={selectedCourseId === course.id}
            onSelect={() => handleSelect(course.id)}
          />
        ))}
      </div>

      {selectedCourseId && (
        <div className="text-xs text-emerald-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Materials from selected course will be used in your session
        </div>
      )}
    </div>
  );
}

interface MaterialCardProps {
  course: CourseData;
  isSelected: boolean;
  onSelect: () => void;
}

function MaterialCard({ course, isSelected, onSelect }: MaterialCardProps) {
  const fileCount = course.uploadedFiles?.length || 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
          : "border-gray-200 hover:border-gray-300"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              isSelected ? "bg-emerald-100" : "bg-blue-50"
            )}
          >
            {isSelected ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <BookOpen className="h-4 w-4 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {course.title}
            </h4>

            {course.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {course.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              {fileCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {fileCount} {fileCount === 1 ? "file" : "files"}
                </Badge>
              )}
              {course.chapter_name && (
                <Badge variant="outline" className="text-xs">
                  {course.chapter_name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
