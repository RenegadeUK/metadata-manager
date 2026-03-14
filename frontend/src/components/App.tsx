import { useState } from 'react'

import { PageHeader } from './layout/PageHeader'
import { SidebarNav } from './layout/SidebarNav'
import { DashboardPage } from './pages/DashboardPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { RuntimeSettingsPage } from './pages/RuntimeSettingsPage'
import { ScanJobsPage } from './pages/ScanJobsPage'
import { ScanResultsPage } from './pages/ScanResultsPage'
import { useOnboarding } from '../hooks/useOnboarding'
import { useRuntimeSettings } from '../hooks/useRuntimeSettings'
import { useScanData } from '../hooks/useScanData'
import { type AppPage } from './types'
import '../styles/app.css'

const PAGE_LABELS: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  onboarding: 'Onboarding',
  runtime: 'Runtime settings',
  'scan-jobs': 'Scan jobs',
  'scan-results': 'Scan results',
}

const PAGE_DESCRIPTIONS: Record<AppPage, string> = {
  dashboard: 'Operational overview of setup readiness and latest scan activity.',
  onboarding: 'Set folder mappings, compliance profiles, tag rules, and scan settings.',
  runtime: 'Manage persisted runtime values written to /config/.env.',
  'scan-jobs': 'Run scans and inspect execution history.',
  'scan-results': 'Filter and interrogate discovered media scan results.',
}

const APP_PAGES: AppPage[] = ['dashboard', 'onboarding', 'runtime', 'scan-jobs', 'scan-results']

