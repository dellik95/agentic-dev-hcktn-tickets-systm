import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

// Generic trail of {label, to?} — no knowledge of teams/epics/tickets. Items with `to` are
// clickable links; the rest (typically just the current page) render as muted plain text.
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-gray-400 dark:text-gray-600">/</span>}
          {item.to ? (
            <Link to={item.to} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
