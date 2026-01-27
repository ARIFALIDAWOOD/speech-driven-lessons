"use client"

import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react"
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
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Set up auth state change listener BEFORE checking initial session
    // This ensures we catch auth events from URL fragments (magic links)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log("[AuthProvider] Auth state changed:", event, currentSession?.user?.email)

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        // Update user_email cookie based on auth state
        if (currentSession?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(currentSession.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        } else {
          document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }

        setLoading(false)
      }
    )

    // Get initial auth state - try getSession first (reads from cookies/storage)
    // then validate with getUser if session exists
    const initializeAuth = async () => {
      try {
        // First check for existing session in cookies/storage
        const { data: { session: existingSession } } = await supabase.auth.getSession()

        if (existingSession?.user) {
          console.log("[AuthProvider] Session found from storage:", existingSession.user.email)
          setSession(existingSession)
          setUser(existingSession.user)

          // Set user_email cookie if user is logged in
          if (existingSession.user.email) {
            document.cookie = `user_email=${encodeURIComponent(existingSession.user.email)}; Path=/; SameSite=Lax; max-age=86400`
          }
        } else {
          // No session in storage, try getUser to check with server
          const { data: { user }, error } = await supabase.auth.getUser()

          if (error) {
            console.log("[AuthProvider] No session found (expected if not logged in)")
            setUser(null)
            setSession(null)
          } else if (user) {
            console.log("[AuthProvider] User found via getUser:", user.email)
            // Refresh session object
            const { data: { session } } = await supabase.auth.getSession()
            setUser(user)
            setSession(session)

            if (user.email) {
              document.cookie = `user_email=${encodeURIComponent(user.email)}; Path=/; SameSite=Lax; max-age=86400`
            }
          } else {
            setUser(null)
            setSession(null)
          }
        }
      } catch (error) {
        console.error("[AuthProvider] Error during initialization:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

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

// Single useAuth hook that uses context when available, otherwise creates standalone state
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  // If we have context, use it
  if (context) {
    return context
  }

  // Fallback for components outside AuthProvider (like login page)
  // This is a simplified version - the full logic is in AuthProvider
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Set up listener first to catch URL-based auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log("[useAuth standalone] Auth state changed:", event, currentSession?.user?.email)

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user?.email) {
          document.cookie = `user_email=${encodeURIComponent(currentSession.user.email)}; Path=/; SameSite=Lax; max-age=86400`
        } else {
          document.cookie = "user_email=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }

        setLoading(false)
      }
    )

    const initializeAuth = async () => {
      try {
        // First check for existing session in cookies/storage
        const { data: { session: existingSession } } = await supabase.auth.getSession()

        if (existingSession?.user) {
          console.log("[useAuth standalone] Session found from storage:", existingSession.user.email)
          setSession(existingSession)
          setUser(existingSession.user)

          if (existingSession.user.email) {
            document.cookie = `user_email=${encodeURIComponent(existingSession.user.email)}; Path=/; SameSite=Lax; max-age=86400`
          }
        } else {
          // No session in storage, try getUser to check with server
          const { data: { user }, error } = await supabase.auth.getUser()

          if (error) {
            console.log("[useAuth standalone] No session found (expected if not logged in)")
            setUser(null)
            setSession(null)
          } else if (user) {
            console.log("[useAuth standalone] User found via getUser:", user.email)
            const { data: { session } } = await supabase.auth.getSession()
            setUser(user)
            setSession(session)

            if (user.email) {
              document.cookie = `user_email=${encodeURIComponent(user.email)}; Path=/; SameSite=Lax; max-age=86400`
            }
          } else {
            setUser(null)
            setSession(null)
          }
        }
      } catch (error) {
        console.error("[useAuth standalone] Error during initialization:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

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
