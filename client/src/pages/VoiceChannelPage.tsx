import { useState } from 'react'
import { Volume2, MicOff, Mic, VideoOff, PhoneOff, Settings, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { useAuth } from '../store/auth'

interface Props {
  channel: { id: string; name: string; type: string }
  serverId: string
}

export default function VoiceChannelPage({ channel, serverId }: Props) {
  const { user } = useAuth()
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [showMembers, setShowMembers] = useState(true)

  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => api.get(`/servers/${serverId}/members`).then(r => r.data),
    enabled: !!serverId,
  })

  const onlineMembers = members.filter((m: any) => m.status === 'online').slice(0, 8)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-fc-bg shadow-sm flex-shrink-0 min-h-[48px]">
          <Volume2 size={18} className="text-fc-muted flex-shrink-0" />
          <span className="font-semibold text-white">{channel.name}</span>
          {channel.type === 'stage' && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">Scène</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-1.5 rounded hover:bg-fc-hover transition ${showMembers ? 'text-white' : 'text-fc-muted hover:text-white'}`}
            >
              <Users size={18} />
            </button>
          </div>
        </div>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          {!joined ? (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-fc-accent/20 flex items-center justify-center">
                  <Volume2 size={40} className="text-fc-accent" />
                </div>
                <h2 className="text-2xl font-bold text-white">{channel.name}</h2>
                <p className="text-fc-muted text-sm">Canal vocal — {onlineMembers.length} membre(s) en ligne</p>

                {onlineMembers.length > 0 && (
                  <div className="flex -space-x-2">
                    {onlineMembers.slice(0, 5).map((m: any) => (
                      <div
                        key={m.user_id}
                        title={m.username}
                        className="w-8 h-8 rounded-full bg-fc-accent border-2 border-fc-bg flex items-center justify-center text-xs font-bold text-white"
                      >
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {onlineMembers.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-fc-hover border-2 border-fc-bg flex items-center justify-center text-xs text-fc-muted">
                        +{onlineMembers.length - 5}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setJoined(true)}
                  className="px-6 py-3 bg-fc-green hover:bg-green-500 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <Volume2 size={18} />
                  Rejoindre le vocal
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Zone participants */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {/* Soi-même */}
                <div className="relative flex flex-col items-center gap-2">
                  <div className={`w-20 h-20 rounded-full bg-fc-accent flex items-center justify-center text-2xl font-bold text-white border-4 ${muted ? 'border-red-500' : 'border-fc-green'}`}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-white font-medium">{user?.username} (Vous)</span>
                  {muted && <MicOff size={14} className="text-red-400 absolute top-0 right-0" />}
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex items-center gap-3 p-4 bg-fc-bg rounded-2xl">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`p-3 rounded-full transition ${muted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-fc-hover text-white hover:bg-fc-hover/80'}`}
                  title={muted ? 'Activer le micro' : 'Couper le micro'}
                >
                  {muted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  onClick={() => setDeafened(!deafened)}
                  className={`p-3 rounded-full transition ${deafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-fc-hover text-white hover:bg-fc-hover/80'}`}
                  title={deafened ? 'Activer le son' : 'Couper le son'}
                >
                  {deafened ? <VideoOff size={20} /> : <Volume2 size={20} />}
                </button>
                <button className="p-3 rounded-full bg-fc-hover text-white hover:bg-fc-hover/80 transition" title="Paramètres audio">
                  <Settings size={20} />
                </button>
                <button
                  onClick={() => setJoined(false)}
                  className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                  title="Quitter le vocal"
                >
                  <PhoneOff size={20} />
                </button>
              </div>

              <p className="text-xs text-fc-muted mt-2">
                La voix en temps réel nécessite un serveur TURN dédié — bientôt disponible
              </p>
            </>
          )}
        </div>
      </div>

      {/* Membres connectés */}
      {showMembers && (
        <div className="w-60 bg-fc-channel border-l border-fc-bg flex flex-col overflow-y-auto">
          <div className="px-3 py-2 border-b border-fc-bg">
            <span className="text-xs font-semibold text-fc-muted uppercase tracking-wide">Dans le vocal</span>
          </div>
          {joined && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-fc-hover transition">
                <div className="w-8 h-8 rounded-full bg-fc-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{user?.username}</div>
                  <div className="text-xs text-fc-muted flex items-center gap-1">
                    {muted ? <MicOff size={10} className="text-red-400" /> : <Mic size={10} className="text-fc-green" />}
                    {muted ? 'Micro coupé' : 'Micro actif'}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!joined && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-fc-muted text-center p-4">Rejoignez le canal pour voir les participants</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
