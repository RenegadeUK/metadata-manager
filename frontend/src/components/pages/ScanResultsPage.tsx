import { Fragment, useEffect, useState } from 'react'

import {
  type ComplianceSummary,
  type ScanFilterOptions,
  type FolderScanSummary,
  type FolderMapping,
  type MediaFileScanResult,
  type QualityProfile,
  type ScanResultsFilter,
  type ScanRun,
} from '../../lib/api'
import {
  getComplianceStatus,
  getCompliantPieceCount as getSharedCompliantPieceCount,
  isCodecCompliant,
  isFileFormatCompliant,
  isPixelFormatCompliant,
} from '../../lib/compliance'

type ScanResultsPageProps = {
  mappings: FolderMapping[]
  folderSummary: FolderScanSummary[]
  complianceSummary: ComplianceSummary
  filterOptions: ScanFilterOptions
  activeQualityProfile?: QualityProfile
  results: MediaFileScanResult[]
  resultsTotalCount: number
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
  complianceSummary,
  filterOptions,
  activeQualityProfile,
  results,
  resultsTotalCount,
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
  const pageSize = filters.limit ?? 500
  const currentPage = Math.floor((filters.offset ?? 0) / pageSize) + 1
  const totalPages = Math.max(1, Math.ceil(resultsTotalCount / pageSize))

  const folderCountMap = new Map(
    folderSummary
      .filter((summary) => summary.folder_mapping_id !== null)
      .map((summary) => [summary.folder_mapping_id as number, summary.file_count]),
  )
  const mappingNameById = new Map(mappings.map((mapping) => [mapping.id, mapping.name]))

  const selectedResultDisplay = selectedResult
    ? (() => {
        const { all_tags_json, ...rest } = selectedResult
        let allTags: unknown = all_tags_json
        const complianceStatus = getComplianceStatus(selectedResult, activeQualityProfile)

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
          compliance_status: complianceStatus,
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
      return { label: 'Match', className: 'status-badge status-badge-ok' }
    }
    if (result.tag_status === 'tag_mismatch') {
      return { label: 'Mismatch', className: 'status-badge status-badge-bad' }
    }
    if (result.tag_status === 'missing_tag') {
      return { label: 'Missing', className: 'status-badge status-badge-bad' }
    }
    return { label: 'Unknown', className: 'status-badge status-badge-bad' }
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

    if (isCodecCompliant(result, activeQualityProfile)) {
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

  function getFileFormatBadge(result: MediaFileScanResult) {
    const expectedFileFormat = activeQualityProfile?.file_format
    const actualFileFormat = result.extension

    if (!expectedFileFormat) {
      return {
        label: actualFileFormat ?? 'Unknown',
        className: 'status-badge status-badge-bad',
      }
    }

    if (!actualFileFormat) {
      return {
        label: 'Unknown',
        className: 'status-badge status-badge-bad',
      }
    }

    if (isFileFormatCompliant(result, activeQualityProfile)) {
      return {
        label: actualFileFormat,
        className: 'status-badge status-badge-ok',
      }
    }

    return {
      label: actualFileFormat,
      className: 'status-badge status-badge-bad',
    }
  }

  function getPixelFormatBadge(result: MediaFileScanResult) {
    const expectedPixelFormat = activeQualityProfile?.pixel_format
    const actualPixelFormat = result.pixel_format

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

    if (isPixelFormatCompliant(result, activeQualityProfile)) {
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

  function getRowComplianceClass(result: MediaFileScanResult) {
    const compliantChecks = getSharedCompliantPieceCount(result, activeQualityProfile)

    if (compliantChecks === 4) {
      return 'results-row-compliance-full'
    }

    if (compliantChecks > 0) {
      return 'results-row-compliance-partial'
    }

    return 'results-row-compliance-none'
  }

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  function submitFilters() {
    onApplyFilters({
      ...localFilters,
      limit: pageSize,
      offset: 0,
    })
  }

  function clearFilters() {
    const nextFilters: ScanResultsFilter = {
      pathQuery: '',
      folderMappingId: undefined,
      extension: '',
      codec: '',
      pixelFormat: '',
      complianceStatus: undefined,
      tagStatus: '',
      removed: undefined,
      limit: pageSize,
      offset: 0,
    }
    setLocalFilters(nextFilters)
    onApplyFilters(nextFilters)
  }

  function applyFolderFilter(folderMappingId: number | undefined) {
    const nextFilters = {
      ...localFilters,
      folderMappingId,
      limit: pageSize,
      offset: 0,
    }
    setLocalFilters(nextFilters)
    onApplyFilters(nextFilters)
  }

  function applyComplianceFilter(
    complianceStatus: 'compliant' | 'partial_compliant' | 'non_compliant' | undefined,
  ) {
    const nextFilters = {
      ...localFilters,
      complianceStatus,
      limit: pageSize,
      offset: 0,
    }
    setLocalFilters(nextFilters)
    onApplyFilters(nextFilters)
  }

  function changePage(page: number) {
    const safePage = Math.max(1, Math.min(totalPages, page))
    const nextFilters = {
      ...localFilters,
      limit: pageSize,
      offset: (safePage - 1) * pageSize,
    }
    setLocalFilters(nextFilters)
    onApplyFilters(nextFilters)
  }

  function getVisiblePages() {
    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
    return [...pages]
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((left, right) => left - right)
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

      <div className="results-folder-filters">
        <button
          className={
            localFilters.complianceStatus === undefined
              ? 'results-folder-filter results-folder-filter-active'
              : 'results-folder-filter'
          }
          onClick={() => applyComplianceFilter(undefined)}
          type="button"
        >
          All compliance ({complianceSummary.total})
        </button>
        <button
          className={
            localFilters.complianceStatus === 'compliant'
              ? 'results-folder-filter results-folder-filter-active'
              : 'results-folder-filter'
          }
          onClick={() => applyComplianceFilter('compliant')}
          type="button"
        >
          Compliant ({complianceSummary.compliant})
        </button>
        <button
          className={
            localFilters.complianceStatus === 'partial_compliant'
              ? 'results-folder-filter results-folder-filter-active'
              : 'results-folder-filter'
          }
          onClick={() => applyComplianceFilter('partial_compliant')}
          type="button"
        >
          Partial ({complianceSummary.partial_compliant})
        </button>
        <button
          className={
            localFilters.complianceStatus === 'non_compliant'
              ? 'results-folder-filter results-folder-filter-active'
              : 'results-folder-filter'
          }
          onClick={() => applyComplianceFilter('non_compliant')}
          type="button"
        >
          Non compliant ({complianceSummary.non_compliant})
        </button>
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
        <select
          value={localFilters.extension ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, extension: event.target.value }))
          }
        >
          <option value="">All extensions</option>
          {filterOptions.extensions.map((extension) => (
            <option key={extension} value={extension}>
              {extension}
            </option>
          ))}
        </select>
        <select
          value={localFilters.codec ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, codec: event.target.value }))
          }
        >
          <option value="">All codecs</option>
          {filterOptions.codecs.map((codec) => (
            <option key={codec} value={codec}>
              {codec}
            </option>
          ))}
        </select>
        <select
          value={localFilters.pixelFormat ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, pixelFormat: event.target.value }))
          }
        >
          <option value="">All pixel formats</option>
          {filterOptions.pixel_formats.map((pixelFormat) => (
            <option key={pixelFormat} value={pixelFormat}>
              {pixelFormat}
            </option>
          ))}
        </select>
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
        <div className="results-filter-actions">
          <button onClick={submitFilters} type="button">Apply filters</button>
          <button className="secondary-button" onClick={clearFilters} type="button">
            Clear filters
          </button>
        </div>
      </div>

      {resultsLoading ? <p>Loading scan results...</p> : null}
      {!resultsLoading && results.length === 0 ? <p>No scan results found.</p> : null}
      {!resultsLoading ? (
        <div className="results-pagination-summary">
          Showing {results.length === 0 ? 0 : (filters.offset ?? 0) + 1}-
          {(filters.offset ?? 0) + results.length} of {resultsTotalCount}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Folder</th>
                <th>File format</th>
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
                const fileFormatBadge = getFileFormatBadge(result)
                const codecBadge = getCodecBadge(result)
                const pixelFormatBadge = getPixelFormatBadge(result)
                const rowComplianceClass = getRowComplianceClass(result)

                return (
                  <Fragment key={result.id}>
                    <tr className={rowComplianceClass}>
                      <td>
                        <p className="results-file-name">{result.file_name}</p>
                        <p className="results-file-path">{result.file_path}</p>
                        {result.probe_error ? (
                          <p className="error results-probe-error">Probe error: {result.probe_error}</p>
                        ) : null}
                      </td>
                      <td>{mappingNameById.get(result.folder_mapping_id ?? -1) ?? 'Unmapped'}</td>
                      <td>
                        <span className={fileFormatBadge.className}>{fileFormatBadge.label}</span>
                      </td>
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
                        <td colSpan={11}>
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

      {!resultsLoading && totalPages > 1 ? (
        <div className="results-pagination">
          <button
            className="secondary-button"
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          {getVisiblePages().map((page) => (
            <button
              className={page === currentPage ? 'results-page-button results-page-button-active' : 'results-page-button'}
              key={page}
              onClick={() => changePage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="secondary-button"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
