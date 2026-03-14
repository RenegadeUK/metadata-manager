import { type MediaFileScanResult, type QualityProfile } from './api'

export type ComplianceStatus = 'compliant' | 'partial_compliant' | 'non_compliant'

const COMPLIANCE_CHECK_COUNT = 4

function normalizeCsvList(value: string | null | undefined, stripDot = false) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .map((item) => (stripDot ? item.replace(/^\./, '') : item))
    .filter((item) => item.length > 0)
}

export function isCodecCompliant(result: MediaFileScanResult, profile?: QualityProfile) {
  const expectedCodec = profile?.codec?.trim().toLowerCase()
  const actualCodec = result.codec?.trim().toLowerCase()
  if (!expectedCodec || !actualCodec) {
    return false
  }
  return actualCodec === expectedCodec
}

export function isPixelFormatCompliant(result: MediaFileScanResult, profile?: QualityProfile) {
  const allowedPixelFormats = normalizeCsvList(profile?.pixel_format)
  const actualPixelFormat = result.pixel_format?.trim().toLowerCase()
  if (allowedPixelFormats.length === 0 || !actualPixelFormat) {
    return false
  }
  return allowedPixelFormats.includes(actualPixelFormat)
}

export function isFileFormatCompliant(result: MediaFileScanResult, profile?: QualityProfile) {
  const allowedFileFormats = normalizeCsvList(profile?.file_format, true)
  const actualExtension = result.extension?.trim().toLowerCase().replace(/^\./, '')
  if (allowedFileFormats.length === 0 || !actualExtension) {
    return false
  }
  return allowedFileFormats.includes(actualExtension)
}

export function isTagCompliant(result: MediaFileScanResult) {
  return result.tag_status === 'tag_match'
}

export function getCompliantPieceCount(result: MediaFileScanResult, profile?: QualityProfile) {
  return [
    isCodecCompliant(result, profile),
    isPixelFormatCompliant(result, profile),
    isFileFormatCompliant(result, profile),
    isTagCompliant(result),
  ].filter(Boolean).length
}

export function getComplianceStatus(result: MediaFileScanResult, profile?: QualityProfile): ComplianceStatus {
  const compliantPieceCount = getCompliantPieceCount(result, profile)

  if (compliantPieceCount === COMPLIANCE_CHECK_COUNT) {
    return 'compliant'
  }
  if (compliantPieceCount > 0) {
    return 'partial_compliant'
  }
  return 'non_compliant'
}
