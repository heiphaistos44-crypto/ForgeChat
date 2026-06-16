import { Mic, MicOff, Headphones, Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-fc-green',
  idle: 'bg-fc-yellow',
  dnd: 'bg-fc-red',
  invisible: 'bg-fc-muted',
  offline: 'bg-fc-muted',
}

export default function UserPanel() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)

  if (!user) return null

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-2 bg-fc-bg/50 border-t border-fc-bg flex-shrink-0">
        {/* Avatar + nom */}
        <button
          onClick={() => nav('/settings')}
          className="flex items-center gap-2 flex-1 min-w-0 rounded px-1 py-0.5 hover:bg-fc-hover transition text-left"
          title="Paramètres (Ctrl+,)"
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-fc-accent flex items-center justify-center font-bold text-sm text-white">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                : user.username.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-fc-channel ${STATUS_COLORS[user.status] ?? 'bg-fc-muted'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user.username}</div>
            <div className="text-xs text-fc-muted">
              {user.custom_status || `#${user.discriminator}`}
            </div>
          </div>
        </button>

        {/* Contrôles */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setMuted(!muted)}
            className={`p-1.5 rounded hover:bg-fc-hover transition ${muted ? 'text-fc-red' : 'text-fc-muted hover:text-white'}`}
            title={muted ? 'Réactiver le micro' : 'Couper le micro'}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={() => setDeafened(!deafened)}
            className={`p-1.5 rounded hover:bg-fc-hover transition ${deafened ? 'text-fc-red' : 'text-fc-muted hover:text-white'}`}
            title={deafened ? 'Réactiver le son' : 'Couper le son'}
          >
            <Headphones size={16} />
          </button>
          <button
            onClick={() => nav('/settings')}
            className="p-1.5 rounded hover:bg-fc-hover text-fc-muted hover:text-white transition"
            title="Paramètres (Ctrl+,)"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

    </>
  )
}
