import { useEffect, useState } from 'react'

import {
  fetchFolderScanSummary,
  fetchScanResult,
  fetchScanResults,
  fetchScanRuns,
  type FolderScanSummary,
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
  const [folderSummary, setFolderSummary] = useState<FolderScanSummary[]>([])
  const [resultsFilters, setResultsFilters] = useState<ScanResultsFilter>(INITIAL_FILTERS)
  const [selectedResult, setSelectedResult] = useState<MediaFileScanResult | null>(null)

  const activeInventoryRun = scanRuns.find(
    (scanRun) => scanRun.run_type === 'inventory' && scanRun.status === 'running',
  )
  const activeInterrogationRun = scanRuns.find(
    (scanRun) => scanRun.run_type === 'interrogation' && scanRun.status === 'running',
  )

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

  async function loadFolderSummary() {
    try {
      const rows = await fetchFolderScanSummary()
      setFolderSummary(rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    }
  }

  useEffect(() => {
    void loadScanRuns()
    void loadResults(INITIAL_FILTERS)
    void loadFolderSummary()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadScanRuns()
      if (activeInventoryRun || activeInterrogationRun) {
        void loadResults(resultsFilters)
        void loadFolderSummary()
      }
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [activeInterrogationRun, activeInventoryRun, resultsFilters])

  async function handleRunInventoryNow() {
    setScanActionLoading(true)
    setScanActionMessage(null)
    setError(null)
    try {
      const run = await startInventoryScan()
      setScanActionMessage(
        run.status === 'running'
          ? `Inventory run ${run.id} started. Progress will refresh automatically.`
          : `Inventory run ${run.id} completed: ${run.processed_files}/${run.total_files} files.`
      )
      await loadScanRuns()
      await loadResults()
      await loadFolderSummary()
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
        run.status === 'running'
          ? `Interrogation run ${run.id} started. Progress will refresh automatically.`
          : `Interrogation run ${run.id} completed: ${run.processed_files}/${run.total_files} files.`
      )
      await loadScanRuns()
      await loadResults()
      await loadFolderSummary()
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
    activeInventoryRun,
    activeInterrogationRun,
    results,
    resultsLoading,
    folderSummary,
    resultsFilters,
    selectedResult,
    setSelectedResult,
    loadScanRuns,
    loadResults,
    loadFolderSummary,
    handleRunInventoryNow,
    handleRunInterrogationNow,
    handleApplyResultsFilters,
    handleOpenResultDetail,
    setResultsFilters,
  }
}
