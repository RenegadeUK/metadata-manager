import { type ScanRun } from '../../lib/api'

type ScanJobsPageProps = {
  scanRuns: ScanRun[]
  scanRunsLoading: boolean
  scanActionLoading: boolean
  scanActionMessage: string | null
  onRunInventoryNow: () => void
  onRunInterrogationNow: () => void
  onRefreshRuns: () => void
}

export function ScanJobsPage({
  scanRuns,
  scanRunsLoading,
  scanActionLoading,
  scanActionMessage,
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
          <button className="secondary-button" disabled={scanActionLoading} onClick={onRunInventoryNow} type="button">
            {scanActionLoading ? 'Running...' : 'Run inventory'}
          </button>
          <button disabled={scanActionLoading} onClick={onRunInterrogationNow} type="button">
            {scanActionLoading ? 'Running...' : 'Run interrogation'}
          </button>
        </div>
      </div>
      {scanActionMessage ? <p className="success">{scanActionMessage}</p> : null}
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
