import { ChangeEvent, FormEvent, useEffect, useState } from 'react'

import {
  createFolderMapping,
  createItem,
  createMetadataTagRule,
  createQualityProfile,
  deleteFolderMapping,
  fetchFolderMappings,
  fetchItems,
  fetchMetadataTagRules,
  fetchOnboardingDefaults,
  fetchOnboardingStatus,
  fetchQualityProfiles,
  fetchScanSettings,
  fetchSettings,
  saveScanSettings,
  saveSettings,
  updateFolderMapping,
  type AppSettings,
  type FolderMapping,
  type FolderMappingPayload,
  type Item,
  type MetadataTagRule,
  type MetadataTagRulePayload,
  type OnboardingStatus,
  type QualityProfile,
  type QualityProfilePayload,
  type ScanSettings,
} from '../lib/api'
import { PageHeader } from './layout/PageHeader'
import { SidebarNav } from './layout/SidebarNav'
import { ItemsPage } from './pages/ItemsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { RuntimeSettingsPage } from './pages/RuntimeSettingsPage'
import { SeedDataPage } from './pages/SeedDataPage'
import { type AppPage, type MappingFeedback } from './types'
import '../styles/app.css'

const PAGE_LABELS: Record<AppPage, string> = {
  onboarding: 'Onboarding',
  runtime: 'Runtime settings',
  seed: 'Seed data',
  items: 'Items',
}

const PAGE_DESCRIPTIONS: Record<AppPage, string> = {
  onboarding: 'Set folder mappings, quality profiles, tag rules, and scan settings.',
  runtime: 'Manage persisted runtime values written to /config/.env.',
  seed: 'Create seed records for quick API validation.',
  items: 'Browse and refresh stored records.',
}

const INITIAL_SETTINGS: AppSettings = {
  APP_NAME: 'Metadata Manager',
  APP_ENV: 'development',
  APP_LOG_LEVEL: 'INFO',
  CORS_ORIGINS: 'http://localhost:5173,http://localhost:8000',
  POSTGRES_DB: 'metadata_manager',
  POSTGRES_USER: 'metadata_manager',
  POSTGRES_PASSWORD: 'metadata_manager',
}

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
const APP_PAGES: AppPage[] = ['onboarding', 'runtime', 'seed', 'items']

export function App() {
  const restartCommand = 'docker compose restart app'
  const [activePage, setActivePage] = useState<AppPage>('onboarding')
  const [items, setItems] = useState<Item[]>([])
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [restartCommandMessage, setRestartCommandMessage] = useState<string | null>(null)
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

  async function loadItems() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchItems()
      setItems(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    void loadSettings()
    void loadOnboardingState()
  }, [])

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

  async function loadSettings() {
    setSettingsLoading(true)
    setSettingsMessage(null)
    setRestartCommandMessage(null)
    try {
      const response = await fetchSettings()
      setSettings(response.values)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setSettingsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const created = await createItem({
        name,
        description: description || null,
      })
      setItems((currentItems: Item[]) => [created, ...currentItems])
      setName('')
      setDescription('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage(null)
    setRestartCommandMessage(null)
    setError(null)

    try {
      const response = await saveSettings(settings)
      setSettings(response.values)
      setSettingsMessage('Saved to /config/.env.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error')
    } finally {
      setSettingsSaving(false)
    }
  }

  function updateSetting<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    setSettings((currentSettings: AppSettings) => ({
      ...currentSettings,
      [key]: value,
    }))
  }

  function handleInputChange<Key extends keyof AppSettings>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateSetting(key, event.target.value as AppSettings[Key])
    }
  }

  async function handleCopyRestartCommand() {
    try {
      await navigator.clipboard.writeText(restartCommand)
      setRestartCommandMessage('Restart command copied.')
    } catch {
      setRestartCommandMessage(`Run: ${restartCommand}`)
    }
  }

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

  function renderPage() {
    if (activePage === 'onboarding') {
      return (
        <OnboardingPage
          editingMappingForm={editingMappingForm}
          editingMappingId={editingMappingId}
          mappingFeedback={mappingFeedback}
          mappingForm={mappingForm}
          mappings={mappings}
          onboardingMessage={onboardingMessage}
          onboardingSaving={onboardingSaving}
          onboardingStatus={onboardingStatus}
          onCancelMappingEdit={handleCancelMappingEdit}
          onCreateMapping={handleCreateMapping}
          onCreateProfile={handleCreateProfile}
          onCreateTagRule={handleCreateTagRule}
          onDeleteMapping={(mappingId) => void handleDeleteMapping(mappingId)}
          onReload={() => void loadOnboardingState()}
          onSaveMappingEdit={(event, mappingId) => void handleSaveMappingEdit(event, mappingId)}
          onSaveScanSettings={handleSaveScanSettings}
          onStartMappingEdit={handleStartMappingEdit}
          onToggleMappingActive={(mapping) => void handleToggleMappingActive(mapping)}
          profileForm={profileForm}
          profilesCount={profiles.length}
          scanSettingsForm={scanSettingsForm}
          setEditingMappingForm={setEditingMappingForm}
          setMappingForm={setMappingForm}
          setProfileForm={setProfileForm}
          setScanSettingsForm={setScanSettingsForm}
          setTagRuleForm={setTagRuleForm}
          tagRuleForm={tagRuleForm}
          tagRulesCount={tagRules.length}
        />
      )
    }

    if (activePage === 'runtime') {
      return (
        <RuntimeSettingsPage
          onCopyRestartCommand={() => void handleCopyRestartCommand()}
          onInputChange={handleInputChange}
          onReload={() => void loadSettings()}
          onSubmit={handleSettingsSubmit}
          restartCommand={restartCommand}
          restartCommandMessage={restartCommandMessage}
          settings={settings}
          settingsLoading={settingsLoading}
          settingsMessage={settingsMessage}
          settingsSaving={settingsSaving}
        />
      )
    }

    if (activePage === 'seed') {
      return (
        <SeedDataPage
          description={description}
          name={name}
          onSetDescription={setDescription}
          onSetName={setName}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )
    }

    return <ItemsPage items={items} loading={loading} onRefresh={() => void loadItems()} />
  }

  return (
    <main className="app-shell">
      <SidebarNav
        activePage={activePage}
        labels={PAGE_LABELS}
        onSelectPage={setActivePage}
        pages={APP_PAGES}
      />

      <section className="content-area">
        <PageHeader
          description={PAGE_DESCRIPTIONS[activePage]}
          error={error}
          title={PAGE_LABELS[activePage]}
        />
        {renderPage()}
      </section>
    </main>
  )
}
