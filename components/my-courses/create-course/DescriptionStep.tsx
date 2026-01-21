"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DescriptionStepProps {
  courseDescription: string
  setCourseDescription: (description: string) => void
}

export function DescriptionStep({ courseDescription, setCourseDescription }: DescriptionStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Description</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Describe your course</Label>
            <Textarea
              id="description"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="Provide a detailed description of what students will learn..."
              className="mt-2 min-h-[200px]"
            />
          </div>
          <p className="text-sm text-gray-500">
            A good description helps students understand what they'll learn from your course.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
