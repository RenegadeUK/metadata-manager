import { useEffect } from 'react'

import { type MappingFeedback } from '../../components/types'
import { SUCCESS_MESSAGE_TIMEOUT_MS } from './constants'

type UseOnboardingMessagesArgs = {
  onboardingMessage: string | null
  setOnboardingMessage: (value: string | null | ((current: string | null) => string | null)) => void
  mappingFeedback: MappingFeedback | null
  setMappingFeedback: (
    value:
      | MappingFeedback
      | null
      | ((current: MappingFeedback | null) => MappingFeedback | null)
  ) => void
}

export function useOnboardingMessages({
  onboardingMessage,
  setOnboardingMessage,
  mappingFeedback,
  setMappingFeedback,
}: UseOnboardingMessagesArgs) {
  useEffect(() => {
    if (!mappingFeedback || mappingFeedback.kind !== 'success') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMappingFeedback((current) => {
        if (
          current &&
          current.mappingId === mappingFeedback.mappingId &&
          current.message === mappingFeedback.message &&
          current.kind === mappingFeedback.kind
        ) {
          return null
        }
        return current
      })
    }, SUCCESS_MESSAGE_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [mappingFeedback, setMappingFeedback])

  useEffect(() => {
    if (!onboardingMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOnboardingMessage((current) => (current === onboardingMessage ? null : current))
    }, SUCCESS_MESSAGE_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [onboardingMessage, setOnboardingMessage])
}
