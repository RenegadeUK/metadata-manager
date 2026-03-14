import { type FormEvent } from 'react'

import { saveScanSettings, type ScanSettings } from '../../lib/api'

type UseScanSettingsManagementArgs = {
  scanSettingsForm: ScanSettings
  setScanSettingsForm: (updater: ScanSettings) => void
  setOnboardingSaving: (value: boolean) => void
  setOnboardingMessage: (value: string | null) => void
  setError: (value: string | null) => void
}

export function useScanSettingsManagement({
  scanSettingsForm,
  setScanSettingsForm,
  setOnboardingSaving,
  setOnboardingMessage,
  setError,
}: UseScanSettingsManagementArgs) {
  async function handleSaveScanSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const saved = await saveScanSettings(scanSettingsForm)
      setScanSettingsForm(saved)
      setOnboardingMessage('Scan settings saved.')
    } catch (scanSettingsError) {
      setError(scanSettingsError instanceof Error ? scanSettingsError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  return {
    handleSaveScanSettings,
  }
}
