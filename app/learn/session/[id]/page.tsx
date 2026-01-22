"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/auth/supabase";
import { TutorSessionLayout } from "./components/TutorSessionLayout";
import { Loader2 } from "lucide-react";

export default function TutorSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();

  const sessionId = params.id as string;

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !session?.access_token) {
    router.push("/auth/signin");
    return null;
  }

  // No session ID
  if (!sessionId) {
    router.push("/learn");
    return null;
  }

  return (
    <TutorSessionLayout
      sessionId={sessionId}
      accessToken={session.access_token}
    />
  );
}
