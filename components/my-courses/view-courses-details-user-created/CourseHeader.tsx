"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface CourseHeaderProps {
  title: string
  courseId: string
}

export function CourseHeader({ title, courseId }: CourseHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  )
}
