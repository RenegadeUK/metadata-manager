type DashboardPageProps = {
  onboardingReady: boolean
  missingRequirementsCount: number
  activeMappingsCount: number
  profilesCount: number
  tagRulesCount: number
  itemsCount: number
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
  itemsCount,
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
      label: 'Stored items',
      value: String(itemsCount),
      ok: itemsCount > 0,
    },
  ]

  return (
    <section className="panel dashboard-panel">
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
