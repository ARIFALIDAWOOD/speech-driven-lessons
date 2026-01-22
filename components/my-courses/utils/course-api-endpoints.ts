export interface Course {
  id: string
  title: string
  description?: string
  progress?: number
  aiTutor?: boolean
  startDate?: string
  endDate?: string
  status?: "draft" | "published"
}

export interface CourseInfo {
  id?: string
  course_title?: string
  title?: string
  description?: string
  ai_voice?: string
  uploadedFiles?: { name: string; size: number }[]
  create_course_process?: {
    current_step?: number
    is_creation_complete?: boolean
  }
}

export interface CoursesAndDraftsResponse {
  courses: Course[]
  drafts: Course[]
}

export async function fetchCoursesAndDrafts(idToken: string): Promise<CoursesAndDraftsResponse> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Fetching courses and drafts", { hasToken: Boolean(idToken) })
    return { courses: [], drafts: [] }
  } catch (error) {
    console.error("Error fetching courses:", error)
    return { courses: [], drafts: [] }
  }
}

export async function createOrUpdateCourseMetadata(
  idToken: string,
  courseData: Partial<CourseInfo>
): Promise<CourseInfo | null> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Creating/updating course metadata", courseData)
    return null
  } catch (error) {
    console.error("Error creating/updating course:", error)
    return null
  }
}

export async function uploadCourseFile(
  idToken: string,
  courseId: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Uploading course file", courseId, file.name)
    return { success: true }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function deleteCourseFile(
  idToken: string,
  courseId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Deleting course file", courseId, fileName)
    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

  if (file.size > maxSize) {
    return { valid: false, error: "File size exceeds 100MB limit" }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Please upload PDF, DOC, DOCX, or TXT files." }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

export async function deleteCourse(
  idToken: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Deleting course", courseId)
    return { success: true }
  } catch (error) {
    console.error("Error deleting course:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function processCourseContent(
  idToken: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Processing course content", courseId)
    return { success: true }
  } catch (error) {
    console.error("Error processing content:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function generateCourseSyllabus(
  idToken: string,
  courseId: string
): Promise<{ success: boolean; sections?: any[]; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Generating course syllabus", courseId)
    return { success: true, sections: [] }
  } catch (error) {
    console.error("Error generating syllabus:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function retrieveCourseSyllabus(
  idToken: string,
  courseId: string
): Promise<{ success: boolean; sections?: any[]; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Retrieving course syllabus", courseId)
    return { success: true, sections: [] }
  } catch (error) {
    console.error("Error retrieving syllabus:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchCourseById(
  idToken: string,
  courseId: string
): Promise<CourseInfo | null> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Fetching course by ID", courseId)
    return null
  } catch (error) {
    console.error("Error fetching course:", error)
    return null
  }
}

export async function autoSaveCourseContent(
  idToken: string,
  courseData: Partial<CourseInfo>
): Promise<CourseInfo | null> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Auto-saving course content", courseData)
    return null
  } catch (error) {
    console.error("Error auto-saving:", error)
    return null
  }
}

export async function updateCourseStep(
  idToken: string,
  courseId: string,
  stepNumber: number,
  isComplete: boolean = false
): Promise<CourseInfo | null> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Updating course step", courseId, stepNumber, isComplete)
    return null
  } catch (error) {
    console.error("Error updating step:", error)
    return null
  }
}

export async function fetchCourseSyllabusFromS3(
  idToken: string,
  courseId: string
): Promise<{ success: boolean; sections?: any[]; error?: string }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Fetching syllabus from S3", courseId)
    return { success: true, sections: [] }
  } catch (error) {
    console.error("Error fetching syllabus from S3:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ----- Detail-page specific helpers (temporary stubs) -----

// Fetch a single course's full details for the detail view page
export async function fetchCourseDetails(
  idToken: string,
  courseId: string
): Promise<any> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Fetching course details", { hasToken: Boolean(idToken), courseId })

    // Minimal placeholder shape expected by the detail page
    return {
      id: courseId,
      title: "Sample course",
      instructor: "Instructor",
      aiVoice: "female1",
      description: "This is a placeholder course description.",
      syllabus: [],
      slides: [],
      files: [],
    }
  } catch (error) {
    console.error("Error fetching course details:", error)
    throw error
  }
}

// Update course metadata from the detail page (title/description/voice etc.)
export async function updateCourseDetails(
  idToken: string,
  courseId: string,
  data: Partial<CourseInfo>
): Promise<void> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Updating course details", { hasToken: Boolean(idToken), courseId, data })
  } catch (error) {
    console.error("Error updating course details:", error)
    throw error
  }
}

// Fetch generated slides for a course (used in the Slides tab)
export async function retrieveCourseSlides(
  idToken: string,
  courseId: string
): Promise<{ slides: any[] }> {
  try {
    // TODO: Implement actual API endpoint call
    console.log("Retrieving course slides", { hasToken: Boolean(idToken), courseId })
    return { slides: [] }
  } catch (error) {
    console.error("Error retrieving course slides:", error)
    return { slides: [] }
  }
}

// Store new course data
export async function storeNewCourseData(
  idTokenOrData: string | any,
  courseData?: any
): Promise<{ success: boolean; courseId?: string; error?: string }> {
  try {
    // Support both (data) and (idToken, data) signatures
    const data = courseData ?? idTokenOrData;
    console.log("Storing new course data", data)
    return { success: true, courseId: `course_${Date.now()}` }
  } catch (error) {
    console.error("Error storing course data:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Flag a course as being created
export async function flagCourseBeingCreated(
  idTokenOrData: string | any,
  courseIdOrIsCreating?: string | boolean,
  isCreating?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Support both (data) and (idToken, courseId, isCreating) signatures
    console.log("Flagging course creation status", { idTokenOrData, courseIdOrIsCreating, isCreating })
    return { success: true }
  } catch (error) {
    console.error("Error flagging course:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Format course data for submission
export function formatCourseForSubmission(courseData: any, syllabus?: any[], textAmount?: string): any {
  return {
    title: courseData.title || "",
    description: courseData.description || "",
    ai_voice: courseData.aiVoice || "jennifer",
    files: courseData.files || [],
    syllabus: syllabus || courseData.syllabus || [],
    textAmount: textAmount || "medium",
    ...courseData,
  }
}
