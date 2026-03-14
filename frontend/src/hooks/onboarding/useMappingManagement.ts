import { type FormEvent } from 'react'

import {
  createFolderMapping,
  deleteFolderMapping,
  updateFolderMapping,
  type FolderMapping,
  type FolderMappingPayload,
} from '../../lib/api'
import { INITIAL_MAPPING } from './constants'

type UseMappingManagementArgs = {
  mappingForm: FolderMappingPayload
  editingMappingForm: FolderMappingPayload | null
  setMappings: (updater: (current: FolderMapping[]) => FolderMapping[]) => void
  setMappingForm: (updater: FolderMappingPayload) => void
  setEditingMappingId: (value: number | null) => void
  setEditingMappingForm: (value: FolderMappingPayload | null) => void
  setOnboardingSaving: (value: boolean) => void
  setOnboardingMessage: (value: string | null) => void
  setMappingFeedback: (value: { mappingId: number; kind: 'success' | 'error'; message: string } | null) => void
  setError: (value: string | null) => void
  refreshOnboardingStatus: () => Promise<void>
}

export function useMappingManagement({
  mappingForm,
  editingMappingForm,
  setMappings,
  setMappingForm,
  setEditingMappingId,
  setEditingMappingForm,
  setOnboardingSaving,
  setOnboardingMessage,
  setMappingFeedback,
  setError,
  refreshOnboardingStatus,
}: UseMappingManagementArgs) {
  async function handleCreateMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setError(null)
    try {
      const created = await createFolderMapping(mappingForm)
      setMappings((currentMappings) => [...currentMappings, created])
      setMappingForm(INITIAL_MAPPING)
      setOnboardingMessage('Folder mapping saved.')
      await refreshOnboardingStatus()
    } catch (mappingError) {
      setError(mappingError instanceof Error ? mappingError.message : 'Unexpected error')
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleToggleMappingActive(mapping: FolderMapping) {
    setOnboardingSaving(true)
    setMappingFeedback(null)
    try {
      const updated = await updateFolderMapping(mapping.id, {
        name: mapping.name,
        source_path: mapping.source_path,
        recursive: mapping.recursive,
        is_active: !mapping.is_active,
        notes: mapping.notes,
      })
      setMappings((currentMappings) =>
        currentMappings.map((currentMapping) =>
          currentMapping.id === updated.id ? updated : currentMapping,
        ),
      )
      setMappingFeedback({
        mappingId: updated.id,
        kind: 'success',
        message: updated.is_active ? 'Folder mapping activated.' : 'Folder mapping deactivated.',
      })
      await refreshOnboardingStatus()
    } catch (mappingError) {
      setMappingFeedback({
        mappingId: mapping.id,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  async function handleDeleteMapping(mappingId: number) {
    setOnboardingSaving(true)
    setMappingFeedback(null)
    try {
      await deleteFolderMapping(mappingId)
      setMappings((currentMappings) =>
        currentMappings.filter((currentMapping) => currentMapping.id !== mappingId),
      )
      setOnboardingMessage('Folder mapping deleted.')
      await refreshOnboardingStatus()
    } catch (mappingError) {
      setMappingFeedback({
        mappingId,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  function handleStartMappingEdit(mapping: FolderMapping) {
    setEditingMappingId(mapping.id)
    setEditingMappingForm({
      name: mapping.name,
      source_path: mapping.source_path,
      recursive: mapping.recursive,
      is_active: mapping.is_active,
      notes: mapping.notes,
    })
    setOnboardingMessage(null)
    setError(null)
    setMappingFeedback(null)
  }

  function handleCancelMappingEdit() {
    setEditingMappingId(null)
    setEditingMappingForm(null)
  }

  async function handleSaveMappingEdit(event: FormEvent<HTMLFormElement>, mappingId: number) {
    event.preventDefault()
    if (!editingMappingForm) {
      return
    }

    setOnboardingSaving(true)
    setOnboardingMessage(null)
    setMappingFeedback(null)
    try {
      const updated = await updateFolderMapping(mappingId, editingMappingForm)
      setMappings((currentMappings) =>
        currentMappings.map((currentMapping) =>
          currentMapping.id === updated.id ? updated : currentMapping,
        ),
      )
      setEditingMappingId(null)
      setEditingMappingForm(null)
      setMappingFeedback({
        mappingId,
        kind: 'success',
        message: 'Folder mapping updated.',
      })
      await refreshOnboardingStatus()
    } catch (mappingError) {
      setMappingFeedback({
        mappingId,
        kind: 'error',
        message: mappingError instanceof Error ? mappingError.message : 'Unexpected error',
      })
    } finally {
      setOnboardingSaving(false)
    }
  }

  return {
    handleCreateMapping,
    handleToggleMappingActive,
    handleDeleteMapping,
    handleStartMappingEdit,
    handleCancelMappingEdit,
    handleSaveMappingEdit,
  }
}
