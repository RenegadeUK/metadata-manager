export type Item = {
  id: number
  name: string
  description: string | null
}

export type FolderMapping = {
  id: number
  name: string
  source_path: string
  recursive: boolean
  is_active: boolean
  notes: string | null
}

export type FolderMappingPayload = Omit<FolderMapping, 'id'>

export type QualityProfile = {
  id: number
  name: string
  is_active: boolean
  codec: string
  pixel_format: string | null
  min_bitrate_kbps: number | null
  max_bitrate_kbps: number | null
  min_width: number | null
  min_height: number | null
  required_profile: string | null
}

export type QualityProfilePayload = Omit<QualityProfile, 'id'>

export type MetadataTagRule = {
  id: number
  name: string
  is_active: boolean
  tag_key: string
  tag_value: string
  match_mode: string
}

export type MetadataTagRulePayload = Omit<MetadataTagRule, 'id'>

export type ScanSettings = {
  'scan.include_extensions': string
  'scan.exclude_patterns': string
  'scan.ffprobe_timeout_seconds': string
}

export type OnboardingStatus = {
  ready: boolean
  missing_requirements: string[]
}

export type OnboardingDefaults = {
  quality_profile: QualityProfilePayload
  metadata_tag_rule: MetadataTagRulePayload
}

export type AppSettings = {
  APP_NAME: string
  APP_ENV: string
  APP_LOG_LEVEL: string
  CORS_ORIGINS: string
  POSTGRES_DB: string
  POSTGRES_USER: string
  POSTGRES_PASSWORD: string
}

type SettingsResponse = {
  values: AppSettings
  restart_required: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function fetchItems(): Promise<Item[]> {
  const response = await fetch(`${API_BASE}/api/items`)
  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.status}`)
  }
  return response.json()
}

export async function createItem(payload: Pick<Item, 'name' | 'description'>): Promise<Item> {
  const response = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to create item: ${response.status}`)
  }

  return response.json()
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE}/api/settings`)
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.status}`)
  }
  return response.json()
}

export async function saveSettings(payload: AppSettings): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to save settings: ${response.status}`)
  }

  return response.json()
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await fetch(`${API_BASE}/api/onboarding/status`)
  if (!response.ok) {
    throw new Error(`Failed to fetch onboarding status: ${response.status}`)
  }
  return response.json()
}

export async function fetchOnboardingDefaults(): Promise<OnboardingDefaults> {
  const response = await fetch(`${API_BASE}/api/onboarding/defaults`)
  if (!response.ok) {
    throw new Error(`Failed to fetch onboarding defaults: ${response.status}`)
  }
  return response.json()
}

export async function fetchFolderMappings(): Promise<FolderMapping[]> {
  const response = await fetch(`${API_BASE}/api/onboarding/folder-mappings`)
  if (!response.ok) {
    throw new Error(`Failed to fetch folder mappings: ${response.status}`)
  }
  return response.json()
}

export async function createFolderMapping(payload: FolderMappingPayload): Promise<FolderMapping> {
  const response = await fetch(`${API_BASE}/api/onboarding/folder-mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to create folder mapping: ${response.status}`)
  }
  return response.json()
}

export async function updateFolderMapping(
  mappingId: number,
  payload: FolderMappingPayload,
): Promise<FolderMapping> {
  const response = await fetch(`${API_BASE}/api/onboarding/folder-mappings/${mappingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to update folder mapping: ${response.status}`)
  }

  return response.json()
}

export async function deleteFolderMapping(mappingId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/onboarding/folder-mappings/${mappingId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete folder mapping: ${response.status}`)
  }
}

export async function fetchQualityProfiles(): Promise<QualityProfile[]> {
  const response = await fetch(`${API_BASE}/api/onboarding/quality-profiles`)
  if (!response.ok) {
    throw new Error(`Failed to fetch quality profiles: ${response.status}`)
  }
  return response.json()
}

export async function createQualityProfile(payload: QualityProfilePayload): Promise<QualityProfile> {
  const response = await fetch(`${API_BASE}/api/onboarding/quality-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to create quality profile: ${response.status}`)
  }
  return response.json()
}

export async function fetchMetadataTagRules(): Promise<MetadataTagRule[]> {
  const response = await fetch(`${API_BASE}/api/onboarding/metadata-tag-rules`)
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata tag rules: ${response.status}`)
  }
  return response.json()
}

export async function createMetadataTagRule(
  payload: MetadataTagRulePayload,
): Promise<MetadataTagRule> {
  const response = await fetch(`${API_BASE}/api/onboarding/metadata-tag-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to create metadata tag rule: ${response.status}`)
  }
  return response.json()
}

export async function fetchScanSettings(): Promise<ScanSettings> {
  const response = await fetch(`${API_BASE}/api/onboarding/scan-settings`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scan settings: ${response.status}`)
  }
  return response.json()
}

export async function saveScanSettings(payload: ScanSettings): Promise<ScanSettings> {
  const response = await fetch(`${API_BASE}/api/onboarding/scan-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to save scan settings: ${response.status}`)
  }
  return response.json()
}
