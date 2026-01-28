"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionHeader } from "@/components/dashboard/dashboard-section-header"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/auth/supabase"
import {
  BookOpen,
  Clock,
  FileText,
  Play,
  Plus,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Breadcrumb } from "@/components/layout/Breadcrumb"

// Types
interface UserProgress {
  course_id: string
  title: string
  board_name?: string
  subject_name?: string
  chapter_name?: string
  role: string
  progress_pct: number
  time_spent_mins: number
  material_count: number
  last_accessed_at?: string
}

interface UserContribution {
  id: string
  course_id: string
  filename: string
  status: string
  submitted_at?: string
  validation_score?: number
}

interface QuickStats {
  totalCourses: number
  totalTimeSpent: number
  avgProgress: number
  contributionsCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { session, user, loading: authLoading } = useAuth()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [contributions, setContributions] = useState<UserContribution[]>([])
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalCourses: 0,
    totalTimeSpent: 0,
    avgProgress: 0,
    contributionsCount: 0,
  })

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!session?.access_token) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch user progress and contributions in parallel
      const [progressResponse, contributionsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/community/my-progress`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${apiBaseUrl}/api/community/my-contributions`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }),
      ])

      if (!progressResponse.ok || !contributionsResponse.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const progressData = await progressResponse.json()
      const contributionsData = await contributionsResponse.json()

      const courses = progressData.courses || []
      const contribs = contributionsData.contributions || []

      setUserProgress(courses)
      setContributions(contribs)

      // Calculate quick stats
      const totalTime = courses.reduce(
        (sum: number, c: UserProgress) => sum + (c.time_spent_mins || 0),
        0
      )
      const avgProg =
        courses.length > 0
          ? courses.reduce((sum: number, c: UserProgress) => sum + c.progress_pct, 0) /
            courses.length
          : 0

      setQuickStats({
        totalCourses: courses.length,
        totalTimeSpent: totalTime,
        avgProgress: avgProg,
        contributionsCount: contribs.length,
      })
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token, apiBaseUrl])

  useEffect(() => {
    if (!authLoading && session?.access_token) {
      fetchDashboardData()
    }
  }, [authLoading, session?.access_token, fetchDashboardData])

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

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      case "rejected":
        return <AlertCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-background relative">
        <ScrollArea className="h-screen" type="hover">
          <FullscreenButton
            isFullScreen={isFullScreen}
            onToggle={toggleFullScreen}
          />

          {/* Welcome Banner with Breadcrumb */}
          <div className="w-full bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-b">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-6 pb-8">
              {/* Breadcrumb */}
              <div className="mb-6">
                <Breadcrumb items={[{ label: "Dashboard" }]} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Track your learning progress and manage your contributions.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/learn">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Play className="w-4 h-4 mr-2" />
                      Start Learning
                    </Button>
                  </Link>
                  <Link href="/courses">
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Browse Courses
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Quick Stats */}
              {!isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <Card className="bg-white/80 dark:bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{quickStats.totalCourses}</p>
                          <p className="text-xs text-muted-foreground">Enrolled Courses</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {formatTime(quickStats.totalTimeSpent)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Time</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {quickStats.avgProgress.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Progress</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-card/80 backdrop-blur">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                          <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{quickStats.contributionsCount}</p>
                          <p className="text-xs text-muted-foreground">Contributions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
            {error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-destructive mb-8">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={fetchDashboardData}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Continue Learning Section */}
                <section className="mb-12">
                  <SectionHeader
                    title="Continue Learning"
                    description="Pick up where you left off"
                    actionHref="/courses"
                    actionText="Browse All Courses"
                  />

                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="h-40 animate-pulse bg-muted" />
                      ))}
                    </div>
                  ) : userProgress.length === 0 ? (
                    <Card className="mt-4">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Join a course to start tracking your progress
                        </p>
                        <Link href="/courses">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Browse Courses
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {userProgress.slice(0, 6).map((course) => (
                        <Card
                          key={course.course_id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base line-clamp-1">
                              {course.title}
                            </CardTitle>
                            <div className="flex flex-wrap gap-1">
                              {course.board_name && (
                                <Badge variant="outline" className="text-xs">
                                  {course.board_name}
                                </Badge>
                              )}
                              {course.subject_name && (
                                <Badge variant="secondary" className="text-xs">
                                  {course.subject_name}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="font-medium">
                                    {course.progress_pct.toFixed(0)}%
                                  </span>
                                </div>
                                <Progress value={course.progress_pct} className="h-2" />
                              </div>

                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(course.time_spent_mins)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {course.material_count} files
                                </span>
                              </div>

                              <Link href={`/learn/session/${course.course_id}`}>
                                <Button className="w-full" size="sm">
                                  <Play className="w-4 h-4 mr-2" />
                                  Continue
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                {/* My Contributions Section */}
                <section className="mb-12">
                  <SectionHeader
                    title="My Contributions"
                    description="Track the status of your uploaded materials"
                  />

                  {isLoading ? (
                    <div className="space-y-2 mt-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="h-16 animate-pulse bg-muted" />
                      ))}
                    </div>
                  ) : contributions.length === 0 ? (
                    <Card className="mt-4">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-center">
                          You haven&apos;t contributed any materials yet.
                        </p>
                        <Link href="/courses" className="mt-3">
                          <Button variant="outline" size="sm">
                            Find a course to contribute
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2 mt-4">
                      {contributions.slice(0, 5).map((contribution) => (
                        <Card key={contribution.id}>
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">
                                  {contribution.filename}
                                </p>
                                {contribution.submitted_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Submitted{" "}
                                    {new Date(contribution.submitted_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={`${getStatusColor(contribution.status)} flex items-center gap-1`}
                            >
                              {getStatusIcon(contribution.status)}
                              {contribution.status}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}
