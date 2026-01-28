"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react"
import Link from "next/link"

interface CreateCourseModalProps {
  isOpen: boolean
  onClose: () => void
  accessToken: string
}

// Sample curriculum data - in production, this would come from an API
const BOARDS = [
  { id: "CBSE", name: "CBSE" },
  { id: "ICSE", name: "ICSE" },
  { id: "STATE_MH", name: "Maharashtra State Board" },
  { id: "STATE_KA", name: "Karnataka State Board" },
]

const SUBJECTS: Record<string, { id: string; name: string }[]> = {
  CBSE: [
    { id: "MATH", name: "Mathematics" },
    { id: "PHY", name: "Physics" },
    { id: "CHEM", name: "Chemistry" },
    { id: "BIO", name: "Biology" },
    { id: "ENG", name: "English" },
  ],
  ICSE: [
    { id: "MATH", name: "Mathematics" },
    { id: "PHY", name: "Physics" },
    { id: "CHEM", name: "Chemistry" },
    { id: "BIO", name: "Biology" },
  ],
  STATE_MH: [
    { id: "MATH", name: "Mathematics" },
    { id: "SCI", name: "Science" },
    { id: "SST", name: "Social Studies" },
  ],
  STATE_KA: [
    { id: "MATH", name: "Mathematics" },
    { id: "SCI", name: "Science" },
  ],
}

const CHAPTERS: Record<string, { id: string; name: string }[]> = {
  MATH: [
    { id: "CH1", name: "Real Numbers" },
    { id: "CH2", name: "Polynomials" },
    { id: "CH3", name: "Linear Equations" },
    { id: "CH4", name: "Quadratic Equations" },
    { id: "CH5", name: "Trigonometry" },
  ],
  PHY: [
    { id: "CH1", name: "Motion" },
    { id: "CH2", name: "Force and Laws of Motion" },
    { id: "CH3", name: "Gravitation" },
    { id: "CH4", name: "Work and Energy" },
  ],
  CHEM: [
    { id: "CH1", name: "Matter in Our Surroundings" },
    { id: "CH2", name: "Atoms and Molecules" },
    { id: "CH3", name: "Structure of Atom" },
  ],
  BIO: [
    { id: "CH1", name: "Cell Structure" },
    { id: "CH2", name: "Tissues" },
    { id: "CH3", name: "Diversity in Living Organisms" },
  ],
  SCI: [
    { id: "CH1", name: "General Science" },
    { id: "CH2", name: "Environment" },
  ],
  SST: [
    { id: "CH1", name: "History" },
    { id: "CH2", name: "Geography" },
  ],
  ENG: [
    { id: "CH1", name: "Grammar" },
    { id: "CH2", name: "Comprehension" },
  ],
}

interface ExistingCourse {
  id: string
  title: string
  material_count: number
  learner_count: number
}

export function CreateCourseModal({
  isOpen,
  onClose,
  accessToken,
}: CreateCourseModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<"select" | "exists" | "create">("select")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [boardId, setBoardId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [chapterId, setChapterId] = useState("")

  // Course details
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // Existing course (if found)
  const [existingCourse, setExistingCourse] = useState<ExistingCourse | null>(null)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  const resetForm = () => {
    setStep("select")
    setBoardId("")
    setSubjectId("")
    setChapterId("")
    setTitle("")
    setDescription("")
    setExistingCourse(null)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getBoardName = () => BOARDS.find((b) => b.id === boardId)?.name || ""
  const getSubjectName = () =>
    SUBJECTS[boardId]?.find((s) => s.id === subjectId)?.name || ""
  const getChapterName = () =>
    CHAPTERS[subjectId]?.find((c) => c.id === chapterId)?.name || ""

  const checkDuplicate = useCallback(async () => {
    if (!boardId || !subjectId || !chapterId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/check?board=${boardId}&subject=${subjectId}&chapter=${chapterId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to check for existing course")
      }

      const data = await response.json()

      if (data.exists && data.course) {
        setExistingCourse(data.course)
        setStep("exists")
      } else {
        // Generate default title
        const defaultTitle = `${getChapterName()} - ${getSubjectName()} (${getBoardName()})`
        setTitle(defaultTitle)
        setStep("create")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [boardId, subjectId, chapterId, accessToken, apiBaseUrl])

  const createCourse = async () => {
    if (!title.trim()) {
      setError("Title is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/community/courses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          board_id: boardId,
          subject_id: subjectId,
          chapter_id: chapterId,
          board_name: getBoardName(),
          subject_name: getSubjectName(),
          chapter_name: getChapterName(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to create course")
      }

      const data = await response.json()

      // Navigate to the new course
      handleClose()
      router.push(`/courses/${data.course.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const canCheckDuplicate = boardId && subjectId && chapterId

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
          <DialogDescription>
            {step === "select" && "Select a board, subject, and chapter to create or find a course."}
            {step === "exists" && "A course already exists for this selection."}
            {step === "create" && "Enter details for your new course."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="board">Board</Label>
              <Select value={boardId} onValueChange={(val) => {
                setBoardId(val)
                setSubjectId("")
                setChapterId("")
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={subjectId}
                onValueChange={(val) => {
                  setSubjectId(val)
                  setChapterId("")
                }}
                disabled={!boardId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {(SUBJECTS[boardId] || []).map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapter">Chapter</Label>
              <Select
                value={chapterId}
                onValueChange={setChapterId}
                disabled={!subjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {(CHAPTERS[subjectId] || []).map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={checkDuplicate}
                disabled={!canCheckDuplicate || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "exists" && existingCourse && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                A course already exists for this selection!
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">{existingCourse.title}</h4>
              <div className="text-sm text-muted-foreground">
                <p>{existingCourse.material_count} materials</p>
                <p>{existingCourse.learner_count} learners</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Link href={`/courses/${existingCourse.id}`}>
                <Button onClick={handleClose}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Course
                </Button>
              </Link>
            </div>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="text-sm text-muted-foreground">
                {getBoardName()} &gt; {getSubjectName()} &gt; {getChapterName()}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter course title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={createCourse} disabled={isLoading || !title.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Course
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
