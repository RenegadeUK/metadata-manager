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
  'scan.hard_delete_after_days': string
  'scan.inventory_interval_seconds': string
  'scan.interrogation_interval_seconds': string
  'scan.interrogation_workers': string
}

export type OnboardingStatus = {
  ready: boolean
  missing_requirements: string[]
}

export type OnboardingDefaults = {
  quality_profile: QualityProfilePayload
  metadata_tag_rule: MetadataTagRulePayload
}

export type MediaDirectory = {
  name: string
  path: string
  has_children: boolean
}

export type MediaDirectoryBrowserResponse = {
  current_path: string
  parent_path: string | null
  directories: MediaDirectory[]
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

export type ScanRun = {
  id: number
  run_type: string
  status: string
  total_files: number
  processed_files: number
  new_files: number
  updated_files: number
  error_files: number
  message: string | null
  started_at: string
  ended_at: string | null
}

export type MediaFileScanResult = {
  id: number
  file_path: string
  file_name: string
  extension: string
  device_id: number | null
  inode: number | null
  folder_mapping_id: number | null
  scan_run_id: number | null
  size_bytes: number | null
  modified_at: string | null
  codec: string | null
  pixel_format: string | null
  width: number | null
  height: number | null
  bitrate_kbps: number | null
  video_profile: string | null
  tag_key: string | null
  tag_value: string | null
  all_tags_json: string | null
  quality_status: string
  tag_status: string
  probe_error: string | null
  is_removed: boolean
  removed_at: string | null
  last_seen_at: string | null
  inventory_scanned_at: string | null
  interrogated_at: string | null
  scanned_at: string
}

export type ScanResultsFilter = {
  pathQuery?: string
  folderMappingId?: number
  extension?: string
  codec?: string
  pixelFormat?: string
  tagStatus?: string
  removed?: boolean
  limit?: number
  offset?: number
}

export type FolderScanSummary = {
  folder_mapping_id: number | null
  file_count: number
  compliant_count: number
}

export type ScanFilterOptions = {
  extensions: string[]
  codecs: string[]
  pixel_formats: string[]
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

export async function fetchMediaDirectories(
  path?: string,
): Promise<MediaDirectoryBrowserResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : ''
  const response = await fetch(`${API_BASE}/api/onboarding/media-directories${query}`)
  if (!response.ok) {
    throw new Error(`Failed to browse media directories: ${response.status}`)
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

export async function startScan(): Promise<ScanRun> {
  return startInventoryScan()
}

export async function startInventoryScan(): Promise<ScanRun> {
  const response = await fetch(`${API_BASE}/api/scan/run`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to start inventory scan: ${response.status}`)
  }
  return response.json()
}

export async function startInterrogationScan(): Promise<ScanRun> {
  const response = await fetch(`${API_BASE}/api/scan/run/interrogation`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to start interrogation scan: ${response.status}`)
  }
  return response.json()
}

export async function fetchScanRuns(): Promise<ScanRun[]> {
  const response = await fetch(`${API_BASE}/api/scan/runs`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scan runs: ${response.status}`)
  }
  return response.json()
}

export async function fetchScanResults(
  filters: ScanResultsFilter = {},
): Promise<MediaFileScanResult[]> {
  const params = new URLSearchParams()
  if (filters.pathQuery) params.set('path_query', filters.pathQuery)
  if (filters.folderMappingId !== undefined) {
    params.set('folder_mapping_id', String(filters.folderMappingId))
  }
  if (filters.extension) params.set('extension', filters.extension)
  if (filters.codec) params.set('codec', filters.codec)
  if (filters.pixelFormat) params.set('pixel_format', filters.pixelFormat)
  if (filters.tagStatus) params.set('tag_status', filters.tagStatus)
  if (filters.removed !== undefined) params.set('removed', String(filters.removed))
  params.set('limit', String(filters.limit ?? 200))
  params.set('offset', String(filters.offset ?? 0))

  const query = params.toString()
  const response = await fetch(`${API_BASE}/api/scan/results${query ? `?${query}` : ''}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scan results: ${response.status}`)
  }
  return response.json()
}

export async function fetchScanResult(resultId: number): Promise<MediaFileScanResult> {
  const response = await fetch(`${API_BASE}/api/scan/results/${resultId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scan result: ${response.status}`)
  }
  return response.json()
}

export async function interrogateScanResult(resultId: number): Promise<MediaFileScanResult> {
  const response = await fetch(`${API_BASE}/api/scan/results/${resultId}/interrogate`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to interrogate scan result: ${response.status}`)
  }
  return response.json()
}

export async function fetchFolderScanSummary(): Promise<FolderScanSummary[]> {
  const response = await fetch(`${API_BASE}/api/scan/folder-summary`)
  if (!response.ok) {
    throw new Error(`Failed to fetch folder scan summary: ${response.status}`)
  }
  return response.json()
}

export async function fetchScanFilterOptions(): Promise<ScanFilterOptions> {
  const response = await fetch(`${API_BASE}/api/scan/filter-options`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scan filter options: ${response.status}`)
  }
  return response.json()
}
