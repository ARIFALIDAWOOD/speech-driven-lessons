"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, File } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UploadStepProps {
  uploadedFilesInfo: { name: string; size: number }[]
  onFileUpload: (file: File) => Promise<void>
  onFileDelete: (fileName: string) => Promise<void>
  pendingFileOperations: Set<string>
  fileError: string | null
  setFileError: (error: string | null) => void
  isGeneratingSyllabus: boolean
  validateFile: (file: File) => { valid: boolean; error?: string }
}

export function UploadStep({
  uploadedFilesInfo,
  onFileUpload,
  onFileDelete,
  pendingFileOperations,
  fileError,
  setFileError,
  isGeneratingSyllabus,
  validateFile
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file")
      return
    }

    setFileError(null)
    await onFileUpload(file)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file")
      return
    }

    setFileError(null)
    await onFileUpload(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Course Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fileError && (
            <Alert variant="destructive">
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDragging ? "border-primary bg-primary/5" : "border-gray-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              Drag and drop your course file here, or click to browse
            </p>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.txt"
            />
            <Button onClick={() => document.getElementById("file-upload")?.click()}>
              Select File
            </Button>
          </div>

          {uploadedFilesInfo.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Uploaded Files</h3>
              {uploadedFilesInfo.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  {pendingFileOperations.has(file.name) ? (
                    <span className="text-xs text-gray-500">Uploading...</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onFileDelete(file.name)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isGeneratingSyllabus && (
            <Alert>
              <AlertDescription>Generating syllabus from uploaded files...</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
