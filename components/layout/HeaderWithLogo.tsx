"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"

interface HeaderWithLogoProps {
  children?: ReactNode
}

export function HeaderWithLogo({ children }: HeaderWithLogoProps) {
  return (
    <>
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold text-xl">LMS</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
