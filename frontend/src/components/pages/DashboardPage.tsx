import { type FolderMapping, type FolderScanSummary, type ScanRun } from '../../lib/api'

type DashboardPageProps = {
  onboardingReady: boolean
  missingRequirementsCount: number
  activeMappingsCount: number
  profilesCount: number
  tagRulesCount: number
  scanRunsCount: number
  activeInventoryRun?: ScanRun
  activeInterrogationRun?: ScanRun
  resultsCount: number
  latestScanAt: string | null
  scanActionLoading: boolean
  scanActionMessage: string | null
  mappings: FolderMapping[]
  folderSummary: FolderScanSummary[]
  onOpenMappingResults: (mappingId: number) => void
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
  activeInventoryRun,
  activeInterrogationRun,
  resultsCount,
  latestScanAt,
  scanActionLoading,
  scanActionMessage,
  mappings,
  folderSummary,
  onOpenMappingResults,
  onRunScanNow,
}: DashboardPageProps) {
  function formatRunProgress(scanRun?: ScanRun) {
    if (!scanRun || scanRun.status !== 'running') {
      return 'IDLE'
    }

    const total = Math.max(1, scanRun.total_files)
    const processed = Math.min(scanRun.processed_files, total)
    const percentComplete = Math.round((processed / total) * 100)
    return `${percentComplete}% complete`
  }

  const folderCounts = new Map(
    folderSummary
      .filter((summary) => summary.folder_mapping_id !== null)
      .map((summary) => [summary.folder_mapping_id as number, summary]),
  )

  function formatCompliancePercent(fileCount: number, compliantCount: number) {
    if (fileCount <= 0) {
      return 'n/a compliant'
    }
    const percent = Math.round((compliantCount / fileCount) * 100)
    return `${percent}% compliant`
  }

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
      label: 'Compliance profiles',
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
      label: 'Inventory scan',
      value: formatRunProgress(activeInventoryRun),
      ok: activeInventoryRun?.status === 'running',
    },
    {
      label: 'Interrogation scan',
      value: formatRunProgress(activeInterrogationRun),
      ok: activeInterrogationRun?.status === 'running',
    },
    {
      label: 'Cataloged media files',
      value: String(resultsCount),
      ok: resultsCount > 0,
    },
  ].filter((metricCard) => {
    if (metricCard.label === 'Onboarding status' && metricCard.ok) {
      return false
    }

    if (metricCard.label === 'Missing requirements' && metricCard.value === '0') {
      return false
    }

    return true
  })

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
          {mappings.map((mapping) => {
            const summary = folderCounts.get(mapping.id)
            const fileCount = summary?.file_count ?? 0
            const compliantCount = summary?.compliant_count ?? 0

            return (
              <button
                className="dashboard-folder-card"
                key={mapping.id}
                onClick={() => onOpenMappingResults(mapping.id)}
                type="button"
              >
                <p className="mapping-name">{mapping.name}</p>
                <p className="mapping-path">{mapping.source_path}</p>
                <p className="dashboard-folder-count">{fileCount} files</p>
                <p className="dashboard-folder-compliance">
                  {formatCompliancePercent(fileCount, compliantCount)}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
