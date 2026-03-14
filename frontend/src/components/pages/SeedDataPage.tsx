import { type FormEvent } from 'react'

type SeedDataPageProps = {
  name: string
  description: string
  saving: boolean
  onSetName: (value: string) => void
  onSetDescription: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SeedDataPage({
  name,
  description,
  saving,
  onSetName,
  onSetDescription,
  onSubmit,
}: SeedDataPageProps) {
  return (
    <form className="panel composer" onSubmit={onSubmit}>
      <h2>Create seed record</h2>
      <label>
        Name
        <input value={name} onChange={(event) => onSetName(event.target.value)} required />
      </label>
      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => onSetDescription(event.target.value)}
          rows={4}
        />
      </label>
      <button disabled={saving} type="submit">
        {saving ? 'Saving...' : 'Create item'}
      </button>
    </form>
  )
}
