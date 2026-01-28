"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CommunityCourseCard,
  CommunityCourse,
} from "@/components/courses/CommunityCourseCard"
import { CreateCourseModal } from "@/components/courses/CreateCourseModal"
import { ContributeModal } from "@/components/courses/ContributeModal"
import { CourseSubNav, CourseTab } from "@/components/courses/CourseSubNav"
import { ClassificationDisplay, ClassificationSummary } from "@/components/classification/ClassificationDisplay"
import { ProfileCompletionGuard, useClassificationStatus } from "@/components/guards/ProfileCompletionGuard"
import { Loader2, Plus, Search, BookOpen, Filter, Upload, Settings, AlertCircle } from "lucide-react"
import { useAuth } from "@/auth/supabase"
import { Breadcrumb } from "@/components/layout/Breadcrumb"
import Link from "next/link"

// Sample board data for filtering
const BOARDS = [
  { id: "all", name: "All Boards" },
  { id: "CBSE", name: "CBSE" },
  { id: "ICSE", name: "ICSE" },
  { id: "MHSB", name: "Maharashtra State Board" },
  { id: "KASB", name: "Karnataka State Board" },
  { id: "TNSB", name: "Tamil Nadu State Board" },
]

const CLASS_LEVELS = [
  { id: "all", name: "All Classes" },
  { id: "6", name: "Class 6" },
  { id: "7", name: "Class 7" },
  { id: "8", name: "Class 8" },
  { id: "9", name: "Class 9" },
  { id: "10", name: "Class 10" },
  { id: "11", name: "Class 11" },
  { id: "12", name: "Class 12" },
]

function CoursesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()
  const { isComplete, classification, loading: classificationLoading } = useClassificationStatus()

  const [isLoading, setIsLoading] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [courses, setCourses] = useState<CommunityCourse[]>([])
  const [filteredCourses, setFilteredCourses] = useState<CommunityCourse[]>([])
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const initialTab = (searchParams.get("tab") as CourseTab) || "start-new"
  const [activeTab, setActiveTab] = useState<CourseTab>(initialTab)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [boardFilter, setBoardFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [useClassificationFilters, setUseClassificationFilters] = useState(true)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false)
  const [selectedCourseForContribution, setSelectedCourseForContribution] = useState<CommunityCourse | null>(null)

  // My contributions
  const [myContributions, setMyContributions] = useState<Array<{
    id: string
    course_id: string
    filename: string
    status: string
    submitted_at: string
    contribution_type: string
  }>>([])

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  // Update URL when tab changes
  const handleTabChange = (tab: CourseTab) => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("tab", tab)
    router.replace(`/courses?${newParams.toString()}`, { scroll: false })
  }

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    if (!session?.access_token) return

    setIsLoading(true)
    setError(null)

    try {
      let url = `${apiBaseUrl}/api/community/courses?limit=100`

      // Apply classification-based filters if enabled
      if (useClassificationFilters && classification) {
        if (classification.state_id) url += `&state_id=${classification.state_id}`
        if (classification.board_id) url += `&board=${classification.board_id}`
        if (classification.class_level) url += `&class_level=${classification.class_level}`
      } else {
        // Apply manual filters
        if (boardFilter && boardFilter !== "all") {
          url += `&board=${boardFilter}`
        }
        if (classFilter && classFilter !== "all") {
          url += `&class_level=${classFilter}`
        }
      }

      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }

      const data = await response.json()
      setCourses(data.courses || [])
      setFilteredCourses(data.courses || [])
    } catch (err) {
      console.error("Error fetching courses:", err)
      setError(err instanceof Error ? err.message : "Failed to load courses")
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token, boardFilter, classFilter, searchQuery, useClassificationFilters, classification, apiBaseUrl])

  // Fetch my contributions
  const fetchMyContributions = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/community/my-contributions`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMyContributions(data.contributions || [])
      }
    } catch (err) {
      console.error("Error fetching contributions:", err)
    }
  }, [session?.access_token, apiBaseUrl])

  // Fetch on mount and when filters change
  useEffect(() => {
    if (!authLoading && session?.access_token && !classificationLoading) {
      fetchCourses()
      if (activeTab === "contribute") {
        fetchMyContributions()
      }
    }
  }, [authLoading, session?.access_token, classificationLoading, fetchCourses, fetchMyContributions, activeTab])

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

  // Check for incomplete classification
  if (!authLoading && !classificationLoading && session && !isComplete) {
    return (
      <MainLayout>
        <ProfileCompletionGuard showInline>
          <div />
        </ProfileCompletionGuard>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-background relative">
        <ScrollArea className="h-screen" type="hover">
          <FullscreenButton
            isFullScreen={isFullScreen}
            onToggle={toggleFullScreen}
          />

          {/* Breadcrumb */}
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-4">
            <Breadcrumb items={[{ label: "Courses" }]} />
          </div>

          {/* Header */}
          <div className="border-b bg-card">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Courses</h1>
                  <p className="text-muted-foreground mt-1">
                    Browse courses and contribute materials
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {classification && (
                    <div className="hidden md:block">
                      <ClassificationDisplay
                        classification={classification}
                        compact
                        showLocation={false}
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </div>
              </div>

              {/* Sub Navigation */}
              <div className="mt-4">
                <CourseSubNav activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "start-new" && (
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
              {/* Classification info and filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={boardFilter} onValueChange={(v) => { setBoardFilter(v); setUseClassificationFilters(false); }}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Board" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARDS.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setUseClassificationFilters(false); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_LEVELS.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!useClassificationFilters && classification && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBoardFilter("all")
                        setClassFilter("all")
                        setUseClassificationFilters(true)
                      }}
                    >
                      Use My Classification
                    </Button>
                  )}
                </div>
              </div>

              {/* Courses Grid */}
              {error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-destructive">
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={fetchCourses}
                  >
                    Try Again
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card
                      key={i}
                      className="h-48 animate-pulse bg-muted border-border"
                    />
                  ))}
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? "No courses found" : "No courses yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? "Try adjusting your search or filters."
                      : "Be the first to create a course!"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Course
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
                    {useClassificationFilters && classification && (
                      <span className="ml-2">
                        for <ClassificationSummary classification={classification} className="font-medium text-foreground" />
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                      <CommunityCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "contribute" && (
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contribute to a course */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Contribute to a Course
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Select a course below to upload study materials, videos, or notes.
                      </p>

                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : filteredCourses.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">
                            No courses available to contribute to yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {filteredCourses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{course.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {course.board_name} | {course.subject_name} | {course.chapter_name}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCourseForContribution(course)
                                  setIsContributeModalOpen(true)
                                }}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Contribute
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* My contributions */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">My Contributions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {myContributions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          You haven&apos;t made any contributions yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {myContributions.slice(0, 5).map((contribution) => (
                            <div
                              key={contribution.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{contribution.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {contribution.contribution_type} &bull; {new Date(contribution.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  contribution.status === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : contribution.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {contribution.status}
                              </span>
                            </div>
                          ))}
                          {myContributions.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{myContributions.length - 5} more
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Info card */}
                  <Card className="mt-4 border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Contribution Guidelines</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>&bull; Upload relevant study materials only</li>
                        <li>&bull; PDFs, images, and videos are supported</li>
                        <li>&bull; Contributions are reviewed before publishing</li>
                        <li>&bull; Earn contributor badges for approved materials</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Modals */}
      {session?.access_token && (
        <>
          <CreateCourseModal
            isOpen={isCreateModalOpen}
            onClose={() => {
              setIsCreateModalOpen(false)
              fetchCourses()
            }}
            accessToken={session.access_token}
          />

          {selectedCourseForContribution && (
            <ContributeModal
              isOpen={isContributeModalOpen}
              onClose={() => {
                setIsContributeModalOpen(false)
                setSelectedCourseForContribution(null)
                fetchMyContributions()
              }}
              courseId={selectedCourseForContribution.id}
              courseTitle={selectedCourseForContribution.title}
              accessToken={session.access_token}
              onSuccess={() => {
                fetchMyContributions()
              }}
            />
          )}
        </>
      )}
    </MainLayout>
  )
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    }>
      <CoursesPageContent />
    </Suspense>
  )
}
