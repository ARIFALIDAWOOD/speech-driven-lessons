"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/auth/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, UserCircle } from "lucide-react"

interface ProfileCompletionGuardProps {
  children: React.ReactNode
  redirectTo?: string
  showInline?: boolean
}

export function ProfileCompletionGuard({
  children,
  redirectTo = "/profile?complete=classification",
  showInline = false,
}: ProfileCompletionGuardProps) {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [isComplete, setIsComplete] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  useEffect(() => {
    const checkClassification = async () => {
      if (!session?.access_token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/user/classification/check`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setIsComplete(data.is_complete)
        } else {
          setIsComplete(false)
        }
      } catch (error) {
        console.error("Error checking classification:", error)
        setIsComplete(false)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      checkClassification()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  // Still loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    router.push("/login")
    return null
  }

  // Classification is complete, show children
  if (isComplete) {
    return <>{children}</>
  }

  // Classification not complete - show inline message or redirect
  if (showInline) {
    return (
      <Card className="max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            Complete Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please complete your profile by setting your State, City, Board, and Class
            to see courses tailored for you.
          </p>
          <Button
            onClick={() => router.push(redirectTo)}
            className="w-full"
          >
            <UserCircle className="w-4 h-4 mr-2" />
            Complete Profile
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Redirect to profile page
  router.push(redirectTo)
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// Hook for checking classification status
export function useClassificationStatus() {
  const { session, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<{
    isComplete: boolean | null
    classification: {
      state_id: string
      city_id: string
      board_id: string
      class_level: number
      state_name?: string
      city_name?: string
      board_name?: string
    } | null
    loading: boolean
  }>({
    isComplete: null,
    classification: null,
    loading: true,
  })

  const apiBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

  useEffect(() => {
    const fetchStatus = async () => {
      if (!session?.access_token) {
        setStatus({ isComplete: null, classification: null, loading: false })
        return
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/user/classification/check`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStatus({
            isComplete: data.is_complete,
            classification: data.classification,
            loading: false,
          })
        } else {
          setStatus({ isComplete: false, classification: null, loading: false })
        }
      } catch (error) {
        console.error("Error fetching classification status:", error)
        setStatus({ isComplete: false, classification: null, loading: false })
      }
    }

    if (!authLoading) {
      fetchStatus()
    }
  }, [session?.access_token, authLoading, apiBaseUrl])

  return status
}
