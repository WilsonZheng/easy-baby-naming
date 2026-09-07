import { useCallback, useMemo, useState } from 'react'
import { chat, extractJson, GroqError } from './groq'
import {
  describeFavorites, describeName, EXPLAIN_SYSTEM, INTENT_SYSTEM, REVIEW_SYSTEM,
  type IntentResult,
} from './prompts'
import type { NameCandidate } from '../types'
import type { Favorite } from '../store/storage'

export interface AiState {
  ready: boolean
  loading: boolean
  error: { message: string; hint?: string } | null
  clearError: () => void
  askIntent: (text: string) => Promise<IntentResult | null>
  reviewFavorites: (favorites: Favorite[]) => Promise<string | null>
  explainName: (n: NameCandidate) => Promise<string | null>
}

export function useAi(apiKey: string, model: string): AiState {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AiState['error']>(null)

  const ready = useMemo(() => apiKey.trim().length > 0 && model.trim().length > 0, [apiKey, model])

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      const err = e as GroqError
      setError({ message: err.message ?? '出了点问题', hint: err.hint })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const askIntent = useCallback((text: string) =>
    run(async () => {
      const out = await chat({
        apiKey, model, json: true,
        system: INTENT_SYSTEM,
        user: text.slice(0, 1000),
      })
      return extractJson<IntentResult>(out)
    }), [apiKey, model, run])

  const reviewFavorites = useCallback((favorites: Favorite[]) =>
    run(() => chat({
      apiKey, model,
      system: REVIEW_SYSTEM,
      user: `以下是他们收藏的名字和本站已经算好的资料：\n\n${describeFavorites(favorites.slice(0, 8))}`,
    })), [apiKey, model, run])

  const explainName = useCallback((n: NameCandidate) =>
    run(() => chat({
      apiKey, model,
      system: EXPLAIN_SYSTEM,
      user: `资料如下：\n\n${describeName(n)}`,
    })), [apiKey, model, run])

  return {
    ready, loading, error,
    clearError: () => setError(null),
    askIntent, reviewFavorites, explainName,
  }
}
