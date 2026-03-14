type PageHeaderProps = {
  title: string
  description: string
  error: string | null
}

export function PageHeader({ title, description, error }: PageHeaderProps) {
  return (
    <header className="page-header panel">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {error ? <p className="error">{error}</p> : null}
    </header>
  )
}
