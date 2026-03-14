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
  onRunScanNow,
}: DashboardPageProps) {
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
    </section>
  )
}
