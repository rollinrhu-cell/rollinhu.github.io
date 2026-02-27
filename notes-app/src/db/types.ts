export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
}

export type SourceType = 'text' | 'url' | 'pdf' | 'docx' | 'note'

export interface Source {
  id: string
  projectId: string
  type: SourceType
  title: string
  content: string
  url?: string
  author?: string
  publishedDate?: string
  readAt?: number
  createdAt: number
}

export interface Theme {
  id: string
  projectId: string
  name: string
  color: string
  description: string
  createdAt: number
}

export interface Passage {
  id: string
  sourceId: string
  projectId: string
  text: string
  note: string
  themeIds: string[]
  createdAt: number
}

export interface Draft {
  id: string
  projectId: string
  title: string
  content: string
  updatedAt: number
}
