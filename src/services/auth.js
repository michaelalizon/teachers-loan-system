
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword
} from 'firebase/auth'

import { auth } from '../firebase'

// Register a regular account
export async function registerAccount(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

// Register the first Administrator account
export async function registerAdministratorAccount(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await sendEmailVerification(result.user)
  return result.user
}

// Send email verification again
export async function resendVerificationEmail() {
  const user = auth.currentUser
  if (!user) throw new Error('No account is currently signed in.')
  await sendEmailVerification(user)
}

// Refresh account verification status
export async function refreshAccountVerification() {
  const user = auth.currentUser
  if (!user) throw new Error('No account is currently signed in.')
  await reload(user)
  return user.emailVerified
}

// Request Administrator email change without changing password
export async function requestAccountEmailChange(newEmail, currentPassword) {
  const user = auth.currentUser

  if (!user || !user.email) {
    throw new Error('No Administrator account is currently signed in.')
  }

  const normalizedEmail = newEmail.trim().toLowerCase()

  if (!normalizedEmail) throw new Error('Enter your new email address.')
  if (!currentPassword) throw new Error('Enter your current password.')

  if (normalizedEmail === user.email.trim().toLowerCase()) {
    throw new Error('Your new email must be different from your current email.')
  }

  try {
    // Check Google Sheets for an email assigned to another account
    const idToken = await user.getIdToken(true)

    const response = await fetch('/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'checkAdminEmailAvailability',
        newEmail: normalizedEmail,
        idToken
      })
    })

    const result = await response.json()

    if (!result.success || !result.available) {
      throw new Error(
        result.message || 'This email is already assigned to another account.'
      )
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    )

    await reauthenticateWithCredential(user, credential)
    await verifyBeforeUpdateEmail(user, normalizedEmail)

    return {
      success: true,
      message: 'Verification email sent. Your password has NOT been changed.'
    }
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered to another Firebase account.')
    }

    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Your current password is incorrect.')
    }

    if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.')
    }

    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please log out and log in again before changing your email.')
    }

    throw new Error(error.message || 'Unable to request the email change.')
  }
}

// Change Administrator password separately
export async function changeAccountPassword(currentPassword, newPassword) {
  const user = auth.currentUser

  if (!user || !user.email) {
    throw new Error('No account is currently signed in.')
  }

  if (!currentPassword || !newPassword) {
    throw new Error('Complete all password fields.')
  }

  if (newPassword.length < 6) {
    throw new Error('Your new password must contain at least 6 characters.')
  }

  if (currentPassword === newPassword) {
    throw new Error('Your new password must be different from your current password.')
  }

  try {
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    )

    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword)

    return {
      success: true,
      message: 'Your password has been changed successfully.'
    }
  } catch (error) {
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Your current password is incorrect.')
    }

    if (error.code === 'auth/weak-password') {
      throw new Error('Your new password is too weak.')
    }

    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please log out and log in again before changing your password.')
    }

    throw new Error(error.message || 'Unable to change your password.')
  }
}

// Refresh account after email verification
export async function refreshChangedEmail() {
  const user = auth.currentUser
  if (!user) throw new Error('No account is currently signed in.')

  await reload(user)

  return {
    email: user.email,
    emailVerified: user.emailVerified
  }
}

// Sign in
export async function loginAccount(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

// Sign out
export async function logoutAccount() {
  await signOut(auth)
}

// Monitor login status
export function monitorAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

// Send password reset email
export async function resetAccountPassword(email) {
  await sendPasswordResetEmail(auth, email)
}
