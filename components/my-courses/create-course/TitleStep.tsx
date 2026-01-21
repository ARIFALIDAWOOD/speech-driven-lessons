"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TitleStepProps {
  courseTitle: string
  setCourseTitle: (title: string) => void
}

export function TitleStep({ courseTitle, setCourseTitle }: TitleStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Title</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Enter your course title</Label>
            <Input
              id="title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g., Introduction to Machine Learning"
              className="mt-2"
            />
          </div>
          <p className="text-sm text-gray-500">
            Choose a clear and descriptive title for your course.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
