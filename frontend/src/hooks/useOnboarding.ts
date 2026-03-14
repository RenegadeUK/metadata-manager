import { useEffect, useState } from 'react'

import {
  previewFolderMappingTranslation,
  fetchMediaDirectories,
  fetchFolderMappings,
  fetchMetadataTagRules,
  fetchOnboardingDefaults,
  fetchOnboardingStatus,
  fetchQualityProfiles,
  fetchScanSettings,
  type FolderMapping,
  type FolderMappingPayload,
  type FolderMappingPathTranslation,
  type MetadataTagRule,
  type MetadataTagRulePayload,
  type OnboardingStatus,
  type QualityProfile,
  type QualityProfilePayload,
  type ScanSettings,
  type MediaDirectoryBrowserResponse,
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
  const [mediaDirectoryBrowser, setMediaDirectoryBrowser] =
    useState<MediaDirectoryBrowserResponse | null>(null)
  const [mediaBrowserOpen, setMediaBrowserOpen] = useState(false)
  const [mediaBrowserLoading, setMediaBrowserLoading] = useState(false)
  const [mediaBrowserError, setMediaBrowserError] = useState<string | null>(null)

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

  async function loadMediaDirectories(path?: string) {
    setMediaBrowserLoading(true)
    setMediaBrowserError(null)
    try {
      const response = await fetchMediaDirectories(path)
      setMediaDirectoryBrowser(response)
    } catch (browserError) {
      setMediaBrowserError(browserError instanceof Error ? browserError.message : 'Unexpected error')
    } finally {
      setMediaBrowserLoading(false)
    }
  }

  async function handleOpenMediaBrowser() {
    const requestedPath = mappingForm.source_path?.trim() || undefined
    await loadMediaDirectories(requestedPath)
    setMediaBrowserOpen(true)
  }

  function handleCloseMediaBrowser() {
    setMediaBrowserOpen(false)
    setMediaBrowserError(null)
  }

  async function handleBrowseMediaPath(path: string) {
    await loadMediaDirectories(path)
  }

  function handleUseBrowsedPath(path: string) {
    setMappingForm((current) => ({ ...current, source_path: path }))
  }

  async function handlePreviewMappingTranslation(
    mappingId: number,
    filePath: string,
  ): Promise<FolderMappingPathTranslation> {
    return previewFolderMappingTranslation(mappingId, filePath)
  }

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
    profiles,
    tagRuleForm,
    tagRules,
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
    mediaDirectoryBrowser,
    mediaBrowserOpen,
    mediaBrowserLoading,
    mediaBrowserError,
    setMappingForm,
    setProfileForm,
    setTagRuleForm,
    setScanSettingsForm,
    setEditingMappingForm,
    loadOnboardingState,
    loadMediaDirectories,
    handleOpenMediaBrowser,
    handleCloseMediaBrowser,
    handleBrowseMediaPath,
    handleUseBrowsedPath,
    handlePreviewMappingTranslation,
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
