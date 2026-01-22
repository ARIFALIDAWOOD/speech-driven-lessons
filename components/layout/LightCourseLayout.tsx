"use client"

import { ReactNode } from "react"

interface LightCourseLayoutProps {
  children: ReactNode
  title?: string
}

export function LightCourseLayout({ children, title }: LightCourseLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {title && (
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </header>
      )}
      {children}
    </div>
  )
}
