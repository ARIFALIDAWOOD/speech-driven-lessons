"use client";

/**
 * useTokenRefresh Hook
 *
 * Proactively refreshes Supabase JWT tokens before expiration to prevent
 * token expiry during long-running SSE connections.
 *
 * Features:
 * - Automatically schedules refresh 5 minutes before token expiration
 * - Provides getValidToken() function for API calls
 * - Returns current token state and refresh status
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface TokenState {
  accessToken: string | null;
  expiresAt: number | null;
  isRefreshing: boolean;
  lastRefreshError: string | null;
}

interface UseTokenRefreshReturn extends TokenState {
  /**
   * Get a valid access token, refreshing if needed.
   * Use this before making API calls or establishing SSE connections.
   */
  getValidToken: () => Promise<string | null>;
  /**
   * Force an immediate token refresh.
   */
  forceRefresh: () => Promise<boolean>;
}

// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function useTokenRefresh(): UseTokenRefreshReturn {
  const supabase = createClient();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const [state, setState] = useState<TokenState>({
    accessToken: null,
    expiresAt: null,
    isRefreshing: false,
    lastRefreshError: null,
  });

  /**
   * Perform the actual token refresh
   */
  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true, lastRefreshError: null }));

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("[useTokenRefresh] Refresh failed:", error.message);
        setState((prev) => ({
          ...prev,
          isRefreshing: false,
          lastRefreshError: error.message,
        }));
        return false;
      }

      if (data.session) {
        const expiresAt = data.session.expires_at
          ? data.session.expires_at * 1000
          : null;

        setState({
          accessToken: data.session.access_token,
          expiresAt,
          isRefreshing: false,
          lastRefreshError: null,
        });

        console.log(
          "[useTokenRefresh] Token refreshed, expires at:",
          expiresAt ? new Date(expiresAt).toISOString() : "unknown"
        );

        return true;
      }

      return false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[useTokenRefresh] Refresh error:", errorMsg);
      setState((prev) => ({
        ...prev,
        isRefreshing: false,
        lastRefreshError: errorMsg,
      }));
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [supabase.auth]);

  /**
   * Schedule the next refresh based on token expiry time
   */
  const scheduleRefresh = useCallback(
    (expiresAt: number | null) => {
      // Clear any existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      if (!expiresAt) return;

      const refreshAt = expiresAt - REFRESH_BUFFER_MS;
      const timeout = refreshAt - Date.now();

      if (timeout > 0) {
        console.log(
          "[useTokenRefresh] Scheduling refresh in",
          Math.round(timeout / 1000),
          "seconds"
        );
        refreshTimerRef.current = setTimeout(() => {
          doRefresh();
        }, timeout);
      } else if (timeout > -REFRESH_BUFFER_MS) {
        // Token is about to expire or just expired, refresh immediately
        console.log("[useTokenRefresh] Token expiring soon, refreshing now");
        doRefresh();
      }
    },
    [doRefresh]
  );

  /**
   * Get a valid token, refreshing if necessary
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.warn("[useTokenRefresh] No session available");
      return null;
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    const now = Date.now();

    // Check if token expires within the buffer period
    if (expiresAt && now > expiresAt - REFRESH_BUFFER_MS) {
      console.log("[useTokenRefresh] Token expiring soon, refreshing before use");
      const success = await doRefresh();
      if (success && state.accessToken) {
        return state.accessToken;
      }
      // Try to get the refreshed session
      const {
        data: { session: newSession },
      } = await supabase.auth.getSession();
      return newSession?.access_token || null;
    }

    return session.access_token;
  }, [supabase.auth, doRefresh, state.accessToken]);

  /**
   * Force an immediate refresh
   */
  const forceRefresh = useCallback(async (): Promise<boolean> => {
    return doRefresh();
  }, [doRefresh]);

  // Initialize state from current session
  useEffect(() => {
    const initializeToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;

        setState({
          accessToken: session.access_token,
          expiresAt,
          isRefreshing: false,
          lastRefreshError: null,
        });

        scheduleRefresh(expiresAt);
      }
    };

    initializeToken();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;

        setState({
          accessToken: session.access_token,
          expiresAt,
          isRefreshing: false,
          lastRefreshError: null,
        });

        scheduleRefresh(expiresAt);
      } else {
        setState({
          accessToken: null,
          expiresAt: null,
          isRefreshing: false,
          lastRefreshError: null,
        });

        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [supabase.auth, scheduleRefresh]);

  return {
    ...state,
    getValidToken,
    forceRefresh,
  };
}
