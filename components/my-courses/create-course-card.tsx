"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface CreateCourseCardProps {
  onClick?: () => void
}

export function CreateCourseCard({ onClick }: CreateCourseCardProps) {
  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-8 h-8 text-gray-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Create New Course
            </h3>
            <p className="text-sm text-gray-600">
              Start building your course from scratch
            </p>
          </div>
          <Button onClick={onClick}>
            Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
