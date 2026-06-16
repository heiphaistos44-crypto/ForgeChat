import { useRef, useState, useEffect, useCallback } from 'react'
import { Plus, SmilePlus, Send, X, CornerUpLeft, Clock, Image, Film, File } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useQuery } from '@tanstack/react-query'
import { useWs } from '../../store/ws'
import api from '../../api/client'
import toast from 'react-hot-toast'
import EmojiPicker from './EmojiPicker'

export interface ReplyTarget {
  id: string
  author_username: string
  content: string | null
}

export interface FileWithTtl {
  file: File
  ttlHours: number | null
  preview: string | null
}

interface Props {
  channelId: string
  serverId: string
  placeholder?: string
  onSend: (content: string, replyTo?: string, files?: FileWithTtl[]) => void
  replyTo?: ReplyTarget | null
  onCancelReply?: () => void
}

interface MentionUser {
  id: string
  username: string
  avatar?: string | null
  discriminator: string
}

const TTL_OPTIONS = [
  { label: 'Ne pas expirer', value: null },
  { label: '1 heure', value: 1 },
  { label: '24 heures', value: 24 },
  { label: '7 jours', value: 168 },
  { label: '30 jours', value: 720 },
]

function isVideo(file: File) { return file.type.startsWith('video/') }
function isImage(file: File) { return file.type.startsWith('image/') }

function FileIcon({ file }: { file: File }) {
  if (isImage(file)) return <Image size={14} className="text-blue-400" />
  if (isVideo(file)) return <Film size={14} className="text-purple-400" />
  return <File size={14} className="text-fc-muted" />
}

