"use client"

import { Section, CourseSlide } from './types'

interface SyllabusTabProps {
  syllabus: Section[]
  onSyllabusChange: (syllabus: Section[]) => void
  slides: CourseSlide[]
  onPreviewSlide: (topicId: string, subtopicId: string) => void
  courseId: string
}

export function SyllabusTab({
  syllabus,
  onSyllabusChange,
  slides,
  onPreviewSlide,
  courseId
}: SyllabusTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Course Syllabus</h2>
      
      {syllabus.length === 0 ? (
        <p className="text-gray-500">No syllabus available</p>
      ) : (
        <div className="space-y-4">
          {syllabus.map((section) => (
            <div key={section.id} className="border rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
              {section.topics.map((topic) => (
                <div key={topic.id} className="ml-4 mb-2">
                  <h4 className="text-lg font-medium mb-1">{topic.title}</h4>
                  {topic.subtopics.map((subtopic) => (
                    <div key={subtopic.id} className="ml-4">
                      <button
                        onClick={() => onPreviewSlide(topic.id, subtopic.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {subtopic.title}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
