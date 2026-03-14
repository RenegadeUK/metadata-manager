import { type FormEvent, useEffect, useState } from 'react'

import { createItem, fetchItems, type Item } from '../lib/api'

type UseItemsArgs = {
  setError: (message: string | null) => void
}

export function useItems({ setError }: UseItemsArgs) {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadItems() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchItems()
      setItems(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const created = await createItem({
        name,
        description: description || null,
      })
      setItems((currentItems) => [created, ...currentItems])
      setName('')
      setDescription('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return {
    items,
    name,
    description,
    loading,
    saving,
    setName,
    setDescription,
    loadItems,
    handleSubmit,
  }
}
