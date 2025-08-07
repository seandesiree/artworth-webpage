// src/Router.tsx
import { Routes, Route } from 'react-router-dom'
import App from './App'
import PrivacyPolicy from './PrivacyPolicy'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/privacypolicy" element={<PrivacyPolicy />} />
    </Routes>
  )
}
