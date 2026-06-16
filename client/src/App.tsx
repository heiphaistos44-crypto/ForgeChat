import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useWs } from './store/ws'
import { usePresence } from './store/presence'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InvitePage from './pages/InvitePage'
import SettingsPage from './pages/SettingsPage'
import MainLayout from './components/layout/MainLayout'
import ChannelPage from './pages/ChannelPage'
import DMPage from './pages/DMPage'
import FriendsPage from './pages/FriendsPage'
import QuickSwitcher from './components/QuickSwitcher'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-fc-bg">
      <div className="w-8 h-8 border-2 border-fc-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppInner() {
  const { fetchMe, user } = useAuth()
  const { connect, disconnect, on } = useWs()
  const setStatus = usePresence(s => s.setStatus)
  const nav = useNavigate()
  const [showQuickSwitcher, setShowQuickSwitcher] = React.useState(false)

  useEffect(() => { fetchMe() }, [])

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('access_token')
    if (token) connect(token)
    return () => disconnect()
  }, [user?.id])

  useEffect(() => {
    const off = on('PRESENCE_UPDATE', (d: any) => setStatus(d.user_id, d.status))
    return off
  }, [])

  // Raccourcis clavier globaux
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowQuickSwitcher(q => !q)
      }
      if (e.key === 'Escape') setShowQuickSwitcher(false)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        nav('/settings')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nav])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>
          <Route index element={<FriendsPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="dms/:dmId" element={<DMPage />} />
          <Route path="servers/:serverId" element={<ChannelPage />} />
          <Route path="servers/:serverId/channels/:channelId" element={<ChannelPage />} />
        </Route>
      </Routes>
      {showQuickSwitcher && <QuickSwitcher onClose={() => setShowQuickSwitcher(false)} />}
    </>
  )
}

import React from 'react'

export default function App() {

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
