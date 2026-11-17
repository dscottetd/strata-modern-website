import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Web API keys for Firebase are public identifiers, not secrets.
const firebaseConfig = {
  apiKey: 'AIzaSyBrrOaFFEPEMyfQKJyegEC8mozwbxdd5bk',
  authDomain: 'strata-scientific-website.firebaseapp.com',
  projectId: 'strata-scientific-website',
  storageBucket: 'strata-scientific-website.firebasestorage.app',
  messagingSenderId: '756584465961',
  appId: '1:756584465961:web:3831cdd839f5d477befe38',
  measurementId: 'G-QCTZ39N1P2',
}

export const app: FirebaseApp | null =
  typeof window !== 'undefined' && import.meta.env.PROD ? initializeApp(firebaseConfig) : null

export async function initFirebase() {
  if (!app || typeof window === 'undefined' || !import.meta.env.PROD) return null

  try {
    const analyticsSupported = await isSupported()
    if (!analyticsSupported) return null
    return getAnalytics(app)
  } catch (error) {
    console.warn('Firebase analytics could not be initialized:', error)
    return null
  }
}

void initFirebase()
