import { type FormEvent, useEffect, useState } from 'react'

import {
  createFolderMapping,
  createMetadataTagRule,
  createQualityProfile,
  deleteFolderMapping,
  fetchFolderMappings,
  fetchMetadataTagRules,
  fetchOnboardingDefaults,
  fetchOnboardingStatus,
  fetchQualityProfiles,
  fetchScanSettings,
  saveScanSettings,
  updateFolderMapping,
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

const INITIAL_MAPPING: FolderMappingPayload = {
  name: 'Primary media folder',
  source_path: '/media',
  recursive: true,
  is_active: true,
  notes: null,
}

const INITIAL_PROFILE: QualityProfilePayload = {
  name: 'Zombie HEVC',
  is_active: true,
  codec: 'hevc',
  pixel_format: 'p010le',
  min_bitrate_kbps: null,
  max_bitrate_kbps: null,
  min_width: null,
  min_height: null,
  required_profile: null,
}

const INITIAL_TAG_RULE: MetadataTagRulePayload = {
  name: 'Zombie Encoded',
  is_active: true,
  tag_key: 'encoded_by',
  tag_value: 'zombie',
  match_mode: 'exact',
}

const INITIAL_SCAN_SETTINGS: ScanSettings = {
  'scan.include_extensions': 'mp4,mkv,mov,m4v,avi,webm',
  'scan.exclude_patterns': '',
  'scan.ffprobe_timeout_seconds': '30',
}

const SUCCESS_MESSAGE_TIMEOUT_MS = 3000

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
  }, [mappingFeedback])

  useEffect(() => {
    if (!onboardingMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOnboardingMessage((current) => (current === onboardingMessage ? null : current))
    }, SUCCESS_MESSAGE_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [onboardingMessage])

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

  async function handleCreateMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const created = await createFolderMapping(mappingForm)
      setMappings((currentMappings) => [...currentMappings, created])
      setMappingForm(INITIAL_MAPPING)
      setOnboardingMessage('Folder mapping saved.')
      setOnboardingStatus(await fetchOnboardingStatus())
    } catch (mappingError) {
      setError(mappingError instanceof Error ? mappingError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleToggleMappingActive(mapping: FolderMapping) {
    setOnboardingSaving(true)
    setMappingFeedback(null)
    try {
      const updated = await updateFolderMapping(mapping.id, {
        name: mapping.name,
        source_path: mapping.source_path,
        recursive: mapping.recursive,
        is_active: !mapping.is_active,
        notes: mapping.notes,
      })
      setMappings((currentMappings) =>
        currentMappings.map((currentMapping) =>
          currentMapping.id === updated.id ? updated : currentMapping,
        ),
      )
      setMappingFeedback({
        mappingId: updated.id,
        kind: 'success',
        message: updated.is_active ? 'Folder mapping activated.' : 'Folder mapping deactivated.',
      })
      setOnboardingStatus(await fetchOnboardingStatus())
    } catch (mappingError) {
      setMappingFeedback({
        mappingId: mapping.id,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleDeleteMapping(mappingId: number) {
    setOnboardingSaving(true)
    setMappingFeedback(null)
    try {
      await deleteFolderMapping(mappingId)
      setMappings((currentMappings) =>
        currentMappings.filter((currentMapping) => currentMapping.id !== mappingId),
      )
      setOnboardingMessage('Folder mapping deleted.')
      setOnboardingStatus(await fetchOnboardingStatus())
    } catch (mappingError) {
      setMappingFeedback({
        mappingId,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  function handleStartMappingEdit(mapping: FolderMapping) {
    setEditingMappingId(mapping.id)
    setEditingMappingForm({
      name: mapping.name,
      source_path: mapping.source_path,
      recursive: mapping.recursive,
      is_active: mapping.is_active,
      notes: mapping.notes,
    })
    setOnboardingMessage(null)
    setError(null)
    setMappingFeedback(null)
  }

  function handleCancelMappingEdit() {
    setEditingMappingId(null)
    setEditingMappingForm(null)
  }

  async function handleSaveMappingEdit(event: FormEvent<HTMLFormElement>, mappingId: number) {
    event.preventDefault()
    if (!editingMappingForm) {
      return
    }

    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setMappingFeedback(null)
    try {
      const updated = await updateFolderMapping(mappingId, editingMappingForm)
      setMappings((currentMappings) =>
        currentMappings.map((currentMapping) =>
          currentMapping.id === updated.id ? updated : currentMapping,
        ),
      )
      setEditingMappingId(null)
      setEditingMappingForm(null)
      setMappingFeedback({
        mappingId,
        kind: 'success',
        message: 'Folder mapping updated.',
      })
      setOnboardingStatus(await fetchOnboardingStatus())
    } catch (mappingError) {
      setMappingFeedback({
        mappingId,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const created = await createQualityProfile(profileForm)
      setProfiles((currentProfiles) => [...currentProfiles, created])
      setOnboardingMessage('Quality profile saved.')
      setOnboardingStatus(await fetchOnboardingStatus())
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
      setOnboardingStatus(await fetchOnboardingStatus())
    } catch (tagRuleError) {
      setError(tagRuleError instanceof Error ? tagRuleError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleSaveScanSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const saved = await saveScanSettings(scanSettingsForm)
      setScanSettingsForm(saved)
      setOnboardingMessage('Scan settings saved.')
    } catch (scanSettingsError) {
      setError(scanSettingsError instanceof Error ? scanSettingsError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

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
