import { type Dispatch, type FormEvent, type SetStateAction } from 'react'

import {
  type FolderMapping,
  type FolderMappingPayload,
  type MediaDirectoryBrowserResponse,
  type MetadataTagRulePayload,
  type OnboardingStatus,
  type QualityProfilePayload,
  type ScanSettings,
} from '../../lib/api'
import { type MappingFeedback } from '../types'

type OnboardingPageProps = {
  onboardingStatus: OnboardingStatus | null
  onboardingSaving: boolean
  onboardingMessage: string | null
  mappings: FolderMapping[]
  mappingForm: FolderMappingPayload
  profileForm: QualityProfilePayload
  tagRuleForm: MetadataTagRulePayload
  scanSettingsForm: ScanSettings
  editingMappingId: number | null
  editingMappingForm: FolderMappingPayload | null
  mappingFeedback: MappingFeedback | null
  profilesCount: number
  tagRulesCount: number
  mediaDirectoryBrowser: MediaDirectoryBrowserResponse | null
  mediaBrowserOpen: boolean
  mediaBrowserLoading: boolean
  mediaBrowserError: string | null
  onReload: () => void
  onCreateMapping: (event: FormEvent<HTMLFormElement>) => void
  onCreateProfile: (event: FormEvent<HTMLFormElement>) => void
  onCreateTagRule: (event: FormEvent<HTMLFormElement>) => void
  onSaveScanSettings: (event: FormEvent<HTMLFormElement>) => void
  onStartMappingEdit: (mapping: FolderMapping) => void
  onCancelMappingEdit: () => void
  onSaveMappingEdit: (event: FormEvent<HTMLFormElement>, mappingId: number) => void
  onToggleMappingActive: (mapping: FolderMapping) => void
  onDeleteMapping: (mappingId: number) => void
  onOpenMediaBrowser: () => void
  onCloseMediaBrowser: () => void
  onBrowseMediaPath: (path: string) => void
  onUseBrowsedPath: (path: string) => void
  setMappingForm: Dispatch<SetStateAction<FolderMappingPayload>>
  setProfileForm: Dispatch<SetStateAction<QualityProfilePayload>>
  setTagRuleForm: Dispatch<SetStateAction<MetadataTagRulePayload>>
  setScanSettingsForm: Dispatch<SetStateAction<ScanSettings>>
  setEditingMappingForm: Dispatch<SetStateAction<FolderMappingPayload | null>>
}

