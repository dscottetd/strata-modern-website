import SignalHero from './SignalHero'
import DoubleHelixHero from './DoubleHelixHero'

export default function App() {
  if (typeof window === 'undefined') {
    return <SignalHero />
  }

  const path = window.location.pathname.toLowerCase()
  const showHelix = path.includes('helix') || path.includes('life') || path.includes('science') || path.includes('sequence')

  return showHelix ? <DoubleHelixHero /> : <SignalHero />
}
