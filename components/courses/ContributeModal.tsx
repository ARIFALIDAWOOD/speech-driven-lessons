"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
  FileText,
  X,
  Image as ImageIcon,
  Youtube,
  Link,
  FileType,
} from "lucide-react"

type ContributionType = "pdf" | "image" | "youtube" | "link" | "text"

interface ContributeModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseTitle: string
  accessToken: string
  onSuccess?: () => void
}

interface SelectedFile {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

export function ContributeModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  accessToken,
  onSuccess,
}: ContributeModalProps) {
  const [activeTab, setActiveTab] = useState<ContributionType>("pdf")
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form states for non-file contributions
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkTitle, setLinkTitle] = useState("")
  const [textTitle, setTextTitle] = useState("")
  const [textContent, setTextContent] = useState("")

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  const acceptedTypes: Record<ContributionType, { [key: string]: string[] }> = {
    pdf: { "application/pdf": [".pdf"] },
    image: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    youtube: {},
    link: {},
    text: {},
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        if (activeTab === "pdf") {
          return file.type === "application/pdf"
        }
        if (activeTab === "image") {
          return file.type.startsWith("image/")
        }
        return false
      })

      if (validFiles.length !== acceptedFiles.length) {
        setError(
          activeTab === "pdf"
            ? "Only PDF files are accepted"
            : "Only image files are accepted"
        )
      }

      const newFiles: SelectedFile[] = validFiles.map((file) => ({
        file,
        status: "pending",
      }))

      setSelectedFiles((prev) => [...prev, ...newFiles])
      setError(null)
    },
    [activeTab]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes[activeTab],
    maxSize: 50 * 1024 * 1024, // 50MB limit
    disabled: activeTab === "youtube" || activeTab === "link" || activeTab === "text",
  })

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([])
      setError(null)
      setSuccess(false)
      setUploadProgress(0)
      setYoutubeUrl("")
      setLinkUrl("")
      setLinkTitle("")
      setTextTitle("")
      setTextContent("")
      onClose()
    }
  }

  const validateYoutubeUrl = (url: string): boolean => {
    return url.includes("youtube.com") || url.includes("youtu.be")
  }

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    const totalFiles = selectedFiles.length
    let completedFiles = 0
    let hasError = false

    const updatedFiles = [...selectedFiles]

    for (let i = 0; i < totalFiles; i++) {
      const fileItem = updatedFiles[i]
      if (fileItem.status !== "pending") continue

      updatedFiles[i] = { ...fileItem, status: "uploading" }
      setSelectedFiles([...updatedFiles])

      try {
        const formData = new FormData()
        formData.append("file", fileItem.file)
        formData.append("contribution_type", activeTab)

        const response = await fetch(
          `${apiBaseUrl}/api/community/courses/${courseId}/contribute`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || "Upload failed")
        }

        updatedFiles[i] = { ...fileItem, status: "success" }
        completedFiles++
      } catch (err) {
        updatedFiles[i] = {
          ...fileItem,
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        }
        hasError = true
      }

      setSelectedFiles([...updatedFiles])
      setUploadProgress(Math.round((completedFiles / totalFiles) * 100))
    }

    setIsUploading(false)

    if (!hasError) {
      setSuccess(true)
      onSuccess?.()
    }
  }

  const submitYoutube = async () => {
    if (!youtubeUrl) return
    if (!validateYoutubeUrl(youtubeUrl)) {
      setError("Please enter a valid YouTube URL")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${courseId}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contribution_type: "youtube",
            filename: youtubeUrl,
            contribution_metadata: { url: youtubeUrl },
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Submission failed")
      }

      setSuccess(true)
      setYoutubeUrl("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setIsUploading(false)
    }
  }

  const submitLink = async () => {
    if (!linkUrl) return

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${courseId}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contribution_type: "link",
            filename: linkTitle || linkUrl,
            contribution_metadata: { url: linkUrl, title: linkTitle },
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Submission failed")
      }

      setSuccess(true)
      setLinkUrl("")
      setLinkTitle("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setIsUploading(false)
    }
  }

  const submitText = async () => {
    if (!textContent) return

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${courseId}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contribution_type: "text",
            filename: textTitle || "Text contribution",
            contribution_metadata: { content: textContent, title: textTitle },
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Submission failed")
      }

      setSuccess(true)
      setTextTitle("")
      setTextContent("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setIsUploading(false)
    }
  }

  const pendingFiles = selectedFiles.filter((f) => f.status === "pending")
  const canUploadFiles = pendingFiles.length > 0 && !isUploading
  const canSubmitYoutube = youtubeUrl && !isUploading
  const canSubmitLink = linkUrl && !isUploading
  const canSubmitText = textContent && !isUploading

  const getYoutubeEmbedUrl = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    )
    return match ? `https://www.youtube.com/embed/${match[1]}` : null
  }

  const embedUrl = getYoutubeEmbedUrl(youtubeUrl)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contribute Materials</DialogTitle>
          <DialogDescription>
            Upload materials to contribute to &quot;{courseTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Contribution submitted successfully! It&apos;s now pending approval.
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as ContributionType)
            setSelectedFiles([])
            setError(null)
          }}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pdf" className="gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Image</span>
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-1">
              <Youtube className="w-4 h-4" />
              <span className="hidden sm:inline">YouTube</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1">
              <Link className="w-4 h-4" />
              <span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1">
              <FileType className="w-4 h-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
          </TabsList>

          {/* PDF & Image Upload */}
          <TabsContent value="pdf" className="space-y-4">
            <FileDropzone
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
              isUploading={isUploading}
              fileType="PDF"
            />
            <FileList
              files={selectedFiles}
              isUploading={isUploading}
              onRemove={removeFile}
            />
            {isUploading && <UploadProgress progress={uploadProgress} />}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {success ? "Close" : "Cancel"}
              </Button>
              {!success && (
                <Button onClick={uploadFiles} disabled={!canUploadFiles}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <FileDropzone
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
              isUploading={isUploading}
              fileType="Image"
            />
            <FileList
              files={selectedFiles}
              isUploading={isUploading}
              onRemove={removeFile}
            />
            {isUploading && <UploadProgress progress={uploadProgress} />}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {success ? "Close" : "Cancel"}
              </Button>
              {!success && (
                <Button onClick={uploadFiles} disabled={!canUploadFiles}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* YouTube Link */}
          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isUploading}
              />
            </div>
            {embedUrl && (
              <div className="aspect-video rounded-lg overflow-hidden border">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title="YouTube Preview"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {success ? "Close" : "Cancel"}
              </Button>
              {!success && (
                <Button onClick={submitYoutube} disabled={!canSubmitYoutube}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Video
                </Button>
              )}
            </div>
          </TabsContent>

          {/* External Link */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">Link URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com/resource"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-title">Title (optional)</Label>
              <Input
                id="link-title"
                type="text"
                placeholder="Resource title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {success ? "Close" : "Cancel"}
              </Button>
              {!success && (
                <Button onClick={submitLink} disabled={!canSubmitLink}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Link
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Text Content */}
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-title">Title (optional)</Label>
              <Input
                id="text-title"
                type="text"
                placeholder="Notes title"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Enter your notes, explanations, or study material..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={isUploading}
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {success ? "Close" : "Cancel"}
              </Button>
              {!success && (
                <Button onClick={submitText} disabled={!canSubmitText}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Text
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Helper components
function FileDropzone({
  getRootProps,
  getInputProps,
  isDragActive,
  isUploading,
  fileType,
}: {
  getRootProps: () => object
  getInputProps: () => object
  isDragActive: boolean
  isUploading: boolean
  fileType: string
}) {
  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors
        ${isDragActive ? "border-emerald-500 bg-emerald-50" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
        ${isUploading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
      {isDragActive ? (
        <p className="text-emerald-600">Drop the files here...</p>
      ) : (
        <>
          <p className="text-muted-foreground">
            Drag & drop {fileType} files here, or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Maximum file size: 50MB
          </p>
        </>
      )}
    </div>
  )
}

function FileList({
  files,
  isUploading,
  onRemove,
}: {
  files: SelectedFile[]
  isUploading: boolean
  onRemove: (index: number) => void
}) {
  if (files.length === 0) return null

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {files.map((item, index) => (
        <div
          key={index}
          className={`
            flex items-center justify-between p-2 rounded-lg border
            ${item.status === "success" ? "bg-emerald-50 border-emerald-200" : ""}
            ${item.status === "error" ? "bg-red-50 border-red-200" : ""}
          `}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-sm truncate">{item.file.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              ({(item.file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {item.status === "uploading" && (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            )}
            {item.status === "success" && (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
            {item.status === "error" && (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            {item.status === "pending" && !isUploading && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onRemove(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-center text-muted-foreground">
        Uploading... {progress}%
      </p>
    </div>
  )
}
