import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getProjects, saveProject, deleteProject } from '../db'
import type { Project } from '../db/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await getProjects()
    data.sort((a, b) => b.createdAt - a.createdAt)
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createProject = useCallback(async (name: string, description = '') => {
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
    }
    await saveProject(project)
    await refresh()
    return project
  }, [refresh])

  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => {
    const all = await getProjects()
    const existing = all.find(p => p.id === id)
    if (!existing) return
    await saveProject({ ...existing, ...updates })
    await refresh()
  }, [refresh])

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id)
    await refresh()
  }, [refresh])

  return { projects, loading, createProject, updateProject, removeProject, refresh }
}
