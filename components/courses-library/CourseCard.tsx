"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, Clock, Eye } from "lucide-react"
import Link from "next/link"

export interface CourseItem {
  id: number
  title: string
  description: string
  author: string
  duration?: number
  tags?: string[]
  views: number
  publishedDate: string
}

interface CourseCardProps {
  course?: CourseItem
  item?: CourseItem
}

export function CourseCard({ course, item }: CourseCardProps) {
  const courseData = course || item
  if (!courseData) return null
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-2">{courseData.title}</CardTitle>
        <p className="text-sm text-gray-500">By {courseData.author}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{courseData.description}</p>
        
        {courseData.tags && courseData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {courseData.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          {courseData.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{courseData.duration}h</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{courseData.views.toLocaleString()}</span>
          </div>
        </div>

        <Link href={`/courses/${courseData.id}`}>
          <Button className="w-full" size="sm">
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Course
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
