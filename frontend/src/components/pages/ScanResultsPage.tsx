import { Fragment, useEffect, useState } from 'react'

import {
  type FolderScanSummary,
  type FolderMapping,
  type MediaFileScanResult,
  type QualityProfile,
  type ScanResultsFilter,
  type ScanRun,
} from '../../lib/api'

type ScanResultsPageProps = {
  mappings: FolderMapping[]
  folderSummary: FolderScanSummary[]
  activeQualityProfile?: QualityProfile
  results: MediaFileScanResult[]
  resultsLoading: boolean
  filters: ScanResultsFilter
  selectedResult: MediaFileScanResult | null
  scanActionLoading: boolean
  activeInventoryRun?: ScanRun
  activeInterrogationRun?: ScanRun
  onApplyFilters: (filters: ScanResultsFilter) => void
  onRefresh: () => void
  onInterrogateResult: (resultId: number) => void
  onSelectResult: (resultId: number) => void
  onClearSelectedResult: () => void
}

export function ScanResultsPage({
  mappings,
  folderSummary,
  activeQualityProfile,
  results,
  resultsLoading,
  filters,
  selectedResult,
  scanActionLoading,
  activeInventoryRun,
  activeInterrogationRun,
  onApplyFilters,
  onRefresh,
  onInterrogateResult,
  onSelectResult,
  onClearSelectedResult,
}: ScanResultsPageProps) {
  const [localFilters, setLocalFilters] = useState<ScanResultsFilter>(filters)

  const folderCountMap = new Map(
    folderSummary
      .filter((summary) => summary.folder_mapping_id !== null)
      .map((summary) => [summary.folder_mapping_id as number, summary.file_count]),
  )
  const mappingNameById = new Map(mappings.map((mapping) => [mapping.id, mapping.name]))

  const selectedResultDisplay = selectedResult
    ? (() => {
        const { all_tags_json, quality_status, ...rest } = selectedResult
        let allTags: unknown = all_tags_json

        if (all_tags_json) {
          try {
            allTags = JSON.parse(all_tags_json)
          } catch {
            allTags = all_tags_json
          }
        }

        return {
          ...rest,
          all_tags: allTags,
          compliance_status: quality_status,
        }
      })()
    : null

  function formatBitrateMBps(bitrateKbps: number | null | undefined) {
    if (bitrateKbps === null || bitrateKbps === undefined) {
      return '? MB/s'
    }

    const megabytesPerSecond = bitrateKbps / 8000
    return `${megabytesPerSecond.toFixed(2)} MB/s`
  }

  function formatFileSize(sizeBytes: number | null | undefined) {
    if (sizeBytes === null || sizeBytes === undefined || sizeBytes < 0) {
      return 'n/a'
    }

    if (sizeBytes < 1024) {
      return `${sizeBytes} B`
    }

    const units = ['KB', 'MB', 'GB', 'TB']
    let value = sizeBytes / 1024
    let unitIndex = 0
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
  }

  function getTagBadge(result: MediaFileScanResult) {
    if (result.tag_status === 'tag_match') {
      return { label: 'Tag: Match', className: 'status-badge status-badge-ok' }
    }
    if (result.tag_status === 'tag_mismatch') {
      return { label: 'Tag: Mismatch', className: 'status-badge status-badge-bad' }
    }
    if (result.tag_status === 'missing_tag') {
      return { label: 'Tag: Missing', className: 'status-badge status-badge-bad' }
    }
    return { label: 'Tag: Unknown', className: 'status-badge status-badge-bad' }
  }

  function getRemovalBadge(result: MediaFileScanResult) {
    if (result.is_removed) {
      return { label: 'Removed', className: 'status-badge status-badge-bad' }
    }
    return { label: 'Active', className: 'status-badge status-badge-ok' }
  }

  function getCodecBadge(result: MediaFileScanResult) {
    const expectedCodec = activeQualityProfile?.codec
    const actualCodec = result.codec

    if (!expectedCodec || !actualCodec) {
      return {
        label: actualCodec ?? 'Unknown',
        className: 'status-badge status-badge-bad',
      }
    }

    if (actualCodec === expectedCodec) {
      return {
        label: actualCodec,
        className: 'status-badge status-badge-ok',
      }
    }

    return {
      label: actualCodec,
      className: 'status-badge status-badge-bad',
    }
  }

  function getPixelFormatBadge(result: MediaFileScanResult) {
    const expectedPixelFormat = activeQualityProfile?.pixel_format
    const actualPixelFormat = result.pixel_format
    const normalizedExpectedPixelFormats = (expectedPixelFormat ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
    const normalizedActualPixelFormat = actualPixelFormat?.trim().toLowerCase()

    if (!expectedPixelFormat) {
      return {
        label: actualPixelFormat ?? 'Unknown',
        className: 'status-badge status-badge-bad',
      }
    }

    if (!actualPixelFormat) {
      return {
        label: 'Unknown',
        className: 'status-badge status-badge-bad',
      }
    }

    if (
      normalizedExpectedPixelFormats.length > 0 &&
      normalizedActualPixelFormat !== undefined &&
      normalizedExpectedPixelFormats.includes(normalizedActualPixelFormat)
    ) {
      return {
        label: actualPixelFormat,
        className: 'status-badge status-badge-ok',
      }
    }

    return {
      label: actualPixelFormat,
      className: 'status-badge status-badge-bad',
    }
  }

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  function submitFilters() {
    onApplyFilters(localFilters)
  }

  function applyFolderFilter(folderMappingId: number | undefined) {
    const nextFilters = {
      ...localFilters,
      folderMappingId,
    }
    setLocalFilters(nextFilters)
    onApplyFilters(nextFilters)
  }

  return (
    <section className="panel list-panel">
      <div className="list-header">
        <h2>Scan results</h2>
        <button className="secondary-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <div className="results-folder-filters">
        <button
          className={
            localFilters.folderMappingId === undefined
              ? 'results-folder-filter results-folder-filter-active'
              : 'results-folder-filter'
          }
          onClick={() => applyFolderFilter(undefined)}
          type="button"
        >
          All folders ({folderSummary.reduce((total, row) => total + row.file_count, 0)})
        </button>
        {mappings.map((mapping) => (
          <button
            className={
              localFilters.folderMappingId === mapping.id
                ? 'results-folder-filter results-folder-filter-active'
                : 'results-folder-filter'
            }
            key={mapping.id}
            onClick={() => applyFolderFilter(mapping.id)}
            type="button"
          >
            {mapping.name} ({folderCountMap.get(mapping.id) ?? 0})
          </button>
        ))}
      </div>

      {activeInventoryRun ? (
        <p className="muted">
          Inventory running: {activeInventoryRun.processed_files}/{activeInventoryRun.total_files} processed.
        </p>
      ) : null}
      {activeInterrogationRun ? (
        <p className="muted">
          Interrogation running: {activeInterrogationRun.processed_files}/{activeInterrogationRun.total_files} processed.
        </p>
      ) : null}

      <div className="results-filters">
        <select
          value={localFilters.folderMappingId === undefined ? '' : String(localFilters.folderMappingId)}
          onChange={(event) => {
            const value = event.target.value
            setLocalFilters((current) => ({
              ...current,
              folderMappingId: value === '' ? undefined : Number(value),
            }))
          }}
        >
          <option value="">All mapped folders</option>
          {mappings.map((mapping) => (
            <option key={mapping.id} value={mapping.id}>
              {mapping.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Path contains"
          value={localFilters.pathQuery ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, pathQuery: event.target.value }))
          }
        />
        <input
          placeholder="Extension (e.g. mkv)"
          value={localFilters.extension ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, extension: event.target.value }))
          }
        />
        <input
          placeholder="Codec (e.g. hevc)"
          value={localFilters.codec ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, codec: event.target.value }))
          }
        />
        <input
          placeholder="Pixel format (e.g. p010le)"
          value={localFilters.pixelFormat ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, pixelFormat: event.target.value }))
          }
        />
        <select
          value={localFilters.tagStatus ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, tagStatus: event.target.value }))
          }
        >
          <option value="">All tag status</option>
          <option value="tag_match">tag_match</option>
          <option value="tag_mismatch">tag_mismatch</option>
          <option value="missing_tag">missing_tag</option>
          <option value="unknown">unknown</option>
        </select>
        <select
          value={
            localFilters.removed === undefined
              ? ''
              : localFilters.removed
                ? 'true'
                : 'false'
          }
          onChange={(event) => {
            const value = event.target.value
            setLocalFilters((current) => ({
              ...current,
              removed: value === '' ? undefined : value === 'true',
            }))
          }}
        >
          <option value="">All removal states</option>
          <option value="false">active</option>
          <option value="true">soft removed</option>
        </select>
        <button onClick={submitFilters} type="button">Apply filters</button>
      </div>

      {resultsLoading ? <p>Loading scan results...</p> : null}
      {!resultsLoading && results.length === 0 ? <p>No scan results found.</p> : null}

      {results.length > 0 ? (
        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Folder</th>
                <th>Codec</th>
                <th>Pixel format</th>
                <th>Resolution</th>
                <th>Bitrate</th>
                <th>File size</th>
                <th>Tag</th>
                <th>State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const tagBadge = getTagBadge(result)
                const removalBadge = getRemovalBadge(result)
                const codecBadge = getCodecBadge(result)
                const pixelFormatBadge = getPixelFormatBadge(result)

                return (
                  <Fragment key={result.id}>
                    <tr>
                      <td>
                        <p className="results-file-name">{result.file_name}</p>
                        <p className="results-file-path">{result.file_path}</p>
                        {result.probe_error ? (
                          <p className="error results-probe-error">Probe error: {result.probe_error}</p>
                        ) : null}
                      </td>
                      <td>{mappingNameById.get(result.folder_mapping_id ?? -1) ?? 'Unmapped'}</td>
                      <td>
                        <span className={codecBadge.className}>{codecBadge.label}</span>
                      </td>
                      <td>
                        <span className={pixelFormatBadge.className}>{pixelFormatBadge.label}</span>
                      </td>
                      <td>{result.width ?? '?'}x{result.height ?? '?'}</td>
                      <td>{formatBitrateMBps(result.bitrate_kbps)}</td>
                      <td>{formatFileSize(result.size_bytes)}</td>
                      <td>
                        <span className={tagBadge.className}>{tagBadge.label}</span>
                      </td>
                      <td>
                        <span className={removalBadge.className}>{removalBadge.label}</span>
                      </td>
                      <td>
                        <div className="scan-result-actions">
                          <button
                            className="secondary-button"
                            onClick={() => {
                              if (selectedResult?.id === result.id) {
                                onClearSelectedResult()
                                return
                              }
                              onSelectResult(result.id)
                            }}
                            type="button"
                          >
                            {selectedResult?.id === result.id ? 'Hide details' : 'View details'}
                          </button>
                          <button
                            disabled={scanActionLoading}
                            onClick={() => onInterrogateResult(result.id)}
                            type="button"
                          >
                            {scanActionLoading ? 'Running...' : 'Interrogate file'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {selectedResult?.id === result.id ? (
                      <tr className="results-detail-row">
                        <td colSpan={9}>
                          <div className="results-inline-detail">
                            <div className="list-header">
                              <h3>Result detail #{selectedResult.id}</h3>
                              <button
                                className="secondary-button"
                                onClick={onClearSelectedResult}
                                type="button"
                              >
                                Close
                              </button>
                            </div>
                            <pre>{JSON.stringify(selectedResultDisplay, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
