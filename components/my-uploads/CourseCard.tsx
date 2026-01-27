"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle, MoreVertical, Eye, Users, Clock } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string | number
  title: string
  hoursCompleted?: number
  enrolled?: number
  views?: number
  isPublished?: boolean
  description?: string
  create_course_process?: {
    current_step?: number
    is_creation_complete?: boolean
  }
}

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
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
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.hoursCompleted ?? 0}h</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrolled ?? 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{course.views ?? 0}</span>
            </div>
          </div>

          {/* Status badge */}
          <div>
            {course.isPublished ? (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                Published
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
          </div>

          <Link href={`/my-courses/view-courses-details-user-created/${course.id}`}>
            <Button className="w-full" size="sm">
              <PlayCircle className="w-4 h-4 mr-2" />
              View Course
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
