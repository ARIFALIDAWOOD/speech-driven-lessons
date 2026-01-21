"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, BookOpen } from "lucide-react"

interface CourseDetailsProps {
  title?: string
  description?: string
  duration?: number
  enrolled?: number
  instructor?: string
}

export function CourseDetails({
  title = "Course Title",
  description = "Course description",
  duration = 0,
  enrolled = 0,
  instructor = "Instructor Name"
}: CourseDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex gap-4 text-sm text-gray-500">
          {duration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{duration}h</span>
            </div>
          )}
          {enrolled > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{enrolled} enrolled</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{instructor}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
