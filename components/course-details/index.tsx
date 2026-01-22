"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, BookOpen, X, ExternalLink, Mail } from "lucide-react"
import { format } from "date-fns"

interface Appointment {
  id: string
  title: string
  tutor: string
  email: string
  zoomLink: string
  date: string
  startTime: string
  endTime: string
  description: string
}

export interface CourseDetailsProps {
  // Schedule page props
  course?: Appointment
  selectedDate?: Date
  onClose?: () => void
  // Simple display props
  title?: string
  description?: string
  duration?: number
  enrolled?: number
  instructor?: string
}

export function CourseDetails({
  course,
  selectedDate,
  onClose,
  title = "Course Title",
  description = "Course description",
  duration = 0,
  enrolled = 0,
  instructor = "Instructor Name"
}: CourseDetailsProps) {
  // If course (Appointment) is provided, render the schedule detail view
  if (course) {
    return (
      <Card className="w-80">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{course.title}</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500">
            {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{course.startTime} - {course.endTime}</span>
          </div>
          <p className="text-sm text-gray-600">{course.description}</p>
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span>{course.tutor}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-500" />
            <span>{course.email}</span>
          </div>
          {course.zoomLink && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href={course.zoomLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Meeting
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Default simple display mode
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
