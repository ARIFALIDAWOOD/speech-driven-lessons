"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlideProps {
  title: string
  content: string
  index?: number
  isActive?: boolean
  onClick?: () => void
}

export function Slide({ title, content, index, isActive = false, onClick }: SlideProps) {
  return (
    <Card
      className={`mb-4 cursor-pointer transition-all ${
        isActive ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  )
}
