import { useEffect, useState } from 'react'

import {
  fetchFolderMappings,
  fetchMetadataTagRules,
  fetchOnboardingDefaults,
  fetchOnboardingStatus,
  fetchQualityProfiles,
  fetchScanSettings,
  type FolderMapping,
  type FolderMappingPayload,
  type MetadataTagRule,
  type MetadataTagRulePayload,
  type OnboardingStatus,
  type QualityProfile,
  type QualityProfilePayload,
  type ScanSettings,
} from '../lib/api'
import { type MappingFeedback } from '../components/types'
import {
  INITIAL_MAPPING,
  INITIAL_PROFILE,
  INITIAL_SCAN_SETTINGS,
  INITIAL_TAG_RULE,
} from './onboarding/constants'
import { useMappingManagement } from './onboarding/useMappingManagement'
import { useOnboardingMessages } from './onboarding/useOnboardingMessages'
import { useProfileTagManagement } from './onboarding/useProfileTagManagement'
import { useScanSettingsManagement } from './onboarding/useScanSettingsManagement'

type UseOnboardingArgs = {
  setError: (message: string | null) => void
}

export function useOnboarding({ setError }: UseOnboardingArgs) {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [mappings, setMappings] = useState<FolderMapping[]>([])
  const [profiles, setProfiles] = useState<QualityProfile[]>([])
  const [tagRules, setTagRules] = useState<MetadataTagRule[]>([])
  const [mappingForm, setMappingForm] = useState<FolderMappingPayload>(INITIAL_MAPPING)
  const [profileForm, setProfileForm] = useState<QualityProfilePayload>(INITIAL_PROFILE)
  const [tagRuleForm, setTagRuleForm] = useState<MetadataTagRulePayload>(INITIAL_TAG_RULE)
  const [scanSettingsForm, setScanSettingsForm] = useState<ScanSettings>(INITIAL_SCAN_SETTINGS)
  const [onboardingMessage, setOnboardingMessage] = useState<string | null>(null)
  const [onboardingSaving, setOnboardingSaving] = useState(false)
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null)
  const [editingMappingForm, setEditingMappingForm] = useState<FolderMappingPayload | null>(null)
  const [mappingFeedback, setMappingFeedback] = useState<MappingFeedback | null>(null)

  useOnboardingMessages({
    onboardingMessage,
    setOnboardingMessage,
    mappingFeedback,
    setMappingFeedback,
  })

  async function refreshOnboardingStatus() {
    setOnboardingStatus(await fetchOnboardingStatus())
  }

  async function loadOnboardingState() {
    setOnboardingMessage(null)
    try {
      const [statusValue, defaults, mappingRows, profileRows, ruleRows, scanSettings] = await Promise.all([
        fetchOnboardingStatus(),
        fetchOnboardingDefaults(),
        fetchFolderMappings(),
        fetchQualityProfiles(),
        fetchMetadataTagRules(),
        fetchScanSettings(),
      ])

      setOnboardingStatus(statusValue)
      setMappings(mappingRows)
      setProfiles(profileRows)
      setTagRules(ruleRows)
      setScanSettingsForm(scanSettings)
      setProfileForm(defaults.quality_profile)
      setTagRuleForm(defaults.metadata_tag_rule)
    } catch (onboardingError) {
      setError(onboardingError instanceof Error ? onboardingError.message : 'Unexpected error')
    }
  }

  useEffect(() => {
    void loadOnboardingState()
  }, [])

  const {
    handleCreateMapping,
    handleToggleMappingActive,
    handleDeleteMapping,
    handleStartMappingEdit,
    handleCancelMappingEdit,
    handleSaveMappingEdit,
  } = useMappingManagement({
    mappingForm,
    editingMappingForm,
    setMappings,
    setMappingForm,
    setEditingMappingId,
    setEditingMappingForm,
    setOnboardingSaving,
    setOnboardingMessage,
    setMappingFeedback,
    setError,
    refreshOnboardingStatus,
  })

  const { handleCreateProfile, handleCreateTagRule } = useProfileTagManagement({
    profileForm,
    tagRuleForm,
    setProfiles,
    setTagRules,
    setOnboardingSaving,
    setOnboardingMessage,
    setError,
    refreshOnboardingStatus,
  })

  const { handleSaveScanSettings } = useScanSettingsManagement({
    scanSettingsForm,
    setScanSettingsForm,
    setOnboardingSaving,
    setOnboardingMessage,
    setError,
  })

  return {
    onboardingStatus,
    mappings,
    profiles,
    tagRules,
    mappingForm,
    profileForm,
    tagRuleForm,
    scanSettingsForm,
    onboardingMessage,
    onboardingSaving,
    editingMappingId,
    editingMappingForm,
    mappingFeedback,
    setMappingForm,
    setProfileForm,
    setTagRuleForm,
    setScanSettingsForm,
    setEditingMappingForm,
    loadOnboardingState,
    handleCreateMapping,
    handleToggleMappingActive,
    handleDeleteMapping,
    handleStartMappingEdit,
    handleCancelMappingEdit,
    handleSaveMappingEdit,
    handleCreateProfile,
    handleCreateTagRule,
    handleSaveScanSettings,
  }
}
