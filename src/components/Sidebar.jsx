
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  X
} from 'lucide-react'

function Sidebar({ currentPage, setCurrentPage, userRole }) {
  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Teachers', icon: Users },
    { name: 'Registrations', icon: UserPlus },
    { name: 'Loans', icon: Wallet },
    { name: 'Payments', icon: CreditCard },
    { name: 'Reports', icon: BarChart3 }
  ]

  const adminOnly = ['Registrations', 'Teachers', 'Settings']

  const visibleNavigation = navigation.filter(item => {
    if (adminOnly.includes(item.name)) {
      return userRole === 'Administrator'
    }
    return true
  })

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Wallet size={23} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              Teachers Loan
            </h1>
            <p className="text-xs text-slate-400">
              Management System
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <nav className="space-y-1">
          {visibleNavigation.map(item => {
            const Icon = item.icon
            const active = currentPage === item.name

            return (
              <button
                key={item.name}
                onClick={() => setCurrentPage(item.name)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200 p-4">
        <button
          onClick={() => setCurrentPage('Settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
            currentPage === 'Settings'
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings size={19} />
          Settings
        </button>

        <p className="mt-4 px-3 text-xs text-slate-400">
          {userRole}
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
