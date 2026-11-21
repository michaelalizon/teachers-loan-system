
import { auth } from '../firebase'

const API_URL = '/api'

async function publicRequest(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed.')
  }

  return result
}

// Public: check whether an email can register or link to a walk-in record.
export async function checkRegistrationEmail(email) {
  return publicRequest({
    action: 'checkRegistrationEmail',
    email: email.trim().toLowerCase()
  })
}

// Public: save a new Firebase registration or link an existing walk-in record.
export async function registerFirebaseAccount(profile) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Firebase account was not created.')
  }

  const idToken = await user.getIdToken(true)

  return publicRequest({
    action: 'registerFirebaseAccount',
    idToken,
    profile
  })
}

// Public request: does not require login.
export async function checkAdministratorExists() {
  const result = await publicRequest({
    action: 'checkAdministratorExists'
  })

  return result.administratorExists
}

export async function sendRequest(data, forceRefresh = false) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('You must sign in first.')
  }

  const idToken = await user.getIdToken(forceRefresh)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      ...data,
      idToken
    })
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed.')
  }

  return result
}

export async function testBackendConnection() {
  const response = await fetch(`${API_URL}?action=health`)
  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Backend connection failed.')
  }

  return result
}

export async function getEmployees() {
  const result = await sendRequest({
    action: 'getEmployees'
  })

  return result.employees
}

export async function verifyUserSession() {
  const result = await sendRequest({
    action: 'verifySession'
  }, true)

  return result.user
}

// Kept for compatibility with any older components.
// New registrations should use registerFirebaseAccount(profile).
export async function registerUser() {
  throw new Error(
    'The old registration method is no longer used. Submit the employee profile instead.'
  )
}

export async function setupFirstAdministrator(setupSecret) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('Please create an account first.')
  }

  await user.reload()

  if (!user.emailVerified) {
    throw new Error('Please verify your email before continuing.')
  }

  const idToken = await user.getIdToken(true)

  return publicRequest({
    action: 'setupFirstAdministrator',
    setupSecret,
    idToken
  })
}

export async function syncAdministratorEmail() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('You must sign in first.')
  }

  const idToken = await user.getIdToken(true)

  return publicRequest({
    action: 'syncAdministratorEmail',
    idToken
  })
}
