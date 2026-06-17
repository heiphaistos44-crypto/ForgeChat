import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Trash2, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../api/client'
import toast from 'react-hot-toast'

interface SavedMessage {
  id: string
  message_id: string
  channel_id: string
  server_id: string
  content: string
  author_username: string
  author_avatar?: string
  created_at: string
  saved_at: string
}

export default function SavedPage() {
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data: saved = [], isLoading } = useQuery<SavedMessage[]>({
    queryKey: ['saved_messages'],
    queryFn: () => api.get('/saved').then(r => r.data),
  })

  const remove = useMutation({
    mutationFn: (messageId: string) => api.delete(`/saved/${messageId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved_messages'] })
      toast.success('Message retiré des sauvegardés')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const goToMessage = (item: SavedMessage) => {
    if (item.server_id) {
      nav(`/servers/${item.server_id}/channels/${item.channel_id}`)
    } else {
      nav(`/dms/${item.channel_id}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-fc-bg">
      <div className="px-6 py-4 border-b border-fc-hover flex items-center gap-3">
        <Bookmark size={20} className="text-fc-accent" />
        <h1 className="text-lg font-bold text-white">Messages sauvegardés</h1>
        {saved.length > 0 && (
          <span className="text-xs text-fc-muted bg-fc-hover px-2 py-0.5 rounded-full">{saved.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-fc-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bookmark size={48} className="text-fc-muted opacity-40" />
            <p className="text-fc-muted text-sm">Aucun message sauvegardé</p>
            <p className="text-fc-muted/60 text-xs max-w-xs">Survole un message et clique sur l'icône Bookmark pour le sauvegarder.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {saved.map(item => (
              <div key={item.id} className="bg-fc-channel rounded-lg p-4 group hover:bg-fc-hover/30 transition border border-fc-hover/50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-fc-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                    {item.author_avatar
                      ? <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
                      : item.author_username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{item.author_username}</span>
                      <span className="text-xs text-fc-muted">
                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-fc-text break-words leading-relaxed">{item.content}</p>
                    <p className="text-xs text-fc-muted/60 mt-2">
                      Sauvegardé le {format(new Date(item.saved_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button
                      onClick={() => goToMessage(item)}
                      className="p-1.5 text-fc-muted hover:text-fc-accent rounded hover:bg-fc-hover transition"
                      title="Aller au message"
                    >
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => remove.mutate(item.message_id)}
                      className="p-1.5 text-fc-muted hover:text-red-400 rounded hover:bg-fc-hover transition"
                      title="Retirer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
