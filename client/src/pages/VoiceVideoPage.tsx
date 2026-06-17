import { useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Volume2, Headphones, VolumeX, Maximize2, X, Users,
} from 'lucide-react'
import { useVoice, type VoicePeer } from '../store/voice'
import { useAuth } from '../store/auth'
import { useVoiceActivity } from '../hooks/useVoiceActivity'

interface Props {
  channel: { id: string; name: string; type: string }
  serverId: string
}

// ── Tuile vidéo d'un participant ─────────────────────────────────────────────
function VideoTile({
  stream, muted = false, label, avatar, isLocal = false,
  audioEnabled = true, videoEnabled = false, screenSharing = false, speaking = false,
  onExpand,
}: {
  stream: MediaStream | null
  muted?: boolean
  label: string
  avatar?: string
  isLocal?: boolean
  audioEnabled?: boolean
  videoEnabled?: boolean
  screenSharing?: boolean
  speaking?: boolean
  onExpand?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = videoEnabled && stream && stream.getVideoTracks().some(t => t.readyState === 'live')

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gray-900 flex flex-col items-center justify-center aspect-video transition-all
        ${speaking ? 'ring-2 ring-green-400 shadow-[0_0_16px_rgba(74,222,128,0.3)]' : 'ring-1 ring-white/5'}
        ${isLocal ? 'ring-fc-accent/60' : ''}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2.5 px-4">
          {avatar ? (
            <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-fc-accent/60" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-fc-accent flex items-center justify-center text-2xl font-bold text-white">
              {label.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-white text-sm font-medium">{isLocal ? `${label} (Vous)` : label}</span>
        </div>
      )}

      {/* Bandeau bas */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-1">
          {!audioEnabled && <MicOff size={11} className="text-red-400 flex-shrink-0" />}
          {screenSharing && <Monitor size={11} className="text-green-400 flex-shrink-0" />}
          <span className="text-xs text-white font-medium truncate max-w-[100px]">
            {isLocal ? `${label} (Vous)` : label}
          </span>
        </div>
        {onExpand && videoEnabled && (
          <button
            onClick={onExpand}
            className="p-0.5 rounded hover:bg-white/20 text-white/60 hover:text-white transition"
            title="Agrandir"
          >
            <Maximize2 size={11} />
          </button>
        )}
      </div>

      {isLocal && (
        <div className="absolute top-2 left-2 bg-fc-accent/90 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
          Vous
        </div>
      )}
    </div>
  )
}

// ── Viewer plein écran ───────────────────────────────────────────────────────
function FullscreenViewer({ stream, label, onClose }: { stream: MediaStream; label: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-black/60">
        <span className="text-white font-semibold text-sm">{label} — Partage d'écran</span>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-white transition">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <video ref={ref} autoPlay playsInline className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  )
}

// ── Contrôles ────────────────────────────────────────────────────────────────
function Controls() {
  const { muted, deafened, videoEnabled, screenSharing, toggleMute, toggleDeafen, toggleVideo, shareScreen, stopScreenShare, leave } = useVoice()
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-950/95 border-t border-white/5 backdrop-blur-sm">
      <CtrlBtn active={!muted} danger={muted} onClick={toggleMute} title={muted ? 'Activer le micro' : 'Couper le micro'}>
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
      </CtrlBtn>
      <CtrlBtn active={!deafened} danger={deafened} onClick={toggleDeafen} title={deafened ? 'Réactiver le son' : 'Couper le son'}>
        {deafened ? <VolumeX size={18} /> : <Headphones size={18} />}
      </CtrlBtn>
      <CtrlBtn active={videoEnabled && !screenSharing} onClick={() => toggleVideo()} title={videoEnabled ? 'Désactiver caméra' : 'Activer caméra'}>
        {videoEnabled && !screenSharing ? <Video size={18} /> : <VideoOff size={18} />}
      </CtrlBtn>
      <CtrlBtn active={screenSharing} accent={screenSharing} onClick={screenSharing ? stopScreenShare : shareScreen} title={screenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}>
        {screenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
      </CtrlBtn>
      <div className="flex-1" />
      <button
        onClick={leave}
        className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition flex items-center gap-2 text-sm"
      >
        <PhoneOff size={16} />
        Quitter
      </button>
    </div>
  )
}

function CtrlBtn({ active, danger, accent, onClick, title, children }: {
  active: boolean; danger?: boolean; accent?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  const cls = danger
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : accent
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : active
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-white/5 hover:bg-white/10 text-fc-muted hover:text-white'
  return (
    <button onClick={onClick} title={title} className={`p-3 rounded-full transition-all ${cls}`}>
      {children}
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function VoiceVideoPage({ channel, serverId }: Props) {
  const { user } = useAuth()
  const { joined, peers, localStream, muted, videoEnabled, screenSharing, error, join, leave } = useVoice()
  const [fullscreenPeer, setFullscreenPeer] = useState<{ stream: MediaStream; label: string } | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  const localSpeaking = useVoiceActivity(joined ? localStream : null, !muted)
  const isVideo = channel.type === 'video' || channel.type === 'voice'

  // ── Salle d'attente ──────────────────────────────────────────────────────
  const channelParticipants = useVoice(s => s.roomParticipants[channel.id] ?? [])

  if (!joined) {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        <Header channel={channel} count={0} onToggleSidebar={() => setShowSidebar(v => !v)} showSidebar={showSidebar} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-blue-500/15">
            <Volume2 size={44} className="text-blue-400" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">{channel.name}</h2>
            <p className="text-fc-muted text-sm">
              {channelParticipants.length === 0
                ? 'Aucun participant — rejoignez le premier !'
                : `${channelParticipants.length} participant(s) dans ce canal`}
            </p>
            {channelParticipants.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {channelParticipants.slice(0, 5).map(p => (
                  <div key={p.userId} title={p.username} className="w-9 h-9 rounded-full bg-fc-accent border-2 border-gray-900 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                    {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-red-400 text-sm max-w-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => join(channel.id, serverId, false)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition"
            >
              <Mic size={18} />
              Rejoindre (audio seulement)
            </button>
            <button
              onClick={() => join(channel.id, serverId, true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition"
            >
              <Video size={18} />
              Rejoindre avec caméra
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Dans le canal ────────────────────────────────────────────────────────
  const allParticipants: Array<{
    userId: string; username: string; avatar?: string; stream: MediaStream | null;
    audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean; isLocal: boolean;
  }> = [
    {
      userId: user?.id ?? '',
      username: user?.username ?? '',
      avatar: user?.avatar ?? undefined,
      stream: localStream,
      audioEnabled: !muted,
      videoEnabled,
      screenSharing,
      isLocal: true,
    },
    ...peers.map((p: VoicePeer) => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      stream: p.stream,
      audioEnabled: !p.muted,
      videoEnabled: p.videoEnabled,
      screenSharing: p.screenSharing,
      isLocal: false,
    })),
  ]

  const n = allParticipants.length
  const gridCols = n <= 1 ? 'grid-cols-1 max-w-lg mx-auto' : n <= 2 ? 'grid-cols-2' : n <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <Header channel={channel} count={n} onToggleSidebar={() => setShowSidebar(v => !v)} showSidebar={showSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {/* Grille */}
        <div className={`flex-1 overflow-y-auto p-4 grid ${gridCols} gap-3 content-start`}>
          {allParticipants.map(p => (
            <PeerTile
              key={p.userId}
              {...p}
              isLocal={p.isLocal}
              speaking={p.isLocal ? localSpeaking : false}
              onExpand={p.screenSharing && p.stream
                ? () => setFullscreenPeer({ stream: p.stream!, label: p.username })
                : undefined}
            />
          ))}
        </div>

        {/* Sidebar membres */}
        {showSidebar && (
          <div className="w-56 bg-fc-channel border-l border-white/5 flex flex-col overflow-y-auto flex-shrink-0">
            <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
              <Users size={14} className="text-fc-muted" />
              <span className="text-xs font-semibold text-fc-muted uppercase tracking-wide">Dans le canal — {n}</span>
            </div>
            {allParticipants.map(p => (
              <SidebarEntry key={p.userId} {...p} speaking={p.isLocal ? localSpeaking : false} />
            ))}
          </div>
        )}
      </div>

      <Controls />

      {fullscreenPeer && (
        <FullscreenViewer
          stream={fullscreenPeer.stream}
          label={fullscreenPeer.label}
          onClose={() => setFullscreenPeer(null)}
        />
      )}
    </div>
  )
}

// ── Sous-composants helpers ───────────────────────────────────────────────────
function Header({ channel, count, onToggleSidebar, showSidebar }: {
  channel: { name: string; type: string }; count: number; onToggleSidebar: () => void; showSidebar: boolean
}) {
  const isVideo = channel.type === 'video'
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 flex-shrink-0 min-h-[48px] bg-fc-bg">
      {isVideo ? <Video size={16} className="text-purple-400" /> : <Volume2 size={16} className="text-blue-400" />}
      <span className="font-semibold text-white">{channel.name}</span>
      {count > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-fc-muted">{count} connecté(s)</span>
        </div>
      )}
      <div className="ml-auto">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded hover:bg-fc-hover transition ${showSidebar ? 'text-white' : 'text-fc-muted hover:text-white'}`}
        >
          <Users size={16} />
        </button>
      </div>
    </div>
  )
}

function PeerTile({ userId, username, avatar, stream, audioEnabled, videoEnabled, screenSharing, isLocal, speaking, onExpand }: {
  userId: string; username: string; avatar?: string; stream: MediaStream | null;
  audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean; isLocal: boolean; speaking: boolean;
  onExpand?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = videoEnabled && stream && stream.getVideoTracks().some(t => t.readyState === 'live')

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className={`relative rounded-xl overflow-hidden bg-gray-900 flex flex-col items-center justify-center aspect-video transition-all
      ${speaking ? 'ring-2 ring-green-400 shadow-[0_0_16px_rgba(74,222,128,0.25)]' : 'ring-1 ring-white/5'}
      ${isLocal ? 'ring-fc-accent/50' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {avatar
            ? <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/20" />
            : <div className="w-16 h-16 rounded-full bg-fc-accent flex items-center justify-center text-2xl font-bold text-white">{username.charAt(0).toUpperCase()}</div>}
          <span className="text-white text-sm font-medium">{username}</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-1">
          {!audioEnabled && <MicOff size={11} className="text-red-400" />}
          {screenSharing && <Monitor size={11} className="text-green-400" />}
          <span className="text-[11px] text-white font-medium truncate max-w-[100px]">
            {isLocal ? `${username} (Vous)` : username}
          </span>
        </div>
        {onExpand && (
          <button onClick={onExpand} className="p-0.5 rounded hover:bg-white/20 text-white/60 hover:text-white transition">
            <Maximize2 size={11} />
          </button>
        )}
      </div>

      {isLocal && (
        <div className="absolute top-2 left-2 bg-fc-accent/90 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Vous</div>
      )}
    </div>
  )
}

function SidebarEntry({ username, avatar, audioEnabled, videoEnabled, screenSharing, speaking }: {
  username: string; avatar?: string; audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean; speaking: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 transition ${speaking ? 'bg-green-500/5' : ''}`}>
      <div className={`relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden ${speaking ? 'ring-2 ring-green-400' : ''}`}>
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-fc-accent flex items-center justify-center text-sm font-bold text-white">{username.charAt(0).toUpperCase()}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{username}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {!audioEnabled && <MicOff size={10} className="text-red-400" />}
          {videoEnabled && !screenSharing && <Video size={10} className="text-blue-400" />}
          {screenSharing && <Monitor size={10} className="text-green-400" />}
        </div>
      </div>
    </div>
  )
}
