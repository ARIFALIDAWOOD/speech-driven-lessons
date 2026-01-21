"use client"

import { ReactNode } from "react"

interface HeaderOnlyLayoutProps {
  children: ReactNode
}

export function HeaderOnlyLayout({ children }: HeaderOnlyLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
