"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Section } from "./SyllabusTypes"

interface ConfirmStepProps {
  courseTitle: string
  courseDescription: string
  uploadedFilesInfo: { name: string; size: number }[]
  syllabus: Section[]
  aiVoice: string
  isCreatingCourse: boolean
  handleCreateCourse: () => Promise<void>
}

export function ConfirmStep({
  courseTitle,
  courseDescription,
  uploadedFilesInfo,
  syllabus,
  aiVoice,
  isCreatingCourse,
  handleCreateCourse
}: ConfirmStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Course Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Title</h3>
            <p className="text-gray-700">{courseTitle || "Not set"}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700">{courseDescription || "Not set"}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Uploaded Files</h3>
            <ul className="list-disc list-inside text-gray-700">
              {uploadedFilesInfo.length > 0 ? (
                uploadedFilesInfo.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))
              ) : (
                <li>No files uploaded</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Syllabus Sections</h3>
            <p className="text-gray-700">{syllabus.length} sections</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">AI Voice</h3>
            <p className="text-gray-700">{aiVoice}</p>
          </div>

          <Button
            onClick={handleCreateCourse}
            disabled={isCreatingCourse}
            className="w-full"
            size="lg"
          >
            {isCreatingCourse ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Course...
              </>
            ) : (
              "Create Course"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
