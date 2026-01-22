/**
 * API endpoints for in-class course functionality
 */

const API_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export interface Slide {
  id: number;
  title: string;
  content?: string;
  slide_markdown?: string;
  transcript?: string;
  preview?: string;
}

export async function fetchCourseSlides(courseId: string): Promise<Slide[]> {
  try {
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/slides`);
    if (!response.ok) {
      throw new Error(`Failed to fetch slides: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching course slides:", error);
    throw error;
  }
}

export async function saveCourseProgress(
  courseId: string,
  slideIndex: number
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/courses/${courseId}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slideIndex }),
    });
  } catch (error) {
    console.error("Error saving course progress:", error);
  }
}
