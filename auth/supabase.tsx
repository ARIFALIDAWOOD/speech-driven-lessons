"use client"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface AuthContextType {
  user: User | null
  session: Session | null
  userEmail: string | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: Error }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Stub auth object for signOut calls (maintains compatibility with old code)
export const auth = {
  signOut: async (): Promise<void> => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear cookies
    document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        // Set user_email cookie if user is logged in
        if (session?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Update user_email cookie based on auth state
        if (session?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        } else {
          document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return { success: false, error: new Error(error.message) }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      }
    }
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Clear cookies
    document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }, [supabase.auth])

  const value: AuthContextType = {
    user,
    session,
    userEmail: user?.email ?? null,
    loading,
    signInWithMagicLink,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook that requires AuthProvider context
function useAuthWithProvider(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Standalone useAuth hook that works without provider (for login page)
export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(session.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        } else {
          document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return { success: false, error: new Error(error.message) }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      }
    }
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }, [supabase.auth])

  return {
    user,
    session,
    userEmail: user?.email ?? null,
    loading,
    signInWithMagicLink,
    signOut,
  }
}
