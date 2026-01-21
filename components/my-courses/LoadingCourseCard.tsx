"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function LoadingCourseCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-2 bg-gray-200 rounded-full mt-4"></div>
        </div>
      </CardContent>
    </Card>
  )
}