export function OnboardingPage({
  onboardingStatus,
  onboardingSaving,
  onboardingMessage,
  mappings,
  mappingForm,
  profileForm,
  tagRuleForm,
  scanSettingsForm,
  editingMappingId,
  editingMappingForm,
  mappingFeedback,
  profilesCount,
  tagRulesCount,
  mediaDirectoryBrowser,
  mediaBrowserOpen,
  mediaBrowserLoading,
  mediaBrowserError,
  onReload,
  onCreateMapping,
  onCreateProfile,
  onCreateTagRule,
  onSaveScanSettings,
  onStartMappingEdit,
  onCancelMappingEdit,
  onSaveMappingEdit,
  onToggleMappingActive,
  onDeleteMapping,
  onOpenMediaBrowser,
  onCloseMediaBrowser,
  onBrowseMediaPath,
  onUseBrowsedPath,
  setMappingForm,
  setProfileForm,
  setTagRuleForm,
  setScanSettingsForm,
  setEditingMappingForm,
}: OnboardingPageProps) {
  return (
    <section className="panel onboarding-panel">
      <div className="list-header">
        <h2>Onboarding</h2>
        <button onClick={onReload} type="button">
          Reload
        </button>
      </div>
      <p className="muted">
        Operational config is UI-driven and persisted. Scans should remain blocked until onboarding is
        ready.
      </p>
      {onboardingStatus ? (
        <p className={onboardingStatus.ready ? 'success' : 'error'}>
          {onboardingStatus.ready
            ? 'Onboarding ready.'
            : `Missing: ${onboardingStatus.missing_requirements.join(', ')}`}
        </p>
      ) : null}

      <form className="composer" onSubmit={onCreateMapping}>
        <h3>Folder mapping</h3>
        <label>
          Name
          <input
            value={mappingForm.name}
            onChange={(event) =>
              setMappingForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Source path
          <div className="source-path-row">
            <input
              value={mappingForm.source_path}
              onChange={(event) =>
                setMappingForm((current) => ({ ...current, source_path: event.target.value }))
              }
              required
            />
            <button className="secondary-button" onClick={onOpenMediaBrowser} type="button">
              Browse
            </button>
          </div>
        </label>
        {mediaBrowserOpen ? (
          <div className="media-browser">
            <div className="media-browser-toolbar">
              <button
                className="secondary-button"
                disabled={mediaBrowserLoading}
                onClick={() => {
                  const parent = mediaDirectoryBrowser?.parent_path
                  if (parent) {
                    onBrowseMediaPath(parent)
                  }
                }}
                type="button"
              >
                Up
              </button>
              <button
                className="secondary-button"
                disabled={mediaBrowserLoading}
                onClick={() =>
                  onBrowseMediaPath(mediaDirectoryBrowser?.current_path ?? mappingForm.source_path)
                }
                type="button"
              >
                Refresh
              </button>
              <button
                className="secondary-button"
                disabled={!mediaDirectoryBrowser}
                onClick={() => {
                  if (mediaDirectoryBrowser) {
                    onUseBrowsedPath(mediaDirectoryBrowser.current_path)
                  }
                }}
                type="button"
              >
                Use current
              </button>
              <button className="secondary-button" onClick={onCloseMediaBrowser} type="button">
                Close
              </button>
            </div>
            <p className="muted">
              Current: {mediaDirectoryBrowser?.current_path ?? mappingForm.source_path}
            </p>
            {mediaBrowserLoading ? <p className="muted">Loading directories...</p> : null}
            {mediaBrowserError ? <p className="error">{mediaBrowserError}</p> : null}
            <ul className="media-browser-list">
              {(mediaDirectoryBrowser?.directories ?? []).map((directory) => (
                <li key={directory.path}>
                  <button
                    className="secondary-button"
                    onClick={() => onBrowseMediaPath(directory.path)}
                    type="button"
                  >
                    {directory.name}
                    {directory.has_children ? ' /' : ''}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <label>
          Notes
          <input
            value={mappingForm.notes ?? ''}
            onChange={(event) =>
              setMappingForm((current) => ({ ...current, notes: event.target.value || null }))
            }
          />
        </label>
        <label className="toggle-row">
          <input
            checked={mappingForm.recursive}
            onChange={(event) =>
              setMappingForm((current) => ({ ...current, recursive: event.target.checked }))
            }
            type="checkbox"
          />
          Recursive
        </label>
        <label className="toggle-row">
          <input
            checked={mappingForm.is_active}
            onChange={(event) =>
              setMappingForm((current) => ({ ...current, is_active: event.target.checked }))
            }
            type="checkbox"
          />
          Active
        </label>
        <button disabled={onboardingSaving} type="submit">Save mapping</button>
        <p className="muted">Configured mappings: {mappings.length}</p>
      </form>

      <div className="mapping-list">
        <div className="list-header">
          <h3>Mapped folders</h3>
        </div>
        {mappings.length === 0 ? <p className="muted">No folder mappings yet.</p> : null}
        {mappings.map((mapping) => (
          <article className="mapping-card" key={mapping.id}>
            {editingMappingId === mapping.id && editingMappingForm ? (
              <form
                className="composer mapping-edit-form"
                onSubmit={(event) => onSaveMappingEdit(event, mapping.id)}
              >
                <label>
                  Name
                  <input
                    value={editingMappingForm.name}
                    onChange={(event) =>
                      setEditingMappingForm((current) =>
                        current ? { ...current, name: event.target.value } : current,
                      )
                    }
                    required
                  />
                </label>
                <label>
                  Source path
                  <input
                    value={editingMappingForm.source_path}
                    onChange={(event) =>
                      setEditingMappingForm((current) =>
                        current ? { ...current, source_path: event.target.value } : current,
                      )
                    }
                    required
                  />
                </label>
                <label>
                  Notes
                  <input
                    value={editingMappingForm.notes ?? ''}
                    onChange={(event) =>
                      setEditingMappingForm((current) =>
                        current ? { ...current, notes: event.target.value || null } : current,
                      )
                    }
                  />
                </label>
                <label className="toggle-row">
                  <input
                    checked={editingMappingForm.recursive}
                    onChange={(event) =>
                      setEditingMappingForm((current) =>
                        current ? { ...current, recursive: event.target.checked } : current,
                      )
                    }
                    type="checkbox"
                  />
                  Recursive
                </label>
                <label className="toggle-row">
                  <input
                    checked={editingMappingForm.is_active}
                    onChange={(event) =>
                      setEditingMappingForm((current) =>
                        current ? { ...current, is_active: event.target.checked } : current,
                      )
                    }
                    type="checkbox"
                  />
                  Active
                </label>
                <div className="mapping-actions">
                  <button disabled={onboardingSaving} type="submit">Save changes</button>
                  <button
                    className="secondary-button"
                    disabled={onboardingSaving}
                    onClick={onCancelMappingEdit}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
                {mappingFeedback?.mappingId === mapping.id ? (
                  <p className={mappingFeedback.kind === 'success' ? 'success' : 'error'}>
                    {mappingFeedback.message}
                  </p>
                ) : null}
              </form>
            ) : (
              <>
                <div className="mapping-details">
                  <p className="mapping-name">{mapping.name}</p>
                  <p className="mapping-path">{mapping.source_path}</p>
                  <p className="muted">
                    {mapping.recursive ? 'Recursive' : 'Non-recursive'} ·{' '}
                    {mapping.is_active ? 'Active' : 'Inactive'}
                  </p>
                  {mapping.notes ? <p className="muted">{mapping.notes}</p> : null}
                </div>
                <div className="mapping-actions">
                  <button
                    className="secondary-button"
                    disabled={onboardingSaving}
                    onClick={() => onStartMappingEdit(mapping)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    disabled={onboardingSaving}
                    onClick={() => onToggleMappingActive(mapping)}
                    type="button"
                  >
                    {mapping.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="danger-button"
                    disabled={onboardingSaving}
                    onClick={() => onDeleteMapping(mapping.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
                {mappingFeedback?.mappingId === mapping.id ? (
                  <p className={mappingFeedback.kind === 'success' ? 'success' : 'error'}>
                    {mappingFeedback.message}
                  </p>
                ) : null}
              </>
            )}
          </article>
        ))}
      </div>

      <form className="composer" onSubmit={onCreateProfile}>
        <h3>Quality profile</h3>
        <label>
          Name
          <input
            value={profileForm.name}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Codec
          <input
            value={profileForm.codec}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, codec: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Pixel format
          <input
            value={profileForm.pixel_format ?? ''}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, pixel_format: event.target.value || null }))
            }
          />
        </label>
        <button disabled={onboardingSaving} type="submit">Save profile</button>
        <p className="muted">Configured profiles: {profilesCount}</p>
      </form>

      <form className="composer" onSubmit={onCreateTagRule}>
        <h3>Metadata tag rule</h3>
        <label>
          Name
          <input
            value={tagRuleForm.name}
            onChange={(event) =>
              setTagRuleForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Tag key
          <input
            value={tagRuleForm.tag_key}
            onChange={(event) =>
              setTagRuleForm((current) => ({ ...current, tag_key: event.target.value }))
            }
            required
          />
        </label>
        <label>
          Tag value
          <input
            value={tagRuleForm.tag_value}
            onChange={(event) =>
              setTagRuleForm((current) => ({ ...current, tag_value: event.target.value }))
            }
            required
          />
        </label>
        <button disabled={onboardingSaving} type="submit">Save tag rule</button>
        <p className="muted">Configured tag rules: {tagRulesCount}</p>
      </form>

      <form className="composer" onSubmit={onSaveScanSettings}>
        <h3>Scan settings</h3>
        <label>
          Include extensions
          <input
            value={scanSettingsForm['scan.include_extensions']}
            onChange={(event) =>
              setScanSettingsForm((current) => ({
                ...current,
                'scan.include_extensions': event.target.value,
              }))
            }
            required
          />
        </label>
        <label>
          Exclude patterns
          <input
            value={scanSettingsForm['scan.exclude_patterns']}
            onChange={(event) =>
              setScanSettingsForm((current) => ({
                ...current,
                'scan.exclude_patterns': event.target.value,
              }))
            }
          />
        </label>
        <label>
          ffprobe timeout seconds
          <input
            value={scanSettingsForm['scan.ffprobe_timeout_seconds']}
            onChange={(event) =>
              setScanSettingsForm((current) => ({
                ...current,
                'scan.ffprobe_timeout_seconds': event.target.value,
              }))
            }
            required
          />
        </label>
        <button disabled={onboardingSaving} type="submit">Save scan settings</button>
        {onboardingMessage ? <p className="success">{onboardingMessage}</p> : null}
      </form>
    </section>
  )
}
