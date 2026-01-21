"use client"

import { ReactNode } from "react"

interface LightCourseLayoutProps {
  children: ReactNode
}

export function LightCourseLayout({ children }: LightCourseLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
