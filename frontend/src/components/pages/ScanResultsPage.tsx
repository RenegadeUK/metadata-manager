import { useEffect, useState } from 'react'

import { type FolderMapping, type MediaFileScanResult, type ScanResultsFilter } from '../../lib/api'

type ScanResultsPageProps = {
  mappings: FolderMapping[]
  results: MediaFileScanResult[]
  resultsLoading: boolean
  filters: ScanResultsFilter
  selectedResult: MediaFileScanResult | null
  onApplyFilters: (filters: ScanResultsFilter) => void
  onRefresh: () => void
  onSelectResult: (resultId: number) => void
  onClearSelectedResult: () => void
}

export function ScanResultsPage({
  mappings,
  results,
  resultsLoading,
  filters,
  selectedResult,
  onApplyFilters,
  onRefresh,
  onSelectResult,
  onClearSelectedResult,
}: ScanResultsPageProps) {
  const [localFilters, setLocalFilters] = useState<ScanResultsFilter>(filters)

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
        {results.map((result) => (
          <li key={result.id}>
            <div className="list-header">
              <strong>{result.file_name}</strong>
              <button className="secondary-button" onClick={() => onSelectResult(result.id)} type="button">
                Interrogate
              </button>
            </div>
            <p>{result.file_path}</p>
            <p>
              {result.extension} · {result.codec ?? 'n/a'} · {result.width ?? '?'}x{result.height ?? '?'} · {result.bitrate_kbps ?? '?'} kbps
            </p>
            <p>
              quality: {result.quality_status} · tag: {result.tag_status} · removed: {String(result.is_removed)}
            </p>
          </li>
        ))}
      </ul>

      {selectedResult ? (
        <div className="panel result-detail">
          <div className="list-header">
            <h3>Result detail #{selectedResult.id}</h3>
            <button className="secondary-button" onClick={onClearSelectedResult} type="button">
              Close
            </button>
          </div>
          <pre>{JSON.stringify(selectedResult, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  )
}
