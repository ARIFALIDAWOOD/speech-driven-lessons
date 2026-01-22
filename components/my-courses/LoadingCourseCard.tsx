"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface LoadingCourseCardProps {
  courseTitle?: string;
  initialProgress?: number;
}

export function LoadingCourseCard({ courseTitle, initialProgress = 0 }: LoadingCourseCardProps) {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        {courseTitle ? (
          <CardTitle className="text-lg">{courseTitle}</CardTitle>
        ) : (
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        )}
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          {initialProgress > 0 ? (
            <Progress value={initialProgress} className="mt-4" />
          ) : (
            <div className="h-2 bg-gray-200 rounded-full mt-4"></div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
