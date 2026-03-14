import { type FormEvent } from 'react'

import {
  createMetadataTagRule,
  createQualityProfile,
  type MetadataTagRule,
  type MetadataTagRulePayload,
  type QualityProfile,
  type QualityProfilePayload,
} from '../../lib/api'

type UseProfileTagManagementArgs = {
  profileForm: QualityProfilePayload
  tagRuleForm: MetadataTagRulePayload
  setProfiles: (updater: (current: QualityProfile[]) => QualityProfile[]) => void
  setTagRules: (updater: (current: MetadataTagRule[]) => MetadataTagRule[]) => void
  setOnboardingSaving: (value: boolean) => void
  setOnboardingMessage: (value: string | null) => void
  setError: (value: string | null) => void
  refreshOnboardingStatus: () => Promise<void>
}

export function useProfileTagManagement({
  profileForm,
  tagRuleForm,
  setProfiles,
  setTagRules,
  setOnboardingSaving,
  setOnboardingMessage,
  setError,
  refreshOnboardingStatus,
}: UseProfileTagManagementArgs) {
  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const created = await createQualityProfile(profileForm)
      setProfiles((currentProfiles) => [...currentProfiles, created])
      setOnboardingMessage('Compliance profile saved.')
      await refreshOnboardingStatus()
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleCreateTagRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const created = await createMetadataTagRule(tagRuleForm)
      setTagRules((currentRules) => [...currentRules, created])
      setOnboardingMessage('Metadata tag rule saved.')
      await refreshOnboardingStatus()
    } catch (tagRuleError) {
      setError(tagRuleError instanceof Error ? tagRuleError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  return {
    handleCreateProfile,
    handleCreateTagRule,
  }
}
