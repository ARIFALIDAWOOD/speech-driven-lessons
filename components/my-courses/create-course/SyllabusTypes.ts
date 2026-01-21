export interface Section {
  id: string
  title: string
  content: string
  order: number
}

export interface Syllabus {
  sections: Section[]
}
