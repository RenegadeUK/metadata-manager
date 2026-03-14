import { useEffect, useState } from 'react'

import {
  fetchScanResult,
  fetchScanResults,
  fetchScanRuns,
  startInterrogationScan,
  startInventoryScan,
  type MediaFileScanResult,
  type ScanResultsFilter,
  type ScanRun,
} from '../lib/api'

type UseScanDataArgs = {
  setError: (message: string | null) => void
}

const INITIAL_FILTERS: ScanResultsFilter = {
  pathQuery: '',
  extension: '',
  qualityStatus: '',
  tagStatus: '',
  removed: undefined,
  limit: 200,
  offset: 0,
}

export function useScanData({ setError }: UseScanDataArgs) {
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([])
  const [scanRunsLoading, setScanRunsLoading] = useState(true)
  const [scanActionLoading, setScanActionLoading] = useState(false)
  const [scanActionMessage, setScanActionMessage] = useState<string | null>(null)

  const [results, setResults] = useState<MediaFileScanResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [resultsFilters, setResultsFilters] = useState<ScanResultsFilter>(INITIAL_FILTERS)
  const [selectedResult, setSelectedResult] = useState<MediaFileScanResult | null>(null)

  async function loadScanRuns() {
    setScanRunsLoading(true)
    try {
      const rows = await fetchScanRuns()
      setScanRuns(rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setScanRunsLoading(false)
    }
  }

  async function loadResults(filters: ScanResultsFilter = resultsFilters) {
    setResultsLoading(true)
    try {
      const rows = await fetchScanResults(filters)
      setResults(rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setResultsLoading(false)
    }
  }

  useEffect(() => {
    void loadScanRuns()
    void loadResults(INITIAL_FILTERS)
  }, [])

  async function handleRunInventoryNow() {
    setScanActionLoading(true)
    setScanActionMessage(null)
    setError(null)
    try {
      const run = await startInventoryScan()
      setScanActionMessage(
        `Inventory run ${run.id} completed: ${run.processed_files}/${run.total_files} files.`
      )
      await loadScanRuns()
      await loadResults()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unexpected error')
    } finally {
      setScanActionLoading(false)
    }
  }

  async function handleRunInterrogationNow() {
    setScanActionLoading(true)
    setScanActionMessage(null)
    setError(null)
    try {
      const run = await startInterrogationScan()
      setScanActionMessage(
        `Interrogation run ${run.id} completed: ${run.processed_files}/${run.total_files} files.`
      )
      await loadScanRuns()
      await loadResults()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unexpected error')
    } finally {
      setScanActionLoading(false)
    }
  }

  async function handleApplyResultsFilters(nextFilters: ScanResultsFilter) {
    setResultsFilters(nextFilters)
    await loadResults(nextFilters)
  }

  async function handleOpenResultDetail(resultId: number) {
    try {
      const detail = await fetchScanResult(resultId)
      setSelectedResult(detail)
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unexpected error')
    }
  }

  return {
    scanRuns,
    scanRunsLoading,
    scanActionLoading,
    scanActionMessage,
    results,
    resultsLoading,
    resultsFilters,
    selectedResult,
    setSelectedResult,
    loadScanRuns,
    loadResults,
    handleRunInventoryNow,
    handleRunInterrogationNow,
    handleApplyResultsFilters,
    handleOpenResultDetail,
    setResultsFilters,
  }
}
