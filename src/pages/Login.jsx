
import { useEffect, useState } from 'react'
import {
  GraduationCap,
  LockKeyhole,
  Mail,
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react'

import {
  loginAccount,
  logoutAccount,
  registerAccount,
  registerAdministratorAccount,
  resetAccountPassword,
  refreshAccountVerification,
  resendVerificationEmail
} from '../services/auth'

import {
  verifyUserSession,
  registerFirebaseAccount,
  checkRegistrationEmail,
  setupFirstAdministrator,
  checkAdministratorExists
} from '../services/api'

const EMPTY_PROFILE = {
  fullName: '',
  email: '',
  address: '',
  contactNumber: '',
  department: '',
  position: ''
}

function Login() {
  const [mode, setMode] = useState(
    sessionStorage.getItem('adminSetupMode') === 'true'
      ? 'adminVerify'
      : 'login'
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [profile, setProfile] = useState(EMPTY_PROFILE)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [administratorExists, setAdministratorExists] = useState(null)
  const [checkingAdministrator, setCheckingAdministrator] = useState(true)

  // Login notices disappear after five seconds.
  useEffect(() => {
    if (!error && !success) return

    const timer = setTimeout(() => {
      setError('')
      setSuccess('')
    }, 5000)

    return () => clearTimeout(timer)
  }, [error, success])

  useEffect(() => {
    let active = true

    async function checkSetupStatus() {
      try {
        const exists = await checkAdministratorExists()
        if (active) setAdministratorExists(exists)
      } catch (err) {
        console.error('Administrator status check failed:', err)
        if (active) setAdministratorExists(true)
      } finally {
        if (active) setCheckingAdministrator(false)
      }
    }

    checkSetupStatus()

    return () => {
      active = false
    }
  }, [])

  function changeMode(newMode) {
    setMode(newMode)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
    setProfile(EMPTY_PROFILE)
    setEmail('')
  }

  function updateProfile(field, value) {
    setProfile(previous => ({
      ...previous,
      [field]: value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const cleanEmail = (
        mode === 'register' ? profile.email : email
      ).trim().toLowerCase()

      if (mode === 'login') {
        sessionStorage.removeItem('adminSetupMode')
        await loginAccount(cleanEmail, password)
        await verifyUserSession()
      }

      if (mode === 'register') {
        const cleanProfile = {
          fullName: profile.fullName.trim(),
          email: cleanEmail,
          address: profile.address.trim(),
          contactNumber: profile.contactNumber.trim(),
          department: profile.department.trim(),
          position: profile.position.trim(),
          employeeType: 'Regular Teacher'
        }

        const missing = [
          ['fullName', 'Full Name'],
          ['email', 'Email'],
          ['address', 'Address'],
          ['contactNumber', 'Contact Number'],
          ['department', 'Department'],
          ['position', 'Position']
        ].filter(([key]) => !cleanProfile[key])

        if (missing.length) {
          throw new Error(
            `Please complete: ${missing.map(item => item[1]).join(', ')}.`
          )
        }

        if (password.length < 6) {
          throw new Error('Password must contain at least 6 characters.')
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        // IMPORTANT: Check Google Sheets before creating Firebase account.
        const availability = await checkRegistrationEmail(cleanEmail)

        if (!availability.available) {
          throw new Error(
            availability.message || 'This email is already registered.'
          )
        }

        // Create Firebase account only after the backend approves the email.
        await registerAccount(cleanEmail, password)

        try {
          await registerFirebaseAccount(cleanProfile)
          await logoutAccount()

          setPassword('')
          setConfirmPassword('')
          setProfile(EMPTY_PROFILE)
          setMode('login')

          setSuccess(
            availability.walkIn
              ? 'Account created and linked to your walk-in registration. You can now sign in if your registration has been approved.'
              : 'Registration submitted successfully. Your account is waiting for administrator approval.'
          )
        } catch (registrationError) {
          await logoutAccount().catch(() => {})
          throw new Error(
            `${registrationError.message} Your Firebase account may have been created, but the employee record was not saved. Contact the administrator before trying again.`
          )
        }
      }

      if (mode === 'forgot') {
        await resetAccountPassword(cleanEmail)
        setMode('login')
        setSuccess('Password reset instructions have been sent to your email.')
      }

      if (mode === 'adminSetup') {
        const exists = await checkAdministratorExists()

        if (exists) {
          setAdministratorExists(true)
          setMode('login')
          throw new Error(
            'An Administrator account already exists. First-time setup is no longer available.'
          )
        }

        if (password.length < 6) {
          throw new Error('Password must contain at least 6 characters.')
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        if (!setupSecret.trim()) {
          throw new Error('Enter the one-time setup password.')
        }

        sessionStorage.setItem('adminSetupMode', 'true')

        try {
          await registerAdministratorAccount(cleanEmail, password)

          setMode('adminVerify')
          setPassword('')
          setConfirmPassword('')
          setSuccess(
            'Administrator account created in Firebase. Check your email and verify your email address before continuing.'
          )
        } catch (registrationError) {
          sessionStorage.removeItem('adminSetupMode')
          await logoutAccount().catch(() => {})
          throw registrationError
        }
      }
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/network-request-failed': 'Network connection failed.',
        'auth/email-already-in-use': 'This email already has an account.',
        'auth/weak-password': 'Password must contain at least 6 characters.'
      }

      setError(messages[err.code] || err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteAdminSetup() {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!setupSecret.trim()) {
        throw new Error('Enter the one-time setup password.')
      }

      const verified = await refreshAccountVerification()

      if (!verified) {
        throw new Error(
          'Your email is not verified yet. Open the verification email first.'
        )
      }

      await setupFirstAdministrator(setupSecret.trim())

      sessionStorage.removeItem('adminSetupMode')
      await logoutAccount()

      setAdministratorExists(true)
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setSetupSecret('')

      setSuccess(
        'First Administrator successfully created. You can now sign in using your Administrator email and password.'
      )
    } catch (err) {
      setError(err.message || 'Administrator setup failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await resendVerificationEmail()
      setSuccess('A new verification email has been sent.')
    } catch (err) {
      setError(err.message || 'Unable to send verification email.')
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login: 'Welcome Back',
    register: 'Create Your Account',
    forgot: 'Reset Password',
    adminSetup: 'Initial Administrator Setup',
    adminVerify: 'Verify Administrator Email'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white">
            {mode === 'adminSetup' || mode === 'adminVerify'
              ? <ShieldCheck size={30} />
              : <GraduationCap size={30} />}
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            Teachers Loan System
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {titles[mode]}
          </p>
        </div>

        {mode === 'adminVerify' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <p className="font-semibold">Email verification required</p>
              <p className="mt-1">
                Open the verification email sent to your Administrator
                email address. After verifying it, return here and enter
                your one-time setup password.
              </p>
            </div>

            <TextField
              label="One-time Setup Password"
              type="password"
              value={setupSecret}
              onChange={setSetupSecret}
              placeholder="Enter setup password"
            />

            <Notices error={error} success={success} />

            <button
              type="button"
              onClick={handleCompleteAdminSetup}
              disabled={loading}
              className="primary-button"
            >
              {loading ? 'Checking...' : 'Complete Administrator Setup'}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Resend Verification Email
            </button>

            <button
              type="button"
              onClick={async () => {
                sessionStorage.removeItem('adminSetupMode')
                await logoutAccount()
                changeMode('login')
              }}
              className="flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={16} /> Cancel Setup
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Full Name"
                      icon={<User size={18} />}
                      value={profile.fullName}
                      onChange={v => updateProfile('fullName', v)}
                      placeholder="Enter complete name"
                    />

                    <TextField
                      label="Email Address"
                      icon={<Mail size={18} />}
                      type="email"
                      value={profile.email}
                      onChange={v => updateProfile('email', v)}
                      placeholder="Enter your email"
                    />

                    <TextField
                      label="Contact Number"
                      icon={<Phone size={18} />}
                      value={profile.contactNumber}
                      onChange={v => updateProfile('contactNumber', v)}
                      placeholder="Enter contact number"
                    />

                    <TextField
                      label="Address"
                      icon={<MapPin size={18} />}
                      value={profile.address}
                      onChange={v => updateProfile('address', v)}
                      placeholder="Enter complete address"
                    />

                    <TextField
                      label="Department"
                      icon={<Briefcase size={18} />}
                      value={profile.department}
                      onChange={v => updateProfile('department', v)}
                      placeholder="Enter department"
                    />

                    <TextField
                      label="Position"
                      icon={<GraduationCap size={18} />}
                      value={profile.position}
                      onChange={v => updateProfile('position', v)}
                      placeholder="Enter position"
                    />
                  </div>

                  <div className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                    Account type: Regular Teacher. Your Employee ID will
                    be assigned by the administrator during review.
                  </div>
                </>
              )}

              {mode !== 'register' && (
                <TextField
                  label="Email Address"
                  icon={<Mail size={18} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter your email"
                />
              )}

              {mode !== 'forgot' && (
                <TextField
                  label="Password"
                  icon={<LockKeyhole size={18} />}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                />
              )}

              {(mode === 'register' || mode === 'adminSetup') && (
                <TextField
                  label="Confirm Password"
                  icon={<LockKeyhole size={18} />}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm your password"
                />
              )}

              {mode === 'adminSetup' && (
                <>
                  <TextField
                    label="One-time Setup Password"
                    type="password"
                    value={setupSecret}
                    onChange={setSetupSecret}
                    placeholder="Enter setup password"
                  />

                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    This process is only for the first Administrator.
                    Your email must be verified before setup can be completed.
                  </p>
                </>
              )}

              <Notices error={error} success={success} />

              <button
                type="submit"
                disabled={
                  loading ||
                  (mode === 'adminSetup' && administratorExists !== false)
                }
                className="primary-button"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                      ? 'Create Account'
                      : mode === 'adminSetup'
                        ? 'Create First Administrator'
                        : 'Send Reset Instructions'}
              </button>
            </form>

            <div className="mt-5 space-y-3 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    className="text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-slate-500">Don't have an account?</p>
                    <button
                      type="button"
                      onClick={() => changeMode('register')}
                      className="mt-2 inline-flex items-center gap-2 font-semibold text-blue-600 hover:underline"
                    >
                      <UserPlus size={16} /> Create Account
                    </button>
                  </div>

                  {!checkingAdministrator && administratorExists === false && (
                    <div className="border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => changeMode('adminSetup')}
                        className="font-semibold text-slate-600 hover:text-blue-600"
                      >
                        Set Up First Administrator
                      </button>
                    </div>
                  )}
                </>
              )}

              {mode !== 'login' && (
                <button
                  type="button"
                  onClick={() => changeMode('login')}
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Teachers Loan Management System
        </p>
      </div>

      <style>{`
        .primary-button {
          width: 100%;
          border-radius: 0.5rem;
          background: #2563eb;
          padding: 0.85rem;
          font-weight: 600;
          color: white;
        }
        .primary-button:hover { background: #1d4ed8; }
        .primary-button:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 focus-within:border-blue-500">
        {icon && <span className="text-slate-400">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={type === 'password' ? 6 : undefined}
          className="w-full py-3 text-sm outline-none"
        />
      </div>
    </label>
  )
}

function Notices({ error, success }) {
  return (
    <>
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}
    </>
  )
}

export default Login
