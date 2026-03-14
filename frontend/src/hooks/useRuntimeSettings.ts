import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'

import { fetchSettings, saveSettings, type AppSettings } from '../lib/api'

const INITIAL_SETTINGS: AppSettings = {
  APP_NAME: 'Metadata Manager',
  APP_ENV: 'development',
  APP_LOG_LEVEL: 'INFO',
  CORS_ORIGINS: 'http://localhost:5173,http://localhost:8000',
  POSTGRES_DB: 'metadata_manager',
  POSTGRES_USER: 'metadata_manager',
  POSTGRES_PASSWORD: 'metadata_manager',
}

type UseRuntimeSettingsArgs = {
  setError: (message: string | null) => void
  restartCommand: string
}

export function useRuntimeSettings({ setError, restartCommand }: UseRuntimeSettingsArgs) {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [restartCommandMessage, setRestartCommandMessage] = useState<string | null>(null)

  async function loadSettings() {
    setSettingsLoading(true)
    setSettingsMessage(null)
    setRestartCommandMessage(null)
    try {
      const response = await fetchSettings()
      setSettings(response.values)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  function updateSetting<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    setSettings((currentSettings: AppSettings) => ({
      ...currentSettings,
      [key]: value,
    }))
  }

  function handleInputChange<Key extends keyof AppSettings>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateSetting(key, event.target.value as AppSettings[Key])
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage(null)
    setRestartCommandMessage(null)
    setError(null)

    try {
      const response = await saveSettings(settings)
      setSettings(response.values)
      setSettingsMessage('Saved to /config/.env.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleCopyRestartCommand() {
    try {
      await navigator.clipboard.writeText(restartCommand)
      setRestartCommandMessage('Restart command copied.')
    } catch {
      setRestartCommandMessage(`Run: ${restartCommand}`)
    }
  }

  return {
    settings,
    settingsLoading,
    settingsSaving,
    settingsMessage,
    restartCommandMessage,
    loadSettings,
    handleInputChange,
    handleSettingsSubmit,
    handleCopyRestartCommand,
  }
}
