import { initializeApp } from 'firebase/app'
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

export const app = initializeApp(firebaseConfig)

isSupported().then((ok) => {
  if (ok) getAnalytics(app)
})
