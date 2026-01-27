"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/supabase";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { HierarchicalSelector, CurriculumSelection } from "@/components/curriculum-selection";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap } from "lucide-react";

export default function LearnPage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLearning = async (selection: CurriculumSelection, courseId?: string | null) => {
    if (!user || !session?.access_token) {
      setError("Please log in to start a learning session");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const idToken = session.access_token;

      // Build request body based on whether custom mode is used
      const requestBody = selection.isCustomMode
        ? {
            // Custom mode: use manually entered values
            selection_state: "CUSTOM",
            selection_city: "CUSTOM",
            selection_board: selection.customBoard,
            selection_subject: selection.customSubject,
            selection_chapter: selection.customChapter,
            selection_topic: selection.topic || null,
            // Names are same as IDs for custom mode
            state_name: "Custom",
            city_name: "Custom",
            board_name: selection.customBoard,
            subject_name: selection.customSubject,
            chapter_name: selection.customChapter,
            // Include course_id if selected
            course_id: courseId || null,
          }
        : {
            // Standard mode: use dropdown selections
            selection_state: selection.state?.id,
            selection_city: selection.city?.id,
            selection_board: selection.board?.id,
            selection_subject: selection.subject?.id,
            selection_chapter: selection.chapter?.id,
            selection_topic: selection.topic || null,
            // Include names for display purposes
            state_name: selection.state?.name,
            city_name: selection.city?.name,
            board_name: selection.board?.name,
            subject_name: selection.subject?.name,
            chapter_name: selection.chapter?.name,
            // Include course_id if selected
            course_id: courseId || null,
          };

      // Create a new tutor session
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, use the text as error message
        }
        throw new Error(errorData.message || `Failed to create learning session: ${response.status} ${response.statusText}`);
      }

      const { session_id } = await response.json();

      // Navigate to the session page
      router.push(`/learn/session/${session_id}`);
    } catch (err) {
      console.error("Error starting learning session:", err);
      
      // Provide more specific error messages
      let errorMessage = "Failed to start learning session";
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        errorMessage = `Cannot connect to backend server at ${apiUrl}. Please ensure the backend server is running.`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb items={[{ label: "Start Learning" }]} className="mb-8" />
          <div className="max-w-2xl mx-auto text-center py-8">
            <GraduationCap className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sign in to Start Learning
            </h1>
            <p className="text-gray-600 mb-6">
              Create an account or sign in to access personalized tutoring sessions.
            </p>
            <Button onClick={() => router.push("/auth/signin")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <Breadcrumb items={[{ label: "Start Learning" }]} className="mb-6" />

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
            Start Learning
          </h1>
          <p className="mt-2 text-gray-600">
            Select your curriculum and chapter to begin an interactive tutoring session.
            Our AI tutor will guide you through the material at your own pace.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Hierarchical selector */}
        <HierarchicalSelector
          onStartLearning={handleStartLearning}
          isStarting={isStarting}
          accessToken={session?.access_token}
        />

        {/* Features overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Adaptive Assessment"
            description="The AI gauges your current understanding before teaching, personalizing the lesson to your level."
            icon="assessment"
          />
          <FeatureCard
            title="Interactive Lessons"
            description="Engage with examples, practice problems, and explanations tailored to your learning style."
            icon="lesson"
          />
          <FeatureCard
            title="Flexible Pacing"
            description="Learn at your own speed with suggested breaks and the ability to pause anytime."
            icon="pace"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    assessment: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    lesson: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    pace: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
        {iconMap[icon]}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
