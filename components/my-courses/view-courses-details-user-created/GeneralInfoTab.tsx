"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UploadedFile } from "@/components/my-courses/utils/courseTypes"

interface GeneralInfoTabProps {
  title: string
  setTitle: (title: string) => void
  instructor: string
  setInstructor: (instructor: string) => void
  description: string
  setDescription: (description: string) => void
  aiVoice: string
  setAiVoice: (voice: string) => void
  files: UploadedFile[]
  setFiles: (files: UploadedFile[]) => void
  courseId: string
}

export function GeneralInfoTab({
  title,
  setTitle,
  instructor,
  setInstructor,
  description,
  setDescription,
  aiVoice,
  setAiVoice,
  files,
  setFiles,
  courseId
}: GeneralInfoTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <Label htmlFor="title">Course Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="instructor">Instructor</Label>
        <Input
          id="instructor"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="aiVoice">AI Voice</Label>
        <Input
          id="aiVoice"
          value={aiVoice}
          onChange={(e) => setAiVoice(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Uploaded Files</Label>
        <div className="mt-2 space-y-2">
          {files.length === 0 ? (
            <p className="text-sm text-gray-500">No files uploaded</p>
          ) : (
            files.map((file) => (
              <div key={file.id} className="text-sm text-gray-700">
                {file.name} ({file.size})
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
