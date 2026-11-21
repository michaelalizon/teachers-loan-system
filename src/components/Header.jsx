
import { Search, Bell, ChevronDown } from 'lucide-react'

function Header() {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">

      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Welcome back, Administrator
        </p>
      </div>

      <div className="flex items-center gap-5">

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-64 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Bell size={21} />

          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Administrator */}
        <div className="flex items-center gap-3 border-l pl-5 border-slate-200">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
            AD
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Administrator
            </p>
            <p className="text-xs text-slate-500">
              System Admin
            </p>
          </div>

          <ChevronDown size={16} className="text-slate-400" />
        </div>

      </div>
    </header>
  )
}

export default Header
