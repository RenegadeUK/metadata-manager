import { type FolderMapping, type FolderScanSummary } from '../../lib/api'

type DashboardPageProps = {
  onboardingReady: boolean
  missingRequirementsCount: number
  activeMappingsCount: number
  profilesCount: number
  tagRulesCount: number
  scanRunsCount: number
  resultsCount: number
  latestScanAt: string | null
  scanActionLoading: boolean
  scanActionMessage: string | null
  mappings: FolderMapping[]
  folderSummary: FolderScanSummary[]
  onRunScanNow: () => void
}

type MetricCard = {
  label: string
  value: string
  ok: boolean
}

export function DashboardPage({
  onboardingReady,
  missingRequirementsCount,
  activeMappingsCount,
  profilesCount,
  tagRulesCount,
  scanRunsCount,
  resultsCount,
  latestScanAt,
  scanActionLoading,
  scanActionMessage,
  mappings,
  folderSummary,
  onRunScanNow,
}: DashboardPageProps) {
  const folderCounts = new Map(
    folderSummary
      .filter((summary) => summary.folder_mapping_id !== null)
      .map((summary) => [summary.folder_mapping_id as number, summary.file_count]),
  )

  const metricCards: MetricCard[] = [
    {
      label: 'Onboarding status',
      value: onboardingReady ? 'Ready' : 'Needs setup',
      ok: onboardingReady,
    },
    {
      label: 'Missing requirements',
      value: String(missingRequirementsCount),
      ok: missingRequirementsCount === 0,
    },
    {
      label: 'Active folder mappings',
      value: String(activeMappingsCount),
      ok: activeMappingsCount > 0,
    },
    {
      label: 'Quality profiles',
      value: String(profilesCount),
      ok: profilesCount > 0,
    },
    {
      label: 'Metadata tag rules',
      value: String(tagRulesCount),
      ok: tagRulesCount > 0,
    },
    {
      label: 'Scan runs',
      value: String(scanRunsCount),
      ok: scanRunsCount > 0,
    },
    {
      label: 'Cataloged media files',
      value: String(resultsCount),
      ok: resultsCount > 0,
    },
  ]

  return (
    <section className="panel dashboard-panel">
      <div className="list-header">
        <h2>Overview</h2>
        <button onClick={onRunScanNow} disabled={scanActionLoading} type="button">
          {scanActionLoading ? 'Running...' : 'Run inventory now'}
        </button>
      </div>
      <p className="muted">Latest scan: {latestScanAt ? new Date(latestScanAt).toLocaleString() : 'Never'}</p>
      {scanActionMessage ? <p className="success">{scanActionMessage}</p> : null}
      <div className="dashboard-grid">
        {metricCards.map((metricCard) => (
          <article className="metric-card" key={metricCard.label}>
            <p className="muted">{metricCard.label}</p>
            <p className="metric-value">{metricCard.value}</p>
            <p className={metricCard.ok ? 'success' : 'error'}>{metricCard.ok ? 'OK' : 'Needs attention'}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-folder-section">
        <div className="list-header">
          <h3>Mapped folders</h3>
          <p className="muted">Files currently cataloged per mapping.</p>
        </div>
        <div className="dashboard-folder-grid">
          {mappings.length === 0 ? <p className="muted">No mapped folders yet.</p> : null}
          {mappings.map((mapping) => (
            <article className="dashboard-folder-card" key={mapping.id}>
              <p className="mapping-name">{mapping.name}</p>
              <p className="mapping-path">{mapping.source_path}</p>
              <p className="dashboard-folder-count">{folderCounts.get(mapping.id) ?? 0} files</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
