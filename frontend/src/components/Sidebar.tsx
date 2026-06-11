import type { Page } from '../App'

interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

const Sidebar = ({ activePage, onNavigate }: SidebarProps) => {
  const pages: { id: Page; label: string }[] = [
    { id: 'game', label: 'Starship' },
    { id: 'home', label: 'Home' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-300 flex flex-col">
      <div className="p-6 border-b border-gray-300">
        <div className="flex items-center gap-3">
          <img
            src="/applied-logo.png"
            alt="Applied Intuition"
            className="h-10 w-auto"
          />
          <div className="text-xl font-bold text-gray-900">Starship</div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                onClick={() => onNavigate(page.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activePage === page.id
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-300">
        <div className="text-xs text-gray-500">Starship v1.0</div>
      </div>
    </div>
  )
}

export default Sidebar
