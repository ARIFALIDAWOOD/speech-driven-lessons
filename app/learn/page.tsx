"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/supabase";
import { HeaderWithLogo } from "@/components/layout/HeaderWithLogo";
import { HierarchicalSelector, CurriculumSelection } from "@/components/curriculum-selection";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, ArrowLeft } from "lucide-react";

export default function LearnPage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLearning = async (selection: CurriculumSelection) => {
    if (!user || !session?.access_token) {
      setError("Please log in to start a learning session");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const idToken = session.access_token;

      // Create a new tutor session
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}/api/tutor-session/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
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
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create learning session");
      }

      const { session_id } = await response.json();

      // Navigate to the session page
      router.push(`/learn/session/${session_id}`);
    } catch (err) {
      console.error("Error starting learning session:", err);
      setError(err instanceof Error ? err.message : "Failed to start learning session");
    } finally {
      setIsStarting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderWithLogo />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderWithLogo />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWithLogo />

      {/* Top navigation */}
      <div className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-gray-600 hover:text-gray-800 -ml-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-blue-600" />
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
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
        {iconMap[icon]}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
