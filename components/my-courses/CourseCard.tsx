"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, MoreVertical } from "lucide-react";
import Link from "next/link";
import { CourseInfo } from "./utils/courseTypes";

interface CourseCardProps {
  course: CourseInfo;
  onRequestAssistant?: (courseId: string, courseTitle: string) => Promise<string | null>;
}

export function CourseCard({ course, onRequestAssistant }: CourseCardProps) {
  const progress = course.progress?.completion ?? 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-3">By {course.author}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link href={`/in-class-courses/${course.id}`}>
          <Button className="w-full" size="sm">
            <PlayCircle className="w-4 h-4 mr-2" />
            Continue Learning
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
