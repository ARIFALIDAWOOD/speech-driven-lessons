"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Section } from "./SyllabusTypes"
import { useState } from "react"

interface ReviewSyllabusStepProps {
  syllabus: Section[]
  setSyllabus: (syllabus: Section[]) => void
}

export function ReviewSyllabusStep({ syllabus, setSyllabus }: ReviewSyllabusStepProps) {
  const [expandedSections, setExpandedSections] = useState<number[]>([])

  const toggleSection = (index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Syllabus</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {syllabus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No syllabus generated yet. Please upload files first.
            </p>
          ) : (
            syllabus.map((section, index) => (
              <Card key={section.id || index} className="border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSection(index)}
                    >
                      {expandedSections.includes(index) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expandedSections.includes(index) && (
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
