import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Project, Source, Theme, Passage, Draft } from './types'

interface ResearchNotesDB extends DBSchema {
  projects: {
    key: string
    value: Project
    indexes: { 'by-createdAt': number }
  }
  sources: {
    key: string
    value: Source
    indexes: { 'by-projectId': string; 'by-createdAt': number }
  }
  themes: {
    key: string
    value: Theme
    indexes: { 'by-projectId': string; 'by-createdAt': number }
  }
  passages: {
    key: string
    value: Passage
    indexes: { 'by-projectId': string; 'by-sourceId': string; 'by-createdAt': number }
  }
  drafts: {
    key: string
    value: Draft
    indexes: { 'by-projectId': string }
  }
}

let db: IDBPDatabase<ResearchNotesDB>

export async function getDb(): Promise<IDBPDatabase<ResearchNotesDB>> {
  if (db) return db
  db = await openDB<ResearchNotesDB>('research-notes', 1, {
    upgrade(database) {
      const projects = database.createObjectStore('projects', { keyPath: 'id' })
      projects.createIndex('by-createdAt', 'createdAt')

      const sources = database.createObjectStore('sources', { keyPath: 'id' })
      sources.createIndex('by-projectId', 'projectId')
      sources.createIndex('by-createdAt', 'createdAt')

      const themes = database.createObjectStore('themes', { keyPath: 'id' })
      themes.createIndex('by-projectId', 'projectId')
      themes.createIndex('by-createdAt', 'createdAt')

      const passages = database.createObjectStore('passages', { keyPath: 'id' })
      passages.createIndex('by-projectId', 'projectId')
      passages.createIndex('by-sourceId', 'sourceId')
      passages.createIndex('by-createdAt', 'createdAt')

      const drafts = database.createObjectStore('drafts', { keyPath: 'id' })
      drafts.createIndex('by-projectId', 'projectId')
    },
  })
  return db
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const database = await getDb()
  return database.getAll('projects')
}

export async function saveProject(project: Project): Promise<void> {
  const database = await getDb()
  await database.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
  const database = await getDb()
  const tx = database.transaction(['projects', 'sources', 'themes', 'passages', 'drafts'], 'readwrite')
  await tx.objectStore('projects').delete(id)
  const sources = await tx.objectStore('sources').index('by-projectId').getAll(id)
  for (const s of sources) {
    await tx.objectStore('sources').delete(s.id)
    const passages = await tx.objectStore('passages').index('by-sourceId').getAll(s.id)
    for (const p of passages) await tx.objectStore('passages').delete(p.id)
  }
  const themes = await tx.objectStore('themes').index('by-projectId').getAll(id)
  for (const t of themes) await tx.objectStore('themes').delete(t.id)
  const drafts = await tx.objectStore('drafts').index('by-projectId').getAll(id)
  for (const d of drafts) await tx.objectStore('drafts').delete(d.id)
  await tx.done
}

// Sources
export async function getSources(projectId: string): Promise<Source[]> {
  const database = await getDb()
  return database.getAllFromIndex('sources', 'by-projectId', projectId)
}

export async function saveSource(source: Source): Promise<void> {
  const database = await getDb()
  await database.put('sources', source)
}

export async function deleteSource(id: string): Promise<void> {
  const database = await getDb()
  const tx = database.transaction(['sources', 'passages'], 'readwrite')
  await tx.objectStore('sources').delete(id)
  const passages = await tx.objectStore('passages').index('by-sourceId').getAll(id)
  for (const p of passages) await tx.objectStore('passages').delete(p.id)
  await tx.done
}

// Themes
export async function getThemes(projectId: string): Promise<Theme[]> {
  const database = await getDb()
  return database.getAllFromIndex('themes', 'by-projectId', projectId)
}

export async function saveTheme(theme: Theme): Promise<void> {
  const database = await getDb()
  await database.put('themes', theme)
}

export async function deleteTheme(id: string): Promise<void> {
  const database = await getDb()
  const tx = database.transaction(['themes', 'passages'], 'readwrite')
  await tx.objectStore('themes').delete(id)
  const allPassages = await tx.objectStore('passages').getAll()
  for (const p of allPassages) {
    if (p.themeIds.includes(id)) {
      p.themeIds = p.themeIds.filter(tid => tid !== id)
      await tx.objectStore('passages').put(p)
    }
  }
  await tx.done
}

// Passages
export async function getPassages(projectId: string): Promise<Passage[]> {
  const database = await getDb()
  return database.getAllFromIndex('passages', 'by-projectId', projectId)
}

export async function savePassage(passage: Passage): Promise<void> {
  const database = await getDb()
  await database.put('passages', passage)
}

export async function deletePassage(id: string): Promise<void> {
  const database = await getDb()
  await database.delete('passages', id)
}

// Drafts
export async function getDraft(projectId: string): Promise<Draft | undefined> {
  const database = await getDb()
  const drafts = await database.getAllFromIndex('drafts', 'by-projectId', projectId)
  return drafts[0]
}

export async function saveDraft(draft: Draft): Promise<void> {
  const database = await getDb()
  await database.put('drafts', draft)
}

// Export/Import
export async function exportProject(projectId: string): Promise<object> {
  const database = await getDb()
  const project = await database.get('projects', projectId)
  const sources = await database.getAllFromIndex('sources', 'by-projectId', projectId)
  const themes = await database.getAllFromIndex('themes', 'by-projectId', projectId)
  const passages = await database.getAllFromIndex('passages', 'by-projectId', projectId)
  const drafts = await database.getAllFromIndex('drafts', 'by-projectId', projectId)
  return { project, sources, themes, passages, drafts }
}

export async function importProject(data: {
  project: Project
  sources: Source[]
  themes: Theme[]
  passages: Passage[]
  drafts: Draft[]
}): Promise<void> {
  const database = await getDb()
  const tx = database.transaction(['projects', 'sources', 'themes', 'passages', 'drafts'], 'readwrite')
  await tx.objectStore('projects').put(data.project)
  for (const s of data.sources) await tx.objectStore('sources').put(s)
  for (const t of data.themes) await tx.objectStore('themes').put(t)
  for (const p of data.passages) await tx.objectStore('passages').put(p)
  for (const d of data.drafts) await tx.objectStore('drafts').put(d)
  await tx.done
}
