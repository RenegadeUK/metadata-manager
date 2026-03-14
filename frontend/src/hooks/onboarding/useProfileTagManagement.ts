import { type FormEvent } from 'react'

import {
  createMetadataTagRule,
  createQualityProfile,
  updateMetadataTagRule,
  updateQualityProfile,
  type MetadataTagRule,
  type MetadataTagRulePayload,
  type QualityProfile,
  type QualityProfilePayload,
} from '../../lib/api'

type UseProfileTagManagementArgs = {
  profileForm: QualityProfilePayload
  profiles: QualityProfile[]
  tagRuleForm: MetadataTagRulePayload
  tagRules: MetadataTagRule[]
  setProfiles: (updater: (current: QualityProfile[]) => QualityProfile[]) => void
  setTagRules: (updater: (current: MetadataTagRule[]) => MetadataTagRule[]) => void
  setOnboardingSaving: (value: boolean) => void
  setOnboardingMessage: (value: string | null) => void
  setError: (value: string | null) => void
  refreshOnboardingStatus: () => Promise<void>
}

export function useProfileTagManagement({
  profileForm,
  profiles,
  tagRuleForm,
  tagRules,
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
      const normalizedName = profileForm.name.trim().toLowerCase()
      const existingProfile = profiles.find(
        (profile) => profile.name.trim().toLowerCase() === normalizedName,
      )

      if (existingProfile) {
        const updated = await updateQualityProfile(existingProfile.id, profileForm)
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) =>
            profile.id === updated.id ? updated : profile,
          ),
        )
        setOnboardingMessage('Compliance profile updated.')
      } else {
        const created = await createQualityProfile(profileForm)
        setProfiles((currentProfiles) => [...currentProfiles, created])
        setOnboardingMessage('Compliance profile saved.')
      }
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
      const normalizedName = tagRuleForm.name.trim().toLowerCase()
      const existingRule = tagRules.find((rule) => rule.name.trim().toLowerCase() === normalizedName)

      if (existingRule) {
        const updated = await updateMetadataTagRule(existingRule.id, tagRuleForm)
        setTagRules((currentRules) =>
          currentRules.map((rule) =>
            rule.id === updated.id ? updated : rule,
          ),
        )
        setOnboardingMessage('Metadata tag rule updated.')
      } else {
        const created = await createMetadataTagRule(tagRuleForm)
        setTagRules((currentRules) => [...currentRules, created])
        setOnboardingMessage('Metadata tag rule saved.')
      }
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
