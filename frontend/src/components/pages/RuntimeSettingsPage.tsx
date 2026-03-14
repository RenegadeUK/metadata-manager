import { type ChangeEvent, type FormEvent } from 'react'

import { type AppSettings } from '../../lib/api'

type RuntimeSettingsPageProps = {
  settings: AppSettings
  settingsLoading: boolean
  settingsSaving: boolean
  settingsMessage: string | null
  restartCommandMessage: string | null
  restartCommand: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReload: () => void
  onInputChange: (
    key: keyof AppSettings,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onCopyRestartCommand: () => void
}

export function RuntimeSettingsPage({
  settings,
  settingsLoading,
  settingsSaving,
  settingsMessage,
  restartCommandMessage,
  restartCommand,
  onSubmit,
  onReload,
  onInputChange,
  onCopyRestartCommand,
}: RuntimeSettingsPageProps) {
  return (
    <form className="panel composer settings-panel" onSubmit={onSubmit}>
      <div className="list-header">
        <h2>Runtime settings</h2>
        <button onClick={onReload} type="button">
          Reload
        </button>
      </div>
      <p className="muted">
        These values are persisted to <strong>/config/.env</strong>. Restart the container after
        saving.
      </p>
      <label>
        App name
        <input
          value={settings.APP_NAME}
          onChange={onInputChange('APP_NAME')}
          required
        />
      </label>
      <label>
        App environment
        <select
          value={settings.APP_ENV}
          onChange={onInputChange('APP_ENV')}
        >
          <option value="development">development</option>
          <option value="production">production</option>
        </select>
      </label>
      <label>
        Log level
        <select
          value={settings.APP_LOG_LEVEL}
          onChange={onInputChange('APP_LOG_LEVEL')}
        >
          <option value="DEBUG">DEBUG</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>
      </label>
      <label>
        CORS origins
        <input
          value={settings.CORS_ORIGINS}
          onChange={onInputChange('CORS_ORIGINS')}
          required
        />
      </label>
      <label>
        Postgres database
        <input
          value={settings.POSTGRES_DB}
          onChange={onInputChange('POSTGRES_DB')}
          required
        />
      </label>
      <label>
        Postgres user
        <input
          value={settings.POSTGRES_USER}
          onChange={onInputChange('POSTGRES_USER')}
          required
        />
      </label>
      <label>
        Postgres password
        <input
          type="password"
          value={settings.POSTGRES_PASSWORD}
          onChange={onInputChange('POSTGRES_PASSWORD')}
          required
        />
      </label>
      <button disabled={settingsSaving || settingsLoading} type="submit">
        {settingsSaving ? 'Saving...' : 'Save settings'}
      </button>
      {settingsLoading ? <p>Loading settings...</p> : null}
      {settingsMessage ? <p className="success">{settingsMessage}</p> : null}
      {settingsMessage ? (
        <div className="restart-banner">
          <div>
            <p className="restart-title">Restart required</p>
            <p className="muted">Run this after saving so the container reloads the managed settings.</p>
            <code>{restartCommand}</code>
          </div>
          <button onClick={onCopyRestartCommand} type="button">
            Copy restart command
          </button>
          {restartCommandMessage ? <p className="success">{restartCommandMessage}</p> : null}
        </div>
      ) : null}
    </form>
  )
}
