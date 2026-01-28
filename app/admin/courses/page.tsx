"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/auth/supabase"
import { MainLayout } from "@/components/layout/MainLayout"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Library,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

interface Course {
  id: string
  title: string
  subject: string
  description: string
  board_id: string
  board_name?: string
  class_level?: number
  state_id?: string
  state_name?: string
  city_id?: string
  city_name?: string
  chapter_id?: string
  chapter_name?: string
  created_at: string
  contribution_count?: number
}

interface ClassificationOptions {
  states: { id: string; name: string }[]
  cities: Record<string, { id: string; name: string }[]>
  boards: { id: string; name: string }[]
  classLevels: number[]
}

function AdminCoursesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOptions | null>(null)

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    board_id: "",
    class_level: "",
    state_id: "",
    city_id: "",
    chapter_id: "",
    chapter_name: "",
  })

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  // Check if we should open create dialog from URL
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsCreateDialogOpen(true)
    }
  }, [searchParams])

  // Fetch classification options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!session?.access_token) return

      try {
        const response = await fetch(`${apiBaseUrl}/api/user/classification/options`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setClassificationOptions(data)
        }
      } catch (error) {
        console.error("Error fetching classification options:", error)
      }
    }

    if (!authLoading && session) {
      fetchOptions()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!session?.access_token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/community/courses`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setCourses(data.courses || [])
          setFilteredCourses(data.courses || [])
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchCourses()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  // Filter courses by search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCourses(courses)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredCourses(
        courses.filter(
          (course) =>
            course.title.toLowerCase().includes(query) ||
            course.subject.toLowerCase().includes(query) ||
            course.board_name?.toLowerCase().includes(query) ||
            course.state_name?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, courses])

  const resetForm = () => {
    setFormData({
      title: "",
      subject: "",
      description: "",
      board_id: "",
      class_level: "",
      state_id: "",
      city_id: "",
      chapter_id: "",
      chapter_name: "",
    })
    setFormError(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setEditingCourse(null)
    setIsCreateDialogOpen(true)
  }

  const handleOpenEdit = (course: Course) => {
    setFormData({
      title: course.title,
      subject: course.subject,
      description: course.description || "",
      board_id: course.board_id || "",
      class_level: course.class_level?.toString() || "",
      state_id: course.state_id || "",
      city_id: course.city_id || "",
      chapter_id: course.chapter_id || "",
      chapter_name: course.chapter_name || "",
    })
    setEditingCourse(course)
    setIsCreateDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!session?.access_token) return

    // Validate required fields
    if (!formData.title || !formData.subject || !formData.board_id) {
      setFormError("Title, Subject, and Board are required")
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const boardName = classificationOptions?.boards.find(b => b.id === formData.board_id)?.name || ""
      const stateName = classificationOptions?.states.find(s => s.id === formData.state_id)?.name || ""
      const cityName = formData.state_id && formData.city_id
        ? classificationOptions?.cities[formData.state_id]?.find(c => c.id === formData.city_id)?.name || ""
        : ""

      const payload = {
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        board_id: formData.board_id,
        board_name: boardName,
        class_level: formData.class_level ? parseInt(formData.class_level) : null,
        state_id: formData.state_id || null,
        state_name: stateName || null,
        city_id: formData.city_id || null,
        city_name: cityName || null,
        chapter_id: formData.chapter_id || null,
        chapter_name: formData.chapter_name || null,
      }

      const url = editingCourse
        ? `${apiBaseUrl}/api/community/courses/${editingCourse.id}`
        : `${apiBaseUrl}/api/community/courses`

      const response = await fetch(url, {
        method: editingCourse ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to save course")
      }

      const savedCourse = await response.json()

      if (editingCourse) {
        setCourses(courses.map(c => c.id === editingCourse.id ? { ...c, ...savedCourse.course || savedCourse } : c))
        setSuccessMessage("Course updated successfully")
      } else {
        const newCourse = savedCourse.course || savedCourse
        setCourses([newCourse, ...courses])
        setSuccessMessage("Course created successfully")
      }

      setIsCreateDialogOpen(false)
      resetForm()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("Error saving course:", error)
      setFormError(error instanceof Error ? error.message : "Failed to save course")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    if (!session?.access_token) return
    if (!confirm("Are you sure you want to delete this course? This cannot be undone.")) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/community/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setCourses(courses.filter(c => c.id !== courseId))
        setSuccessMessage("Course deleted successfully")
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error("Error deleting course:", error)
    }
  }

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  return (
    <MainLayout>
      <div className="h-full overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Courses" },
            ]}
            className="mb-6"
          />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Library className="h-8 w-8 text-primary" />
                Course Management
              </h1>
              <p className="mt-2 text-muted-foreground">
                Create and manage courses with full classification control.
              </p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses by title, subject, board, or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Courses Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Courses ({filteredCourses.length})</CardTitle>
              <CardDescription>
                Manage course details, classifications, and content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No courses match your search." : "No courses yet. Create your first course."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Contributions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>{course.subject}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {course.class_level && (
                                <span className="text-muted-foreground">Class {course.class_level}</span>
                              )}
                              {course.board_name && (
                                <span className="text-muted-foreground"> • {course.board_name}</span>
                              )}
                              {course.state_name && (
                                <span className="text-muted-foreground"> • {course.state_name}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{course.contribution_count || 0}</TableCell>
                          <TableCell>
                            {new Date(course.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(course)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(course.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCourse ? "Edit Course" : "Create New Course"}
                </DialogTitle>
                <DialogDescription>
                  {editingCourse
                    ? "Update course details and classification."
                    : "Create a new course with full classification for filtering."}
                </DialogDescription>
              </DialogHeader>

              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Introduction to Algebra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this course covers..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Board *</Label>
                    <Select
                      value={formData.board_id}
                      onValueChange={(value) => setFormData({ ...formData, board_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        {classificationOptions?.boards.map((board) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class Level</Label>
                    <Select
                      value={formData.class_level}
                      onValueChange={(value) => setFormData({ ...formData, class_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classificationOptions?.classLevels.map((level) => (
                          <SelectItem key={level} value={level.toString()}>
                            Class {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select
                      value={formData.state_id}
                      onValueChange={(value) => setFormData({ ...formData, state_id: value, city_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {classificationOptions?.states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={formData.city_id}
                      onValueChange={(value) => setFormData({ ...formData, city_id: value })}
                      disabled={!formData.state_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.state_id ? "Select city" : "Select state first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.state_id &&
                          classificationOptions?.cities[formData.state_id]?.map((city) => (
                            <SelectItem key={city.id} value={city.id}>
                              {city.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapter_name">Chapter Name</Label>
                  <Input
                    id="chapter_name"
                    value={formData.chapter_name}
                    onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })}
                    placeholder="e.g., Linear Equations"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingCourse ? (
                    "Update Course"
                  ) : (
                    "Create Course"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  )
}

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    }>
      <AdminCoursesPageContent />
    </Suspense>
  )
}
