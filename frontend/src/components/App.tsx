import { useState } from 'react'

import { PageHeader } from './layout/PageHeader'
import { SidebarNav } from './layout/SidebarNav'
import { DashboardPage } from './pages/DashboardPage'
import { ItemsPage } from './pages/ItemsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { RuntimeSettingsPage } from './pages/RuntimeSettingsPage'
import { SeedDataPage } from './pages/SeedDataPage'
import { useItems } from '../hooks/useItems'
import { useOnboarding } from '../hooks/useOnboarding'
import { useRuntimeSettings } from '../hooks/useRuntimeSettings'
import { type AppPage } from './types'
import '../styles/app.css'

const PAGE_LABELS: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  onboarding: 'Onboarding',
  runtime: 'Runtime settings',
  seed: 'Seed data',
  items: 'Items',
}

const PAGE_DESCRIPTIONS: Record<AppPage, string> = {
  dashboard: 'Operational overview of setup readiness and core metric levels.',
  onboarding: 'Set folder mappings, quality profiles, tag rules, and scan settings.',
  runtime: 'Manage persisted runtime values written to /config/.env.',
  seed: 'Create seed records for quick API validation.',
  items: 'Browse and refresh stored records.',
}

const APP_PAGES: AppPage[] = ['dashboard', 'onboarding', 'runtime', 'seed', 'items']

export function App() {
  const restartCommand = 'docker compose restart app'
  const [activePage, setActivePage] = useState<AppPage>('dashboard')
  const [error, setError] = useState<string | null>(null)

  const {
    items,
    name,
    description,
    loading,
    saving,
    setName,
    setDescription,
    loadItems,
    handleSubmit,
  } = useItems({ setError })

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

  function renderPage() {
    if (activePage === 'dashboard') {
      return (
        <DashboardPage
          activeMappingsCount={mappings.filter((mapping) => mapping.is_active).length}
          itemsCount={items.length}
          missingRequirementsCount={onboardingStatus?.missing_requirements.length ?? 0}
          onboardingReady={onboardingStatus?.ready ?? false}
          profilesCount={profiles.length}
          tagRulesCount={tagRules.length}
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

    if (activePage === 'seed') {
      return (
        <SeedDataPage
          description={description}
          name={name}
          onSetDescription={setDescription}
          onSetName={setName}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )
    }

    return <ItemsPage items={items} loading={loading} onRefresh={() => void loadItems()} />
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
