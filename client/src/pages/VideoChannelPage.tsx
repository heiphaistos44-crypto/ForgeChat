import { useState } from 'react'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users } from 'lucide-react'
import { useAuth } from '../store/auth'

interface Props {
  channel: { id: string; name: string }
  serverId: string
}

export default function VideoChannelPage({ channel }: Props) {
  const { user } = useAuth()
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [muted, setMuted] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 bg-black">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 flex-shrink-0 min-h-[48px] bg-fc-bg">
          <Video size={18} className="text-fc-muted flex-shrink-0" />
          <span className="font-semibold text-white">{channel.name}</span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">Vidéo</span>
          <div className="ml-auto">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-1.5 rounded hover:bg-fc-hover transition ${showSidebar ? 'text-white' : 'text-fc-muted hover:text-white'}`}
            >
              <Users size={18} />
            </button>
          </div>
        </div>

        {/* Zone vidéo */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
          {!joined ? (
            <div className="flex flex-col items-center gap-6 text-center p-8">
              <div className="w-28 h-28 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Video size={48} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{channel.name}</h2>
                <p className="text-fc-muted text-sm max-w-xs">
                  Canal vidéo — Participez aux appels vidéo et au partage d'écran
                </p>
              </div>
              <button
                onClick={() => setJoined(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Video size={18} />
                Rejoindre le canal vidéo
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {/* Grille vidéo */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className={`w-full max-w-2xl aspect-video bg-gray-800 rounded-xl border border-white/10 flex items-center justify-center relative`}>
                  {cameraOn ? (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <span className="text-fc-muted text-sm">Aperçu caméra</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-fc-accent flex items-center justify-center text-2xl font-bold text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user?.username}</span>
                      <span className="text-xs text-fc-muted">Caméra désactivée</span>
                    </div>
                  )}
                  {sharing && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Monitor size={10} /> Partage en cours
                    </div>
                  )}
                  {muted && (
                    <div className="absolute bottom-2 left-2 bg-red-500/80 text-white p-1 rounded-full">
                      <MicOff size={12} />
                    </div>
                  )}
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex items-center justify-center gap-3 pb-6">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`p-3.5 rounded-full transition text-sm font-medium ${muted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  title={muted ? 'Activer micro' : 'Couper micro'}
                >
                  {muted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  onClick={() => setCameraOn(!cameraOn)}
                  className={`p-3.5 rounded-full transition ${cameraOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'}`}
                  title={cameraOn ? 'Désactiver caméra' : 'Activer caméra'}
                >
                  {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button
                  onClick={() => setSharing(!sharing)}
                  className={`p-3.5 rounded-full transition ${sharing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  title="Partager l'écran"
                >
                  <Monitor size={20} />
                </button>
                <button
                  onClick={() => setJoined(false)}
                  className="p-3.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
                  title="Quitter"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSidebar && (
        <div className="w-56 bg-fc-channel border-l border-fc-bg flex flex-col">
          <div className="px-3 py-2 border-b border-fc-bg">
            <span className="text-xs font-semibold text-fc-muted uppercase tracking-wide">Participants</span>
          </div>
          {joined ? (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-fc-hover">
                <div className="w-8 h-8 rounded-full bg-fc-accent flex items-center justify-center text-sm font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{user?.username}</div>
                  <div className="text-xs text-fc-muted">{cameraOn ? 'Caméra active' : 'Caméra désactivée'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-fc-muted text-center p-4">Rejoignez le canal</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
