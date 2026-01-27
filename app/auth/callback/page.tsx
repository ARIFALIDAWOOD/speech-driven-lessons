"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("Completing sign in...")
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Prevent double processing in React StrictMode
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleCallback = async () => {
      const supabase = createClient()
      const code = searchParams.get("code")
      const next = searchParams.get("next") ?? "/welcome"

      if (code) {
        try {
          setStatus("Exchanging authorization code...")

          // Exchange code for session - this happens in browser context
          // where the PKCE code_verifier from localStorage is accessible
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error("Error exchanging code for session:", exchangeError)
            setError(exchangeError.message)
            setTimeout(() => {
              window.location.href = "/login?error=auth_callback_error"
            }, 2000)
            return
          }

          console.log("[AuthCallback] Code exchange successful, session:", data.session?.user?.email)

          if (data.session?.user?.email) {
            // Set user_email cookie for backend compatibility
            document.cookie = `user_email=${encodeURIComponent(data.session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
          }

          setStatus("Redirecting...")

          // Use hard navigation to ensure cookies are sent with the request
          // This is necessary because the middleware checks auth server-side
          window.location.href = next
        } catch (err) {
          console.error("Unexpected error during auth callback:", err)
          setError("An unexpected error occurred")
          setTimeout(() => {
            window.location.href = "/login?error=auth_callback_error"
          }, 2000)
        }
      } else {
        // No code in URL - check if we have a session from URL hash (for implicit flow)
        // Supabase client automatically handles hash-based tokens
        setStatus("Checking session...")

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          setError(sessionError.message)
          setTimeout(() => {
            window.location.href = "/login?error=auth_callback_error"
          }, 2000)
          return
        }

        if (session?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
          window.location.href = searchParams.get("next") ?? "/welcome"
        } else {
          // No code and no session - redirect to login
          window.location.href = "/login?error=auth_callback_error"
        }
      }
    }

    handleCallback()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
              <p className="text-red-600">{error}</p>
              <p className="text-red-500 text-sm mt-2">Redirecting to login...</p>
            </div>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A9E7E] mx-auto"></div>
            <p className="mt-4 text-[#5D745F]">{status}</p>
          </>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A9E7E] mx-auto"></div>
        <p className="mt-4 text-[#5D745F]">Loading...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
