"use client";

import { Input } from "@/components/ui/input";

interface CustomCourseInputProps {
  customBoard: string;
  customSubject: string;
  customChapter: string;
  topic: string;
  onCustomBoardChange: (value: string) => void;
  onCustomSubjectChange: (value: string) => void;
  onCustomChapterChange: (value: string) => void;
  onTopicChange: (value: string) => void;
}

export function CustomCourseInput({
  customBoard,
  customSubject,
  customChapter,
  topic,
  onCustomBoardChange,
  onCustomSubjectChange,
  onCustomChapterChange,
  onTopicChange,
}: CustomCourseInputProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Board/Curriculum */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Board / Curriculum
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Enter your education board (e.g., CBSE, ICSE, State Board)
        </p>
        <Input
          placeholder="Enter board or curriculum..."
          value={customBoard}
          onChange={(e) => onCustomBoardChange(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Subject
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Enter the subject you want to learn
        </p>
        <Input
          placeholder="Enter subject..."
          value={customSubject}
          onChange={(e) => onCustomSubjectChange(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Chapter/Topic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Chapter / Topic
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Enter the chapter or topic to study
        </p>
        <Input
          placeholder="Enter chapter or topic..."
          value={customChapter}
          onChange={(e) => onCustomChapterChange(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Specific Focus (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Specific Focus
            <span className="text-gray-400 ml-1 text-xs">(optional)</span>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Narrow down to a specific concept within the topic
        </p>
        <Input
          placeholder="e.g., Pythagorean theorem applications..."
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          className="h-11"
        />
      </div>
    </div>
  );
}
