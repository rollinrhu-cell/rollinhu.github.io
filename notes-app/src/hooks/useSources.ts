import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getSources, saveSource, deleteSource } from '../db'
import type { Source, SourceType } from '../db/types'

export function useSources(projectId: string | null) {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSources([])
      setLoading(false)
      return
    }
    const data = await getSources(projectId)
    data.sort((a, b) => b.createdAt - a.createdAt)
    setSources(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const createSource = useCallback(async (
    title: string,
    content: string,
    type: SourceType,
    url?: string
  ) => {
    if (!projectId) return
    const source: Source = {
      id: uuidv4(),
      projectId,
      type,
      title,
      content,
      url,
      createdAt: Date.now(),
    }
    await saveSource(source)
    await refresh()
    return source
  }, [projectId, refresh])

  const removeSource = useCallback(async (id: string) => {
    await deleteSource(id)
    await refresh()
  }, [refresh])

  return { sources, loading, createSource, removeSource, refresh }
}
