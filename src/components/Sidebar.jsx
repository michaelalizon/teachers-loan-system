
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Teachers', icon: Users },
  { name: 'Registrations', icon: ClipboardList },
  { name: 'Loans', icon: Wallet },
  { name: 'Payments', icon: CreditCard },
  { name: 'Reports', icon: BarChart3 },
]

export default function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-hidden bg-slate-900 text-white">
      <div className="shrink-0 border-b border-slate-700 px-6 py-6">
        <h1 className="text-xl font-bold">Teacher Loan</h1>
        <p className="mt-1 text-xs text-slate-400">
          Management System
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = currentPage === item.name

            return (
              <button
                key={item.name}
                onClick={() => setCurrentPage(item.name)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-700 bg-slate-900 p-4">
        <button
          onClick={() => setCurrentPage('Settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
            currentPage === 'Settings'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
