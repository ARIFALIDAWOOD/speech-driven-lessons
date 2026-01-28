"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, FileText } from "lucide-react"
import Link from "next/link"

export interface CommunityCourse {
  id: string
  title: string
  description?: string
  board_id: string
  subject_id: string
  chapter_id: string
  board_name?: string
  subject_name?: string
  chapter_name?: string
  material_count: number
  contributor_count: number
  learner_count: number
  status: string
  created_at?: string
}

interface CommunityCourseCardProps {
  course: CommunityCourse
}

export function CommunityCourseCard({ course }: CommunityCourseCardProps) {
  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
          <div className="flex flex-wrap gap-1 mt-2">
            {course.board_name && (
              <Badge variant="outline" className="text-xs">
                {course.board_name}
              </Badge>
            )}
            {course.subject_name && (
              <Badge variant="secondary" className="text-xs">
                {course.subject_name}
              </Badge>
            )}
            {course.chapter_name && (
              <Badge variant="default" className="text-xs bg-emerald-600">
                {course.chapter_name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {course.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {course.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{course.material_count} files</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.learner_count} learners</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.contributor_count} contributors</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