export function App() {
  const restartCommand = 'docker compose restart app'
  const [activePage, setActivePage] = useState<AppPage>('dashboard')
  const [error, setError] = useState<string | null>(null)

  const {
    settings,
    settingsLoading,
    settingsSaving,
    settingsMessage,
    restartCommandMessage,
    loadSettings,
    handleInputChange,
    handleSettingsSubmit,
    handleCopyRestartCommand,
  } = useRuntimeSettings({ setError, restartCommand })

  const {
    onboardingStatus,
    mappings,
    profiles,
    tagRules,
    mappingForm,
    profileForm,
    tagRuleForm,
    scanSettingsForm,
    onboardingMessage,
    onboardingSaving,
    editingMappingId,
    editingMappingForm,
    mappingFeedback,
    mediaDirectoryBrowser,
    mediaBrowserOpen,
    mediaBrowserLoading,
    mediaBrowserError,
    setMappingForm,
    setProfileForm,
    setTagRuleForm,
    setScanSettingsForm,
    setEditingMappingForm,
    loadOnboardingState,
    handleCreateMapping,
    handleToggleMappingActive,
    handleDeleteMapping,
    handleStartMappingEdit,
    handleCancelMappingEdit,
    handleSaveMappingEdit,
    handleCreateProfile,
    handleCreateTagRule,
    handleSaveScanSettings,
    handleOpenMediaBrowser,
    handleCloseMediaBrowser,
    handleBrowseMediaPath,
    handleUseBrowsedPath,
  } = useOnboarding({ setError })

  const {
    scanRuns,
    scanRunsLoading,
    scanActionLoading,
    scanActionMessage,
    activeInventoryRun,
    activeInterrogationRun,
    folderSummary,
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
    handleInterrogateResult,
  } = useScanData({ setError })

  const activeQualityProfile = profiles.find((profile) => profile.is_active)

  function handleOpenMappingResults(mappingId: number) {
    void handleApplyResultsFilters({
      folderMappingId: mappingId,
      pathQuery: '',
      extension: '',
      codec: '',
      pixelFormat: '',
      tagStatus: '',
      removed: undefined,
      limit: 200,
      offset: 0,
    })
    setSelectedResult(null)
    setActivePage('scan-results')
  }

  function renderPage() {
    if (activePage === 'dashboard') {
      const latestRun = scanRuns[0]
      const totalCatalogedFiles = folderSummary.reduce(
        (total, summaryRow) => total + summaryRow.file_count,
        0,
      )
      return (
        <DashboardPage
          activeMappingsCount={mappings.filter((mapping) => mapping.is_active).length}
          activeInterrogationRun={activeInterrogationRun}
          activeInventoryRun={activeInventoryRun}
          folderSummary={folderSummary}
          latestScanAt={latestRun?.started_at ?? null}
          mappings={mappings}
          missingRequirementsCount={onboardingStatus?.missing_requirements.length ?? 0}
          onboardingReady={onboardingStatus?.ready ?? false}
          profilesCount={profiles.length}
          resultsCount={totalCatalogedFiles}
          scanActionLoading={scanActionLoading}
          scanActionMessage={scanActionMessage}
          scanRunsCount={scanRuns.length}
          tagRulesCount={tagRules.length}
          onOpenMappingResults={handleOpenMappingResults}
          onRunScanNow={() => void handleRunInventoryNow()}
        />
      )
    }

    if (activePage === 'onboarding') {
      return (
        <OnboardingPage
          editingMappingForm={editingMappingForm}
          editingMappingId={editingMappingId}
          mappingFeedback={mappingFeedback}
          mediaBrowserError={mediaBrowserError}
          mediaBrowserLoading={mediaBrowserLoading}
          mediaBrowserOpen={mediaBrowserOpen}
          mediaDirectoryBrowser={mediaDirectoryBrowser}
          mappingForm={mappingForm}
          mappings={mappings}
          onboardingMessage={onboardingMessage}
          onboardingSaving={onboardingSaving}
          onboardingStatus={onboardingStatus}
          onCancelMappingEdit={handleCancelMappingEdit}
          onCreateMapping={handleCreateMapping}
          onCreateProfile={handleCreateProfile}
          onCreateTagRule={handleCreateTagRule}
          onDeleteMapping={(mappingId) => void handleDeleteMapping(mappingId)}
          onBrowseMediaPath={(path) => void handleBrowseMediaPath(path)}
          onCloseMediaBrowser={handleCloseMediaBrowser}
          onOpenMediaBrowser={() => void handleOpenMediaBrowser()}
          onReload={() => void loadOnboardingState()}
          onSaveMappingEdit={(event, mappingId) => void handleSaveMappingEdit(event, mappingId)}
          onSaveScanSettings={handleSaveScanSettings}
          onStartMappingEdit={handleStartMappingEdit}
          onToggleMappingActive={(mapping) => void handleToggleMappingActive(mapping)}
          onUseBrowsedPath={handleUseBrowsedPath}
          profileForm={profileForm}
          profilesCount={profiles.length}
          scanSettingsForm={scanSettingsForm}
          setEditingMappingForm={setEditingMappingForm}
          setMappingForm={setMappingForm}
          setProfileForm={setProfileForm}
          setScanSettingsForm={setScanSettingsForm}
          setTagRuleForm={setTagRuleForm}
          tagRuleForm={tagRuleForm}
          tagRulesCount={tagRules.length}
        />
      )
    }

    if (activePage === 'runtime') {
      return (
        <RuntimeSettingsPage
          onCopyRestartCommand={() => void handleCopyRestartCommand()}
          onInputChange={handleInputChange}
          onReload={() => void loadSettings()}
          onSubmit={handleSettingsSubmit}
          restartCommand={restartCommand}
          restartCommandMessage={restartCommandMessage}
          settings={settings}
          settingsLoading={settingsLoading}
          settingsMessage={settingsMessage}
          settingsSaving={settingsSaving}
        />
      )
    }

    if (activePage === 'scan-jobs') {
      return (
        <ScanJobsPage
          activeInterrogationRun={activeInterrogationRun}
          activeInventoryRun={activeInventoryRun}
          scanActionLoading={scanActionLoading}
          scanActionMessage={scanActionMessage}
          scanRuns={scanRuns}
          scanRunsLoading={scanRunsLoading}
          onRefreshRuns={() => void loadScanRuns()}
          onRunInventoryNow={() => void handleRunInventoryNow()}
          onRunInterrogationNow={() => void handleRunInterrogationNow()}
        />
      )
    }

    return (
      <ScanResultsPage
        activeInterrogationRun={activeInterrogationRun}
        activeInventoryRun={activeInventoryRun}
        activeQualityProfile={activeQualityProfile}
        filters={resultsFilters}
        folderSummary={folderSummary}
        mappings={mappings}
        results={results}
        resultsLoading={resultsLoading}
        scanActionLoading={scanActionLoading}
        selectedResult={selectedResult}
        onApplyFilters={(filters) => void handleApplyResultsFilters(filters)}
        onClearSelectedResult={() => setSelectedResult(null)}
        onInterrogateResult={(resultId) => void handleInterrogateResult(resultId)}
        onRefresh={() => void loadResults()}
        onSelectResult={(resultId) => void handleOpenResultDetail(resultId)}
      />
    )
  }

  return (
    <main className="app-shell">
      <SidebarNav
        activePage={activePage}
        labels={PAGE_LABELS}
        onSelectPage={setActivePage}
        pages={APP_PAGES}
      />

      <section className="content-area">
        <PageHeader
          description={PAGE_DESCRIPTIONS[activePage]}
          error={error}
          title={PAGE_LABELS[activePage]}
        />
        {renderPage()}
      </section>
    </main>
  )
}
