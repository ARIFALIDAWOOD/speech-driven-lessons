"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Learn page redirect - redirects to the unified Courses page.
 * The /learn route is kept for backwards compatibility and to preserve
 * the /learn/session/[id] routes for active learning sessions.
 */
export default function LearnPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/courses?tab=start-new")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to Courses...</p>
      </div>
    </div>
  )
}
