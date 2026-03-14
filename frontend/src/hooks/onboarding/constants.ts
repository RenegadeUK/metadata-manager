import { type FolderMappingPayload, type MetadataTagRulePayload, type QualityProfilePayload, type ScanSettings } from '../../lib/api'

export const INITIAL_MAPPING: FolderMappingPayload = {
  name: 'Primary media folder',
  source_path: '/media',
  recursive: true,
  is_active: true,
  notes: null,
}

export const INITIAL_PROFILE: QualityProfilePayload = {
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

export const INITIAL_TAG_RULE: MetadataTagRulePayload = {
  name: 'Zombie Encoded',
  is_active: true,
  tag_key: 'encoded_by',
  tag_value: 'zombie',
  match_mode: 'exact',
}

export const INITIAL_SCAN_SETTINGS: ScanSettings = {
  'scan.include_extensions': 'mp4,mkv,mov,m4v,avi,webm',
  'scan.exclude_patterns': '',
  'scan.ffprobe_timeout_seconds': '30',
}

export const SUCCESS_MESSAGE_TIMEOUT_MS = 3000
