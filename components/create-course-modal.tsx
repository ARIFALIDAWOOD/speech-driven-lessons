"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CourseData {
  id?: string
  title: string
  description?: string
  progress?: number
  aiTutor?: boolean
  startDate?: string
  endDate?: string
}

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (courseData: CourseData) => void
  courseToEdit?: CourseData | null
}

export function CreateCourseModal({
  open,
  onOpenChange,
  onSave,
  courseToEdit
}: CreateCourseModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    if (courseToEdit) {
      setTitle(courseToEdit.title || "")
      setDescription(courseToEdit.description || "")
      setStartDate(courseToEdit.startDate || "")
      setEndDate(courseToEdit.endDate || "")
    } else {
      setTitle("")
      setDescription("")
      setStartDate("")
      setEndDate("")
    }
  }, [courseToEdit, open])

  const handleSave = () => {
    if (!title.trim()) return

    const courseData: CourseData = {
      id: courseToEdit?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      progress: courseToEdit?.progress || 0,
      aiTutor: courseToEdit?.aiTutor || false,
    }

    onSave(courseData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{courseToEdit ? "Edit Course" : "Create New Course"}</DialogTitle>
          <DialogDescription>
            {courseToEdit ? "Update course details" : "Add a new course to your list"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter course title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {courseToEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
