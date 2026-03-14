import { type ScanRun } from '../../lib/api'

type ScanJobsPageProps = {
  scanRuns: ScanRun[]
  scanRunsLoading: boolean
  scanActionLoading: boolean
  scanActionMessage: string | null
  activeInventoryRun?: ScanRun
  activeInterrogationRun?: ScanRun
  onRunInventoryNow: () => void
  onRunInterrogationNow: () => void
  onRefreshRuns: () => void
}

export function ScanJobsPage({
  scanRuns,
  scanRunsLoading,
  scanActionLoading,
  scanActionMessage,
  activeInventoryRun,
  activeInterrogationRun,
  onRunInventoryNow,
  onRunInterrogationNow,
  onRefreshRuns,
}: ScanJobsPageProps) {
  return (
    <section className="panel list-panel">
      <div className="list-header">
        <h2>Scan jobs</h2>
        <div className="scan-jobs-actions">
          <button className="secondary-button" disabled={scanActionLoading} onClick={onRefreshRuns} type="button">
            Refresh
          </button>
          <button className="secondary-button" disabled={scanActionLoading || Boolean(activeInventoryRun)} onClick={onRunInventoryNow} type="button">
            {activeInventoryRun ? 'Inventory running...' : scanActionLoading ? 'Running...' : 'Run inventory'}
          </button>
          <button disabled={scanActionLoading || Boolean(activeInterrogationRun)} onClick={onRunInterrogationNow} type="button">
            {activeInterrogationRun ? 'Interrogation running...' : scanActionLoading ? 'Running...' : 'Run interrogation'}
          </button>
        </div>
      </div>
      {scanActionMessage ? <p className="success">{scanActionMessage}</p> : null}
      <p className="muted">Live progress refreshes every 2 seconds.</p>
      {scanRunsLoading ? <p>Loading scan runs...</p> : null}
      {!scanRunsLoading && scanRuns.length === 0 ? <p>No scan runs yet.</p> : null}
      <ul className="item-list">
        {scanRuns.map((scanRun) => (
          <li key={scanRun.id}>
            <strong>Run #{scanRun.id} · {scanRun.run_type} · {scanRun.status}</strong>
            <p>
              {scanRun.processed_files}/{scanRun.total_files} processed · new {scanRun.new_files} · updated {scanRun.updated_files} · errors {scanRun.error_files}
            </p>
            <p>
              {scanRun.total_files > 0
                ? `${Math.floor((scanRun.processed_files / scanRun.total_files) * 100)}% complete`
                : 'Waiting for file enumeration'}
            </p>
            <p>
              Started: {new Date(scanRun.started_at).toLocaleString()}
              {scanRun.ended_at ? ` · Ended: ${new Date(scanRun.ended_at).toLocaleString()}` : ''}
            </p>
            {scanRun.message ? <p className="muted">{scanRun.message}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
