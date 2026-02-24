import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getPassages, savePassage, deletePassage } from '../db'
import type { Passage } from '../db/types'

export function usePassages(projectId: string | null) {
  const [passages, setPassages] = useState<Passage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setPassages([])
      setLoading(false)
      return
    }
    const data = await getPassages(projectId)
    data.sort((a, b) => a.createdAt - b.createdAt)
    setPassages(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const createPassage = useCallback(async (
    sourceId: string,
    text: string,
    themeIds: string[]
  ) => {
    if (!projectId) return
    const passage: Passage = {
      id: uuidv4(),
      sourceId,
      projectId,
      text,
      note: '',
      themeIds,
      createdAt: Date.now(),
    }
    await savePassage(passage)
    await refresh()
    return passage
  }, [projectId, refresh])

  const updatePassage = useCallback(async (id: string, updates: Partial<Pick<Passage, 'note' | 'themeIds'>>) => {
    const existing = passages.find(p => p.id === id)
    if (!existing) return
    await savePassage({ ...existing, ...updates })
    await refresh()
  }, [passages, refresh])

  const removePassage = useCallback(async (id: string) => {
    await deletePassage(id)
    await refresh()
  }, [refresh])

  const getPassagesForTheme = useCallback((themeId: string) => {
    return passages.filter(p => p.themeIds.includes(themeId))
  }, [passages])

  const getPassagesForSource = useCallback((sourceId: string) => {
    return passages.filter(p => p.sourceId === sourceId)
  }, [passages])

  return {
    passages,
    loading,
    createPassage,
    updatePassage,
    removePassage,
    getPassagesForTheme,
    getPassagesForSource,
    refresh,
  }
}
