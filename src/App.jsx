
import { useEffect, useState } from 'react'
import {
  LogOut,
  LoaderCircle,
  ShieldAlert
} from 'lucide-react'

import Sidebar from './components/Sidebar'
import Header from './components/Header'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Teachers from './pages/Teachers'
import Registrations from './pages/Registrations'
import Loans from './pages/Loans'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import TeacherPortal from './pages/TeacherPortal'

import { monitorAuth, logoutAccount } from './services/auth'
import { verifyUserSession } from './services/api'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    const unsubscribe = monitorAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        if (active) {
          setCurrentUser(null)
          setAuthError('')
          setCheckingAuth(false)
        }
        return
      }

      if (sessionStorage.getItem('adminSetupMode') === 'true') {
        if (active) {
          setCurrentUser(null)
          setAuthError('')
          setCheckingAuth(false)
        }
        return
      }

      try {
        if (active) {
          setCheckingAuth(true)
          setAuthError('')
        }

        const user = await verifyUserSession()

        if (active) {
          setCurrentUser(user)
          setCurrentPage('Dashboard')
        }
      } catch (error) {
        if (active) {
          setCurrentUser(null)
          setAuthError(error.message || 'Unable to verify your account.')
        }

        await logoutAccount().catch(() => {})
      } finally {
        if (active) setCheckingAuth(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function handleLogout() {
    try {
      sessionStorage.removeItem('adminSetupMode')
      await logoutAccount()
      setCurrentUser(null)
      setCurrentPage('Dashboard')
      setAuthError('')
    } catch {
      setAuthError('Unable to log out. Please try again.')
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <LoaderCircle className="animate-spin text-blue-600" size={36} />
        <p className="text-sm font-medium text-slate-600">
          Checking your account...
        </p>
        <p className="text-xs text-slate-400">
          Teachers Loan Management System
        </p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div>
        {authError && (
          <div className="mx-auto max-w-md px-6 pt-4">
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {authError}
            </p>
          </div>
        )}
        <Login />
      </div>
    )
  }

  if (
    currentUser.role === 'Regular Teacher' ||
    currentUser.role === 'Job Order Personnel'
  ) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="font-bold text-slate-800">
              Teachers Loan Portal
            </h1>
            <p className="text-xs text-slate-500">
              {currentUser.role}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </header>

        <main className="mx-auto max-w-6xl">
          <TeacherPortal currentUser={currentUser} />
        </main>
      </div>
    )
  }

  if (
    currentUser.role !== 'Administrator' &&
    currentUser.role !== 'Loan Officer'
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-red-500" size={40} />
          <h2 className="mt-4 text-xl font-bold text-slate-800">
            Unauthorized Role
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Your account does not have permission to access this dashboard.
          </p>
          <button
            onClick={handleLogout}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole={currentUser.role}
      />

      <div className="min-w-0 flex-1">
        <Header />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-8 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {currentUser.role}
            </p>
            <p className="text-xs text-slate-400">
              {currentUser.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>

        <main className="p-8">
          {currentPage === 'Dashboard' && <Dashboard />}
          {currentPage === 'Teachers' && <Teachers />}
          {currentPage === 'Registrations' && <Registrations />}
          {currentPage === 'Loans' && <Loans />}
          {currentPage === 'Payments' && <Payments />}
          {currentPage === 'Reports' && <Reports />}
          {currentPage === 'Settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default App
