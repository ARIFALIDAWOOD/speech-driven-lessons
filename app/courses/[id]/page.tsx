"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ContributeModal } from "@/components/courses/ContributeModal"
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Users,
  UserPlus,
  Plus,
  Play,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/auth/supabase"

interface CourseDetail {
  course: {
    id: string
    title: string
    description?: string
    board_id: string
    subject_id: string
    chapter_id: string
    board_name?: string
    subject_name?: string
    chapter_name?: string
    material_count: number
    contributor_count: number
    learner_count: number
    status: string
    created_at?: string
  }
  materials: {
    id: string
    filename: string
    file_size?: number
    added_at?: string
  }[]
  contributors: {
    user_id: string
    role: string
    joined_at?: string
  }[]
  user_membership?: {
    id: string
    role: string
    progress_pct: number
    time_spent_mins: number
    joined_at?: string
    last_accessed_at?: string
  }
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  const fetchCourseDetail = useCallback(async () => {
    if (!session?.access_token) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${params.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Course not found")
        }
        throw new Error("Failed to fetch course")
      }

      const data = await response.json()
      setCourseDetail(data)
    } catch (err) {
      console.error("Error fetching course:", err)
      setError(err instanceof Error ? err.message : "Failed to load course")
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token, params.id, apiBaseUrl])

  const handleJoinCourse = async () => {
    if (!session?.access_token) return

    setIsJoining(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/community/courses/${params.id}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to join course")
      }

      // Refresh course detail to get updated membership
      await fetchCourseDetail()
    } catch (err) {
      console.error("Error joining course:", err)
      setError(err instanceof Error ? err.message : "Failed to join course")
    } finally {
      setIsJoining(false)
    }
  }

  useEffect(() => {
    if (!authLoading && session?.access_token) {
      fetchCourseDetail()
    }
  }, [authLoading, session?.access_token, fetchCourseDetail])

  // Fullscreen handling
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullScreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullScreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const isEnrolled = !!courseDetail?.user_membership
  const course = courseDetail?.course

  return (
    <MainLayout>
      <div className="flex-1 bg-background relative">
        <ScrollArea className="h-screen" type="hover">
          <FullscreenButton
            isFullScreen={isFullScreen}
            onToggle={toggleFullScreen}
          />

          {/* Header */}
          <div className="border-b bg-card">
            <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
              <Link
                href="/courses"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Link>

              {error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-destructive">
                  <p>{error}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={fetchCourseDetail}>
                      Try Again
                    </Button>
                    <Link href="/courses">
                      <Button variant="outline">Back to Courses</Button>
                    </Link>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  <div className="h-8 w-2/3 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                </div>
              ) : course ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-foreground">
                        {course.title}
                      </h1>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {course.board_name && (
                          <Badge variant="outline">{course.board_name}</Badge>
                        )}
                        {course.subject_name && (
                          <Badge variant="secondary">{course.subject_name}</Badge>
                        )}
                        {course.chapter_name && (
                          <Badge className="bg-emerald-600">
                            {course.chapter_name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isEnrolled ? (
                        <Button
                          onClick={handleJoinCourse}
                          disabled={isJoining}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isJoining ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4 mr-2" />
                          )}
                          Join Course
                        </Button>
                      ) : (
                        <Link href={`/learn/session/${params.id}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Play className="w-4 h-4 mr-2" />
                            Start Learning
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-muted-foreground mt-4">
                      {course.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 mt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{course.material_count} materials</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{course.learner_count} learners</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.contributor_count} contributors</span>
                    </div>
                  </div>

                  {/* User progress (if enrolled) */}
                  {isEnrolled && courseDetail?.user_membership && (
                    <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">You&apos;re enrolled!</span>
                        <Badge variant="outline" className="ml-2">
                          {courseDetail.user_membership.role}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-emerald-600 dark:text-emerald-400">
                        <span>
                          Progress: {courseDetail.user_membership.progress_pct.toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {courseDetail.user_membership.time_spent_mins} mins spent
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Main content */}
          {course && (
            <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Materials Section */}
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">
                        Materials ({courseDetail?.materials.length || 0})
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsContributeModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Contribute
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {courseDetail?.materials.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-4">
                            No materials yet. Be the first to contribute!
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setIsContributeModalOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Upload Material
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {courseDetail?.materials.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-red-500" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {material.filename}
                                  </p>
                                  {material.file_size && (
                                    <p className="text-xs text-muted-foreground">
                                      {(material.file_size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Contributors Section */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Contributors ({courseDetail?.contributors.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {courseDetail?.contributors.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          No contributors yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {courseDetail?.contributors.map((contributor) => (
                            <div
                              key={contributor.user_id}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {contributor.user_id.slice(0, 8)}...
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {contributor.role}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Contribute Modal */}
      {session?.access_token && course && (
        <ContributeModal
          isOpen={isContributeModalOpen}
          onClose={() => setIsContributeModalOpen(false)}
          courseId={params.id}
          courseTitle={course.title}
          accessToken={session.access_token}
          onSuccess={fetchCourseDetail}
        />
      )}
    </MainLayout>
  )
}
