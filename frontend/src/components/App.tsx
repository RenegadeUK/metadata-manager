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
import '../styles/app.css'

type AppPage = 'onboarding' | 'runtime' | 'seed' | 'items'

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
  const [mappingFeedback, setMappingFeedback] = useState<{
    mappingId: number
    kind: 'success' | 'error'
    message: string
  } | null>(null)

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
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [mappingFeedback])

  useEffect(() => {
    if (!onboardingMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOnboardingMessage((current) => (current === onboardingMessage ? null : current))
    }, 3000)

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
        <section className="panel onboarding-panel">
          <div className="list-header">
            <h2>Onboarding</h2>
            <button onClick={() => void loadOnboardingState()} type="button">
              Reload
            </button>
          </div>
          <p className="muted">
            Operational config is UI-driven and persisted. Scans should remain blocked until onboarding is
            ready.
          </p>
          {onboardingStatus ? (
            <p className={onboardingStatus.ready ? 'success' : 'error'}>
              {onboardingStatus.ready
                ? 'Onboarding ready.'
                : `Missing: ${onboardingStatus.missing_requirements.join(', ')}`}
            </p>
          ) : null}

          <form className="composer" onSubmit={handleCreateMapping}>
            <h3>Folder mapping</h3>
            <label>
              Name
              <input
                value={mappingForm.name}
                onChange={(event) =>
                  setMappingForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Source path
              <input
                value={mappingForm.source_path}
                onChange={(event) =>
                  setMappingForm((current) => ({ ...current, source_path: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Notes
              <input
                value={mappingForm.notes ?? ''}
                onChange={(event) =>
                  setMappingForm((current) => ({ ...current, notes: event.target.value || null }))
                }
              />
            </label>
            <label className="toggle-row">
              <input
                checked={mappingForm.recursive}
                onChange={(event) =>
                  setMappingForm((current) => ({ ...current, recursive: event.target.checked }))
                }
                type="checkbox"
              />
              Recursive
            </label>
            <label className="toggle-row">
              <input
                checked={mappingForm.is_active}
                onChange={(event) =>
                  setMappingForm((current) => ({ ...current, is_active: event.target.checked }))
                }
                type="checkbox"
              />
              Active
            </label>
            <button disabled={onboardingSaving} type="submit">Save mapping</button>
            <p className="muted">Configured mappings: {mappings.length}</p>
          </form>

          <div className="mapping-list">
            <div className="list-header">
              <h3>Mapped folders</h3>
            </div>
            {mappings.length === 0 ? <p className="muted">No folder mappings yet.</p> : null}
            {mappings.map((mapping) => (
              <article className="mapping-card" key={mapping.id}>
                {editingMappingId === mapping.id && editingMappingForm ? (
                  <form
                    className="composer mapping-edit-form"
                    onSubmit={(event) => void handleSaveMappingEdit(event, mapping.id)}
                  >
                    <label>
                      Name
                      <input
                        value={editingMappingForm.name}
                        onChange={(event) =>
                          setEditingMappingForm((current) =>
                            current ? { ...current, name: event.target.value } : current,
                          )
                        }
                        required
                      />
                    </label>
                    <label>
                      Source path
                      <input
                        value={editingMappingForm.source_path}
                        onChange={(event) =>
                          setEditingMappingForm((current) =>
                            current ? { ...current, source_path: event.target.value } : current,
                          )
                        }
                        required
                      />
                    </label>
                    <label>
                      Notes
                      <input
                        value={editingMappingForm.notes ?? ''}
                        onChange={(event) =>
                          setEditingMappingForm((current) =>
                            current ? { ...current, notes: event.target.value || null } : current,
                          )
                        }
                      />
                    </label>
                    <label className="toggle-row">
                      <input
                        checked={editingMappingForm.recursive}
                        onChange={(event) =>
                          setEditingMappingForm((current) =>
                            current ? { ...current, recursive: event.target.checked } : current,
                          )
                        }
                        type="checkbox"
                      />
                      Recursive
                    </label>
                    <label className="toggle-row">
                      <input
                        checked={editingMappingForm.is_active}
                        onChange={(event) =>
                          setEditingMappingForm((current) =>
                            current ? { ...current, is_active: event.target.checked } : current,
                          )
                        }
                        type="checkbox"
                      />
                      Active
                    </label>
                    <div className="mapping-actions">
                      <button disabled={onboardingSaving} type="submit">Save changes</button>
                      <button
                        className="secondary-button"
                        disabled={onboardingSaving}
                        onClick={handleCancelMappingEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                    {mappingFeedback?.mappingId === mapping.id ? (
                      <p className={mappingFeedback.kind === 'success' ? 'success' : 'error'}>
                        {mappingFeedback.message}
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <>
                    <div className="mapping-details">
                      <p className="mapping-name">{mapping.name}</p>
                      <p className="mapping-path">{mapping.source_path}</p>
                      <p className="muted">
                        {mapping.recursive ? 'Recursive' : 'Non-recursive'} ·{' '}
                        {mapping.is_active ? 'Active' : 'Inactive'}
                      </p>
                      {mapping.notes ? <p className="muted">{mapping.notes}</p> : null}
                    </div>
                    <div className="mapping-actions">
                      <button
                        className="secondary-button"
                        disabled={onboardingSaving}
                        onClick={() => handleStartMappingEdit(mapping)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-button"
                        disabled={onboardingSaving}
                        onClick={() => void handleToggleMappingActive(mapping)}
                        type="button"
                      >
                        {mapping.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="danger-button"
                        disabled={onboardingSaving}
                        onClick={() => void handleDeleteMapping(mapping.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                    {mappingFeedback?.mappingId === mapping.id ? (
                      <p className={mappingFeedback.kind === 'success' ? 'success' : 'error'}>
                        {mappingFeedback.message}
                      </p>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleCreateProfile}>
            <h3>Quality profile</h3>
            <label>
              Name
              <input
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Codec
              <input
                value={profileForm.codec}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, codec: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Pixel format
              <input
                value={profileForm.pixel_format ?? ''}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, pixel_format: event.target.value || null }))
                }
              />
            </label>
            <button disabled={onboardingSaving} type="submit">Save profile</button>
            <p className="muted">Configured profiles: {profiles.length}</p>
          </form>

          <form className="composer" onSubmit={handleCreateTagRule}>
            <h3>Metadata tag rule</h3>
            <label>
              Name
              <input
                value={tagRuleForm.name}
                onChange={(event) =>
                  setTagRuleForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Tag key
              <input
                value={tagRuleForm.tag_key}
                onChange={(event) =>
                  setTagRuleForm((current) => ({ ...current, tag_key: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Tag value
              <input
                value={tagRuleForm.tag_value}
                onChange={(event) =>
                  setTagRuleForm((current) => ({ ...current, tag_value: event.target.value }))
                }
                required
              />
            </label>
            <button disabled={onboardingSaving} type="submit">Save tag rule</button>
            <p className="muted">Configured tag rules: {tagRules.length}</p>
          </form>

          <form className="composer" onSubmit={handleSaveScanSettings}>
            <h3>Scan settings</h3>
            <label>
              Include extensions
              <input
                value={scanSettingsForm['scan.include_extensions']}
                onChange={(event) =>
                  setScanSettingsForm((current) => ({
                    ...current,
                    'scan.include_extensions': event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Exclude patterns
              <input
                value={scanSettingsForm['scan.exclude_patterns']}
                onChange={(event) =>
                  setScanSettingsForm((current) => ({
                    ...current,
                    'scan.exclude_patterns': event.target.value,
                  }))
                }
              />
            </label>
            <label>
              ffprobe timeout seconds
              <input
                value={scanSettingsForm['scan.ffprobe_timeout_seconds']}
                onChange={(event) =>
                  setScanSettingsForm((current) => ({
                    ...current,
                    'scan.ffprobe_timeout_seconds': event.target.value,
                  }))
                }
                required
              />
            </label>
            <button disabled={onboardingSaving} type="submit">Save scan settings</button>
            {onboardingMessage ? <p className="success">{onboardingMessage}</p> : null}
          </form>
        </section>
      )
    }

    if (activePage === 'runtime') {
      return (
        <form className="panel composer settings-panel" onSubmit={handleSettingsSubmit}>
          <div className="list-header">
            <h2>Runtime settings</h2>
            <button onClick={() => void loadSettings()} type="button">
              Reload
            </button>
          </div>
          <p className="muted">
            These values are persisted to <strong>/config/.env</strong>. Restart the container after
            saving.
          </p>
          <label>
            App name
            <input
              value={settings.APP_NAME}
              onChange={handleInputChange('APP_NAME')}
              required
            />
          </label>
          <label>
            App environment
            <select
              value={settings.APP_ENV}
              onChange={handleInputChange('APP_ENV')}
            >
              <option value="development">development</option>
              <option value="production">production</option>
            </select>
          </label>
          <label>
            Log level
            <select
              value={settings.APP_LOG_LEVEL}
              onChange={handleInputChange('APP_LOG_LEVEL')}
            >
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </label>
          <label>
            CORS origins
            <input
              value={settings.CORS_ORIGINS}
              onChange={handleInputChange('CORS_ORIGINS')}
              required
            />
          </label>
          <label>
            Postgres database
            <input
              value={settings.POSTGRES_DB}
              onChange={handleInputChange('POSTGRES_DB')}
              required
            />
          </label>
          <label>
            Postgres user
            <input
              value={settings.POSTGRES_USER}
              onChange={handleInputChange('POSTGRES_USER')}
              required
            />
          </label>
          <label>
            Postgres password
            <input
              type="password"
              value={settings.POSTGRES_PASSWORD}
              onChange={handleInputChange('POSTGRES_PASSWORD')}
              required
            />
          </label>
          <button disabled={settingsSaving || settingsLoading} type="submit">
            {settingsSaving ? 'Saving...' : 'Save settings'}
          </button>
          {settingsLoading ? <p>Loading settings...</p> : null}
          {settingsMessage ? <p className="success">{settingsMessage}</p> : null}
          {settingsMessage ? (
            <div className="restart-banner">
              <div>
                <p className="restart-title">Restart required</p>
                <p className="muted">Run this after saving so the container reloads the managed settings.</p>
                <code>{restartCommand}</code>
              </div>
              <button onClick={() => void handleCopyRestartCommand()} type="button">
                Copy restart command
              </button>
              {restartCommandMessage ? <p className="success">{restartCommandMessage}</p> : null}
            </div>
          ) : null}
        </form>
      )
    }

    if (activePage === 'seed') {
      return (
        <form className="panel composer" onSubmit={handleSubmit}>
          <h2>Create seed record</h2>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </label>
          <button disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Create item'}
          </button>
        </form>
      )
    }

    return (
      <section className="panel list-panel">
        <div className="list-header">
          <h2>Stored items</h2>
          <button onClick={() => void loadItems()} type="button">
            Refresh
          </button>
        </div>
        {loading ? <p>Loading items...</p> : null}
        {!loading && items.length === 0 ? <p>No items yet.</p> : null}
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <p>{item.description ?? 'No description'}</p>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar panel">
        <p className="eyebrow">Metadata Manager</p>
        <h1 className="sidebar-title">Navigation</h1>
        <nav className="sidebar-nav" aria-label="Primary">
          {(Object.keys(PAGE_LABELS) as AppPage[]).map((page) => (
            <button
              className={activePage === page ? 'nav-link nav-link-active' : 'nav-link'}
              key={page}
              onClick={() => setActivePage(page)}
              type="button"
            >
              {PAGE_LABELS[page]}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content-area">
        <header className="page-header panel">
          <h2>{PAGE_LABELS[activePage]}</h2>
          <p className="muted">{PAGE_DESCRIPTIONS[activePage]}</p>
          {error ? <p className="error">{error}</p> : null}
        </header>
        {renderPage()}
      </section>
    </main>
  )
}
