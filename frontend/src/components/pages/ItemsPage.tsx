import { type Item } from '../../lib/api'

type ItemsPageProps = {
  loading: boolean
  items: Item[]
  onRefresh: () => void
}

export function ItemsPage({ loading, items, onRefresh }: ItemsPageProps) {
  return (
    <section className="panel list-panel">
      <div className="list-header">
        <h2>Stored items</h2>
        <button onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>
      {loading ? <p>Loading items...</p> : null}
      {!loading && items.length === 0 ? <p>No items yet.</p> : null}
      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <p>{item.description ?? 'No description'}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
