import { useEffect, useState } from 'react'

import {
  fetchComplianceSummary,
  fetchScanFilterOptions,
  fetchFolderScanSummary,
  interrogateScanResult,
  fetchScanResult,
  fetchScanResults,
  fetchScanRuns,
  type ScanFilterOptions,
  type ComplianceSummary,
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

type LoadOptions = {
  showLoading?: boolean
}

const INITIAL_FILTERS: ScanResultsFilter = {
  pathQuery: '',
  extension: '',
  codec: '',
  pixelFormat: '',
  complianceStatus: undefined,
  tagStatus: '',
  removed: undefined,
  limit: 500,
  offset: 0,
}

export function useScanData({ setError }: UseScanDataArgs) {
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([])
  const [scanRunsLoading, setScanRunsLoading] = useState(true)
  const [scanActionLoading, setScanActionLoading] = useState(false)
  const [scanActionMessage, setScanActionMessage] = useState<string | null>(null)

  const [results, setResults] = useState<MediaFileScanResult[]>([])
  const [resultsTotalCount, setResultsTotalCount] = useState(0)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [folderSummary, setFolderSummary] = useState<FolderScanSummary[]>([])
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary>({
    compliant: 0,
    partial_compliant: 0,
    non_compliant: 0,
    total: 0,
  })
  const [filterOptions, setFilterOptions] = useState<ScanFilterOptions>({
    extensions: [],
    codecs: [],
    pixel_formats: [],
  })
  const [resultsFilters, setResultsFilters] = useState<ScanResultsFilter>(INITIAL_FILTERS)
  const [selectedResult, setSelectedResult] = useState<MediaFileScanResult | null>(null)

  const activeInventoryRun = scanRuns.find(
    (scanRun) => scanRun.run_type === 'inventory' && scanRun.status === 'running',
  )
  const activeInterrogationRun = scanRuns.find(
    (scanRun) => scanRun.run_type === 'interrogation' && scanRun.status === 'running',
  )

  async function loadScanRuns(options: LoadOptions = {}) {
    const { showLoading = true } = options
    if (showLoading) {
      setScanRunsLoading(true)
    }
    try {
      const rows = await fetchScanRuns()
      setScanRuns(rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      if (showLoading) {
        setScanRunsLoading(false)
      }
    }
  }

  async function loadResults(filters: ScanResultsFilter = resultsFilters, options: LoadOptions = {}) {
    const { showLoading = true } = options
    if (showLoading) {
      setResultsLoading(true)
    }
    try {
      const response = await fetchScanResults(filters)
      setResults(response.items)
      setResultsTotalCount(response.total_count)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      if (showLoading) {
        setResultsLoading(false)
      }
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

  async function loadComplianceSummary(filters: ScanResultsFilter = resultsFilters) {
    try {
      const summary = await fetchComplianceSummary(filters)
      setComplianceSummary(summary)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    }
  }

  async function loadFilterOptions() {
    try {
      const options = await fetchScanFilterOptions()
      setFilterOptions(options)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    }
  }

  useEffect(() => {
    void loadScanRuns()
    void loadResults(INITIAL_FILTERS)
    void loadFolderSummary()
    void loadComplianceSummary(INITIAL_FILTERS)
    void loadFilterOptions()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadScanRuns({ showLoading: false })
      if (activeInventoryRun || activeInterrogationRun) {
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
      await loadComplianceSummary()
      await loadFilterOptions()
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
      await loadComplianceSummary()
      await loadFilterOptions()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unexpected error')
    } finally {
      setScanActionLoading(false)
    }
  }

  async function handleApplyResultsFilters(nextFilters: ScanResultsFilter) {
    setResultsFilters(nextFilters)
    await loadResults(nextFilters)
    await loadComplianceSummary(nextFilters)
  }

  async function handleOpenResultDetail(resultId: number) {
    try {
      const detail = await fetchScanResult(resultId)
      setSelectedResult(detail)
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unexpected error')
    }
  }

  async function handleInterrogateResult(resultId: number) {
    setScanActionLoading(true)
    setError(null)
    try {
      const updated = await interrogateScanResult(resultId)
      setSelectedResult(updated)
      setScanActionMessage(`Interrogated ${updated.file_name}`)
      await loadScanRuns()
      await loadResults()
      await loadFolderSummary()
      await loadComplianceSummary()
      await loadFilterOptions()
    } catch (interrogateError) {
      setError(interrogateError instanceof Error ? interrogateError.message : 'Unexpected error')
    } finally {
      setScanActionLoading(false)
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
    resultsTotalCount,
    resultsLoading,
    folderSummary,
    complianceSummary,
    filterOptions,
    resultsFilters,
    selectedResult,
    setSelectedResult,
    loadScanRuns,
    loadResults,
    loadFolderSummary,
    loadComplianceSummary,
    loadFilterOptions,
    handleRunInventoryNow,
    handleRunInterrogationNow,
    handleApplyResultsFilters,
    handleOpenResultDetail,
    handleInterrogateResult,
    setResultsFilters,
  }
}
