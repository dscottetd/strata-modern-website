import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/500.css'
import App from './App'

const root = document.getElementById('root')!
const app = <StrictMode><App /></StrictMode>

if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