export default function MessageInput({ channelId, serverId, placeholder, onSend, replyTo, onCancelReply }: Props) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<FileWithTtl[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [showMentions, setShowMentions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { send } = useWs()
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data: mentionResults = [] } = useQuery<MentionUser[]>({
    queryKey: ['mention_search', mentionQuery],
    queryFn: () =>
      api.get(`/users/search?q=${encodeURIComponent(mentionQuery)}`).then(r => r.data),
    enabled: showMentions && mentionQuery.length >= 1,
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => addFiles(accepted),
  })

  const addFiles = useCallback((newFiles: File[]) => {
    const wrapped: FileWithTtl[] = newFiles.map(f => ({
      file: f,
      ttlHours: isVideo(f) ? 24 : null,
      preview: isImage(f) ? URL.createObjectURL(f) : null,
    }))
    setFiles(prev => [...prev, ...wrapped])
  }, [])

  // Coller image depuis le presse-papiers
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItems = Array.from(items).filter(i => i.type.startsWith('image/'))
      if (imageItems.length === 0) return
      const filesFromClipboard = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[]
      if (filesFromClipboard.length > 0) {
        e.preventDefault()
        addFiles(filesFromClipboard)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [addFiles])

  // Libérer les URLs de preview
  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const removeFile = (idx: number) => {
    setFiles(prev => {
      if (prev[idx]?.preview) URL.revokeObjectURL(prev[idx].preview!)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const updateTtl = (idx: number, ttlHours: number | null) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ttlHours } : f))
  }

  const detectMention = (value: string, pos: number) => {
    const before = value.slice(0, pos)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionIndex(0)
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (user: MentionUser) => {
    const pos = cursorPos
    const before = content.slice(0, pos)
    const after = content.slice(pos)
    const atIdx = before.lastIndexOf('@')
    const newContent = before.slice(0, atIdx) + `@${user.username} ` + after
    setContent(newContent)
    setShowMentions(false)
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = atIdx + user.username.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || (e.key === 'Enter' && showMentions)) { e.preventDefault(); insertMention(mentionResults[mentionIndex]); return }
      if (e.key === 'Escape') { setShowMentions(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart ?? 0
    setContent(val)
    setCursorPos(pos)
    detectMention(val, pos)
    send({ type: 'TYPING_START', channel_id: channelId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {}, 3000)
  }

  const submit = () => {
    const trimmed = content.trim()
    if (!trimmed && files.length === 0) return
    onSend(trimmed, replyTo?.id, files.length > 0 ? files : undefined)
    setContent('')
    setFiles([])
    setShowMentions(false)
    onCancelReply?.()
    textareaRef.current?.focus()
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 144) + 'px'
    }
  }, [content])

  const hasVideos = files.some(f => isVideo(f.file))

  return (
    <div {...getRootProps()} className={`px-4 pb-4 relative ${isDragActive ? 'ring-2 ring-fc-accent ring-inset rounded-lg' : ''}`}>
      <input {...getInputProps()} />

      {/* Barre de réponse */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-fc-input/60 rounded-t-lg border-b border-fc-hover text-xs">
          <CornerUpLeft size={12} className="text-fc-accent flex-shrink-0" />
          <span className="text-fc-muted">Réponse à</span>
          <span className="font-semibold text-white">{replyTo.author_username}</span>
          {replyTo.content && (
            <span className="text-fc-muted truncate max-w-xs">{replyTo.content.slice(0, 80)}</span>
          )}
          <button onClick={onCancelReply} className="ml-auto p-0.5 rounded hover:bg-fc-hover text-fc-muted hover:text-white transition" title="Annuler">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Dropdown mentions */}
      {showMentions && mentionResults.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-fc-channel border border-fc-hover rounded-lg shadow-2xl overflow-hidden z-50 max-h-52 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-semibold text-fc-muted uppercase tracking-wide border-b border-fc-hover">
            Membres — @{mentionQuery}
          </div>
          {mentionResults.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition
                ${idx === mentionIndex ? 'bg-fc-accent/20 text-white' : 'text-fc-text hover:bg-fc-hover'}`}
            >
              <div className="w-7 h-7 rounded-full bg-fc-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{user.username}</div>
                <div className="text-xs text-fc-muted">#{user.discriminator}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Aperçu fichiers */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap p-2 bg-fc-input/40 rounded-lg border border-fc-hover">
          {files.map((fw, i) => (
            <div key={i} className="relative group flex flex-col gap-1">
              {/* Preview image */}
              {fw.preview ? (
                <div className="w-20 h-20 rounded overflow-hidden border border-fc-hover flex-shrink-0">
                  <img src={fw.preview} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded border border-fc-hover bg-fc-bg flex flex-col items-center justify-center gap-1 text-center">
                  <FileIcon file={fw.file} />
                  <span className="text-xs text-fc-muted truncate w-16 text-center px-1">{fw.file.name}</span>
                </div>
              )}

              {/* TTL selector pour vidéos */}
              {isVideo(fw.file) && (
                <select
                  value={fw.ttlHours ?? ''}
                  onChange={e => updateTtl(i, e.target.value ? Number(e.target.value) : null)}
                  className="text-xs bg-fc-bg border border-fc-hover rounded px-1 py-0.5 text-fc-muted w-20"
                  title="Durée de vie"
                >
                  {TTL_OPTIONS.map(o => (
                    <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
                  ))}
                </select>
              )}

              {/* Bouton supprimer */}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-fc-red rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition"
              >
                <X size={8} />
              </button>
            </div>
          ))}

          {hasVideos && (
            <div className="flex items-center gap-1 text-xs text-fc-muted self-start mt-1">
              <Clock size={10} />
              <span>TTL vidéos configuré par fichier</span>
            </div>
          )}
        </div>
      )}

      {/* Indicateur drag */}
      {isDragActive && (
        <div className="absolute inset-0 bg-fc-accent/10 border-2 border-dashed border-fc-accent rounded-lg flex items-center justify-center z-10 pointer-events-none">
          <span className="text-fc-accent font-semibold text-sm">Déposer les fichiers ici</span>
        </div>
      )}

      <div className="flex items-end gap-2 bg-fc-input rounded-lg px-2 py-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-fc-muted hover:text-white rounded transition flex-shrink-0"
          title="Joindre un fichier"
        >
          <Plus size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = '' } }}
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Envoyer un message...'}
          rows={1}
          className="flex-1 bg-transparent text-fc-text placeholder-fc-muted outline-none resize-none text-sm overflow-y-hidden"
          style={{ lineHeight: '1.5', minHeight: '24px', maxHeight: '144px' }}
        />

        <div className="flex items-center gap-1 flex-shrink-0 relative">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(p => !p)}
              className={`p-1.5 rounded transition ${showEmojiPicker ? 'text-fc-accent' : 'text-fc-muted hover:text-white'}`}
              title="Emoji"
            >
              <SmilePlus size={20} />
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                serverId={serverId}
                onPick={(emoji) => {
                  const pos = textareaRef.current?.selectionStart ?? content.length
                  setContent(c => c.slice(0, pos) + emoji + c.slice(pos))
                  setTimeout(() => textareaRef.current?.focus(), 0)
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          <button
            onClick={submit}
            disabled={!content.trim() && files.length === 0}
            className="p-1.5 text-fc-muted hover:text-fc-accent rounded transition disabled:opacity-30"
            title="Envoyer"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
