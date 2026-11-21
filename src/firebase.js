
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCP_pdMsImdNVorM1FEAUK--fSCz-haNOw",
  authDomain: "teachers-loan-system.firebaseapp.com",
  projectId: "teachers-loan-system",
  storageBucket: "teachers-loan-system.firebasestorage.app",
  messagingSenderId: "208955145448",
  appId: "1:208955145448:web:726a3f9ad45b5dc7d1dd5d",
  measurementId: "G-X6TZJQ2KV2"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export default app
