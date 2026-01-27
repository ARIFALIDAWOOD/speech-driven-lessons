"use client"

import { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CustomizeCourseModal } from "@/components/my-uploads/create-course-modal-v2"
import { MyCoursesHeader } from "@/components/my-uploads/my-courses-section-header"
import { CourseCard } from "@/components/my-uploads/CourseCard"
import { FullscreenButton } from "@/components/layout/fullscreen-button"
import { useAuth } from "@/auth/supabase"
import { Loader2 } from "lucide-react"

interface Course {
  id: string | number;
  title: string;
  hoursCompleted?: number;
  enrolled?: number;
  views?: number;
  isPublished?: boolean;
  description?: string;
  create_course_process?: {
    current_step?: number;
    is_creation_complete?: boolean;
  };
}

export default function CoursesPage() {
  const { session, loading: authLoading } = useAuth()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch courses from backend
  const fetchCourses = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const apiUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/course/courses`
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data = await response.json()

      // Transform backend data to match expected CourseCard format
      const transformedCourses: Course[] = [
        ...(data.complete_courses || []).map((c: any) => ({
          id: c.course_id || c.id,
          title: c.title || "Untitled Course",
          hoursCompleted: c.hours_completed || 0,
          enrolled: c.enrolled || 0,
          views: c.views || 0,
          isPublished: c.is_published ?? true,
          description: c.description,
        })),
        ...(data.incomplete_courses || []).map((c: any) => ({
          id: c.course_id || c.id,
          title: c.title || "Untitled Course",
          hoursCompleted: c.hours_completed || 0,
          enrolled: c.enrolled || 0,
          views: c.views || 0,
          isPublished: false,
          description: c.description,
          create_course_process: c.create_course_process,
        })),
      ]

      setCourses(transformedCourses)
    } catch (err) {
      console.error("Error fetching courses:", err)
      
      // Provide more specific error messages
      let errorMessage = "Failed to fetch courses"
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
        errorMessage = `Cannot connect to backend server at ${apiUrl}. Please ensure the backend server is running.`
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Only fetch if we have a session with an access token
    if (session?.access_token) {
      fetchCourses()
    } else {
      // No session available, stop loading
      setIsLoading(false)
    }
  }, [session, authLoading, fetchCourses])

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-16 sm:pt-20 pb-8">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <MyCoursesHeader
                  title="My Uploads"
                  description="Customize and upload your own courses"
                />
              </div>
              <div className="pt-2">
                <FullscreenButton
                  isFullScreen={isFullScreen}
                  onToggle={toggleFullScreen}
                />
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={fetchCourses}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading courses...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-6">
                <CustomizeCourseModal />
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
                {courses.length === 0 && !error && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <p>No courses yet. Create your first course to get started.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}
