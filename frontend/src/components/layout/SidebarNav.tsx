import { type AppPage } from '../types'

type SidebarNavProps = {
  activePage: AppPage
  pages: AppPage[]
  labels: Record<AppPage, string>
  onSelectPage: (page: AppPage) => void
}

export function SidebarNav({ activePage, pages, labels, onSelectPage }: SidebarNavProps) {
  return (
    <aside className="sidebar panel">
      <p className="eyebrow">Metadata Manager</p>
      <h1 className="sidebar-title">Navigation</h1>
      <nav className="sidebar-nav" aria-label="Primary">
        {pages.map((page) => (
          <button
            className={activePage === page ? 'nav-link nav-link-active' : 'nav-link'}
            key={page}
            onClick={() => onSelectPage(page)}
            type="button"
          >
            {labels[page]}
          </button>
        ))}
      </nav>
    </aside>
  )
}
