// src/Router.tsx
import { Routes, Route } from 'react-router-dom'
import App from './App'
import PrivacyPolicy from './PrivacyPolicy'
import ArtistPricingGuide from './ArtistPricingGuide'
import About from './About'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacypolicy" element={<PrivacyPolicy />} />
      <Route path="/artist-pricing-guide" element={<ArtistPricingGuide />} />

    </Routes>
  )
}
