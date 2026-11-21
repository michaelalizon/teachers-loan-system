
import { auth } from '../firebase'

// Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyj0x9x-3Q8BbLTB1tZx8xzVBp7-76rYl7VcnGuc_KxxceIbkOp3z635jneTk3EQ9U1ow/exec'

async function publicRequest(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data),
    redirect: 'follow'
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed.')
  }

  return result
}

export async function checkRegistrationEmail(email) {
  return publicRequest({
    action: 'checkRegistrationEmail',
    email: email.trim().toLowerCase()
  })
}

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
    }),
    redirect: 'follow'
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed.')
  }

  return result
}

export async function testBackendConnection() {
  const response = await fetch(`${API_URL}?action=health`, {
    redirect: 'follow'
  })

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
