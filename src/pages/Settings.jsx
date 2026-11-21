
import { useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Server,
  Mail,
  Clock,
  Fingerprint,
  Send,
  AlertCircle,
  Lock,
  KeyRound
} from 'lucide-react'

import { auth } from '../firebase'
import { testBackendConnection } from '../services/api'
import {
  requestAccountEmailChange,
  changeAccountPassword
} from '../services/auth'

export default function Settings() {
  const [connection, setConnection] = useState('checking')
  const [message, setMessage] = useState('Checking backend connection...')
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const [currentEmail, setCurrentEmail] = useState(
    auth.currentUser?.email || ''
  )
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [emailMessageType, setEmailMessageType] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState('')

  const user = auth.currentUser

  async function checkConnection() {
    if (checking) return

    setChecking(true)
    setConnection('checking')
    setMessage('Connecting to the backend service...')

    try {
      const result = await testBackendConnection()
      setConnection('connected')
      setMessage(result.message || 'Backend connection successful.')
      setLastChecked(new Date())
    } catch (error) {
      setConnection('error')
      setMessage(error.message || 'Unable to connect to the backend.')
      setLastChecked(new Date())
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const formatDate = (date) => {
    if (!date) return 'Not checked yet'

    return date.toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  async function handleRequestEmailChange(event) {
    event.preventDefault()
    setEmailMessage('')
    setEmailMessageType('')

    const requestedEmail = newEmail.trim().toLowerCase()

    if (!requestedEmail || !emailPassword) {
      setEmailMessage('Please complete all fields.')
      setEmailMessageType('error')
      return
    }

    if (requestedEmail === currentEmail.trim().toLowerCase()) {
      setEmailMessage('Your new email must be different from your current email.')
      setEmailMessageType('error')
      return
    }

    setEmailLoading(true)

    try {
      const result = await requestAccountEmailChange(
        requestedEmail,
        emailPassword
      )

      setEmailPassword('')
      setNewEmail('')
      setEmailMessage(result.message)
      setEmailMessageType('success')
    } catch (error) {
      setEmailMessage(error.message || 'Unable to request the email change.')
      setEmailMessageType('error')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordMessageType('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Please complete all password fields.')
      setPasswordMessageType('error')
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Your new password must contain at least 6 characters.')
      setPasswordMessageType('error')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('The new passwords do not match.')
      setPasswordMessageType('error')
      return
    }

    setPasswordLoading(true)

    try {
      const result = await changeAccountPassword(
        currentPassword,
        newPassword
      )

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage(result.message)
      setPasswordMessageType('success')
    } catch (error) {
      setPasswordMessage(error.message || 'Unable to change your password.')
      setPasswordMessageType('error')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500">
              Account information, database details, and system connection
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <User className="text-blue-600" size={21} />
            <h2 className="font-semibold text-gray-900">Account Information</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Signed-in email
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                <Mail size={16} className="text-gray-400" />
                <span className="break-all">{currentEmail || 'No account information'}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Firebase UID
              </p>
              <div className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                <Fingerprint size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <span className="break-all">{user?.uid || 'Not available'}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Authentication
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                <ShieldCheck size={16} />
                Firebase Authentication
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Account status
              </p>
              <p className="mt-2 text-sm font-semibold text-green-700">Signed in</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Database className="text-blue-600" size={21} />
            <h2 className="font-semibold text-gray-900">Database Information</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Database provider</p>
              <p className="mt-2 text-sm font-medium text-gray-800">Google Sheets</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Backend service</p>
              <p className="mt-2 text-sm font-medium text-gray-800">Google Apps Script</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Data storage</p>
              <p className="mt-2 text-sm font-medium text-gray-800">Cloud-based spreadsheet</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Authentication provider</p>
              <p className="mt-2 text-sm font-medium text-gray-800">Firebase</p>
            </div>
          </div>
        </section>
      </div>

      {/* Change Email */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Mail className="text-blue-600" size={21} />
          <div>
            <h2 className="font-semibold text-gray-900">Change Administrator Email</h2>
            <p className="mt-1 text-sm text-gray-500">
              Request an email change using your current password.
            </p>
          </div>
        </div>

        <form onSubmit={handleRequestEmailChange} className="max-w-2xl space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Current email address</label>
            <input
              type="email"
              value={currentEmail}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">New email address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="Enter your new email address"
              required
              disabled={emailLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Current password</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              placeholder="Enter your current password"
              required
              disabled={emailLoading}
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={emailLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {emailLoading ? 'Please wait...' : 'Send Verification Email'}
          </button>
        </form>

        {emailMessage && (
          <div className={`mt-5 flex items-start gap-3 rounded-lg border p-4 text-sm ${
            emailMessageType === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {emailMessageType === 'success'
              ? <CheckCircle size={18} className="mt-0.5 shrink-0" />
              : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <p>{emailMessage}</p>
          </div>
        )}

        <div className="mt-5 rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          <strong>How it works:</strong>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Enter your new email address and current password.</li>
            <li>Click Send Verification Email.</li>
            <li>Open the verification link sent to your new email.</li>
            <li>Log in using your new email and existing password.</li>
          </ol>
          <p className="mt-2">
            Your password will not change during this process. Your email changes
            only after verification.
          </p>
        </div>
      </section>

      {/* Change Password */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <KeyRound className="text-blue-600" size={21} />
          <div>
            <h2 className="font-semibold text-gray-900">Change Administrator Password</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update your password separately from your email address.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="max-w-2xl space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Lock size={15} />
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              required
              disabled={passwordLoading}
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Lock size={15} />
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              disabled={passwordLoading}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Lock size={15} />
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              disabled={passwordLoading}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyRound size={16} />
            {passwordLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>

        {passwordMessage && (
          <div className={`mt-5 flex items-start gap-3 rounded-lg border p-4 text-sm ${
            passwordMessageType === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {passwordMessageType === 'success'
              ? <CheckCircle size={18} className="mt-0.5 shrink-0" />
              : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <p>{passwordMessage}</p>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-gray-500">
          Changing your password does not change your email address. Your current
          password is required to authorize this operation.
        </p>
      </section>

      {/* Backend Connection */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Server className="text-blue-600" size={21} />
          <h2 className="font-semibold text-gray-900">Backend Connection</h2>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {connection === 'connected' ? (
              <CheckCircle className="mt-0.5 shrink-0 text-green-600" size={23} />
            ) : connection === 'error' ? (
              <XCircle className="mt-0.5 shrink-0 text-red-600" size={23} />
            ) : (
              <RefreshCw className="mt-0.5 shrink-0 animate-spin text-blue-600" size={23} />
            )}

            <div>
              <p className="font-semibold text-gray-900">
                {connection === 'connected'
                  ? 'Backend Connected'
                  : connection === 'error'
                  ? 'Connection Failed'
                  : 'Checking Connection'}
              </p>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <Clock size={14} />
                Last checked: {formatDate(lastChecked)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={checkConnection}
            disabled={checking}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking...' : 'Test Connection'}
          </button>
        </div>
      </section>

      {/* Configuration Notice */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-900">Configuration Notice</h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Loan interest rates, repayment terms, fees, and other official
          loan policies must follow the institution's approved guidelines.
          These settings are not yet editable from this page.
        </p>
      </section>
    </div>
  )
}
