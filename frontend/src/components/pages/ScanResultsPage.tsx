import { useEffect, useState } from 'react'

import {
  type FolderMapping,
  type MediaFileScanResult,
  type ScanResultsFilter,
  type ScanRun,
} from '../../lib/api'

type ScanResultsPageProps = {
  mappings: FolderMapping[]
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

  function getQualityBadge(result: MediaFileScanResult) {
    if (result.quality_status === 'meets_profile') {
      return { label: 'Quality: Meets', className: 'status-badge status-badge-quality-meets' }
    }
    if (result.quality_status === 'below_profile') {
      return { label: 'Quality: Below', className: 'status-badge status-badge-quality-below' }
    }
    return { label: 'Quality: Unknown', className: 'status-badge status-badge-quality-unknown' }
  }

  function getTagBadge(result: MediaFileScanResult) {
    if (result.tag_status === 'tag_match') {
      return { label: 'Tag: Match', className: 'status-badge status-badge-tag-match' }
    }
    if (result.tag_status === 'tag_mismatch') {
      return { label: 'Tag: Mismatch', className: 'status-badge status-badge-tag-mismatch' }
    }
    if (result.tag_status === 'missing_tag') {
      return { label: 'Tag: Missing', className: 'status-badge status-badge-tag-missing' }
    }
    return { label: 'Tag: Unknown', className: 'status-badge status-badge-tag-unknown' }
  }

  function getRemovalBadge(result: MediaFileScanResult) {
    if (result.is_removed) {
      return { label: 'Removed', className: 'status-badge status-badge-removed' }
    }
    return { label: 'Active', className: 'status-badge status-badge-active' }
  }

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  function submitFilters() {
    onApplyFilters(localFilters)
  }

  return (
    <section className="panel list-panel">
      <div className="list-header">
        <h2>Scan results</h2>
        <button className="secondary-button" onClick={onRefresh} type="button">
          Refresh
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
        <input
          placeholder="Extension (e.g. mkv)"
          value={localFilters.extension ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, extension: event.target.value }))
          }
        />
        <select
          value={localFilters.qualityStatus ?? ''}
          onChange={(event) =>
            setLocalFilters((current) => ({ ...current, qualityStatus: event.target.value }))
          }
        >
          <option value="">All quality</option>
          <option value="meets_profile">meets_profile</option>
          <option value="below_profile">below_profile</option>
          <option value="unknown">unknown</option>
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
        <button onClick={submitFilters} type="button">Apply filters</button>
      </div>

      {resultsLoading ? <p>Loading scan results...</p> : null}
      {!resultsLoading && results.length === 0 ? <p>No scan results found.</p> : null}

      <ul className="item-list">
        {results.map((result) => {
          const qualityBadge = getQualityBadge(result)
          const tagBadge = getTagBadge(result)
          const removalBadge = getRemovalBadge(result)

          return (
            <li key={result.id}>
              <div className="result-badges">
                <span className={qualityBadge.className}>{qualityBadge.label}</span>
                <span className={tagBadge.className}>{tagBadge.label}</span>
                <span className={removalBadge.className}>{removalBadge.label}</span>
              </div>
              <div className="list-header">
                <strong>{result.file_name}</strong>
                <div className="scan-result-actions">
                  <button className="secondary-button" onClick={() => onSelectResult(result.id)} type="button">
                    View details
                  </button>
                  <button disabled={scanActionLoading} onClick={() => onInterrogateResult(result.id)} type="button">
                    {scanActionLoading ? 'Running...' : 'Interrogate file'}
                  </button>
                </div>
              </div>
              <p>{result.file_path}</p>
              <p>
                {result.extension} · {result.codec ?? 'n/a'} · {result.width ?? '?'}x{result.height ?? '?'} · {result.bitrate_kbps ?? '?'} kbps
              </p>
              {result.probe_error ? <p className="error">Probe error: {result.probe_error}</p> : null}
            </li>
          )
        })}
      </ul>

      {selectedResult ? (
        <div className="result-detail-overlay" role="dialog" aria-modal="true">
          <div className="result-detail-backdrop" onClick={onClearSelectedResult} role="presentation" />
          <div className="panel result-detail-modal">
            <div className="list-header">
              <h3>Result detail #{selectedResult.id}</h3>
              <button className="secondary-button" onClick={onClearSelectedResult} type="button">
                Close
              </button>
            </div>
            <pre>{JSON.stringify(selectedResult, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </section>
  )
}
