import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import BoardsPage from './pages/BoardsPage'
import BoardPage from './pages/BoardPage'
import ThreadPage from './pages/ThreadPage'
import AdminPage from './pages/AdminPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DemoPage from './pages/DemoPage'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgba(13, 20, 16, 0.95)',
          color: 'var(--text)',
          border: '1px solid rgba(0,255,136,0.15)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        },
        success: { iconTheme: { primary: '#00ff88', secondary: '#050a08' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#050a08' } },
      }}/>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 64px' }}>
        <Routes>
          <Route path="/"              element={<Landing />} />
          <Route path="/boards"        element={<BoardsPage />} />
          <Route path="/board/:slug"   element={<BoardPage />} />
          <Route path="/thread/:id"    element={<ThreadPage />} />
          <Route path="/admin"         element={<AdminPage />} />
          <Route path="/analytics"     element={<AnalyticsPage />} />
          <Route path="/demo"          element={<DemoPage />} />
        </Routes>
      </main>
    </div>
  )
}
