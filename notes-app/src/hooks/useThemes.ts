import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getThemes, saveTheme, deleteTheme } from '../db'
import type { Theme } from '../db/types'

const THEME_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
]

export function useThemes(projectId: string | null) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setThemes([])
      setLoading(false)
      return
    }
    const data = await getThemes(projectId)
    data.sort((a, b) => a.createdAt - b.createdAt)
    setThemes(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const createTheme = useCallback(async (name: string, description = '') => {
    if (!projectId) return
    const color = THEME_COLORS[themes.length % THEME_COLORS.length]
    const theme: Theme = {
      id: uuidv4(),
      projectId,
      name,
      color,
      description,
      createdAt: Date.now(),
    }
    await saveTheme(theme)
    await refresh()
    return theme
  }, [projectId, themes.length, refresh])

  const updateTheme = useCallback(async (id: string, updates: Partial<Pick<Theme, 'name' | 'description' | 'color'>>) => {
    const all = await getThemes(projectId || '')
    const existing = all.find(t => t.id === id)
    if (!existing) return
    await saveTheme({ ...existing, ...updates })
    await refresh()
  }, [projectId, refresh])

  const removeTheme = useCallback(async (id: string) => {
    await deleteTheme(id)
    await refresh()
  }, [refresh])

  return { themes, loading, createTheme, updateTheme, removeTheme, refresh }
}
