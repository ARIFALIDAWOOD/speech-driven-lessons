export interface CourseSlide {
  id: string
  topicId: string
  subtopicId: string
  title: string
  content: string
}

export interface Section {
  id: string
  title: string
  topics: Array<{
    id: string
    title: string
    subtopics: Array<{
      id: string
      title: string
    }>
  }>
}

export interface CourseData {
  id: string
  title: string
  description?: string
  instructor?: string
  aiVoice?: string
  syllabus: Section[]
  slides: CourseSlide[]
  files?: Array<{
    id: string
    name: string
    size: string
    type: string
  }>
}
