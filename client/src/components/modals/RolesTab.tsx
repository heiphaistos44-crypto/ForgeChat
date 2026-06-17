import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import toast from 'react-hot-toast'

const PERMISSIONS = [
  { key: 'VIEW_CHANNEL',     bit: 1 << 0,  label: 'Voir les salons' },
  { key: 'SEND_MESSAGES',    bit: 1 << 1,  label: 'Envoyer des messages' },
  { key: 'READ_HISTORY',     bit: 1 << 2,  label: 'Lire l\'historique' },
  { key: 'MANAGE_MESSAGES',  bit: 1 << 3,  label: 'Gérer les messages' },
  { key: 'MANAGE_CHANNELS',  bit: 1 << 4,  label: 'Gérer les salons' },
  { key: 'MANAGE_ROLES',     bit: 1 << 5,  label: 'Gérer les rôles' },
  { key: 'KICK_MEMBERS',     bit: 1 << 6,  label: 'Expulser des membres' },
  { key: 'BAN_MEMBERS',     bit: 1 << 7,  label: 'Bannir des membres' },
  { key: 'MANAGE_SERVER',    bit: 1 << 8,  label: 'Gérer le serveur' },
  { key: 'MENTION_EVERYONE', bit: 1 << 9,  label: 'Mentionner @everyone' },
  { key: 'ATTACH_FILES',     bit: 1 << 10, label: 'Joindre des fichiers' },
  { key: 'ADD_REACTIONS',    bit: 1 << 12, label: 'Ajouter des réactions' },
  { key: 'CONNECT_VOICE',    bit: 1 << 13, label: 'Rejoindre la voix' },
  { key: 'ADMINISTRATOR',    bit: 1 << 31, label: 'Administrateur' },
]

function colorIntToHex(c: number): string {
  return '#' + (c >>> 0).toString(16).padStart(6, '0')
}
function hexToColorInt(h: string): number {
  return parseInt(h.replace('#', ''), 16)
}

interface Role {
  id: string
  name: string
  color: number
  permissions: number
  position: number
  mentionable: boolean
  hoisted: boolean
  is_everyone: boolean
}

export default function RolesTab({ serverId }: { serverId: string }) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Role | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#7289da')
  const [editPerms, setEditPerms] = useState(0)
  const [editHoisted, setEditHoisted] = useState(false)
  const [editMentionable, setEditMentionable] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', serverId],
    queryFn: () => api.get(`/servers/${serverId}/roles`).then(r => r.data),
  })

  const selectRole = (r: Role) => {
    setSelected(r)
    setEditName(r.name)
    setEditColor(colorIntToHex(r.color))
    setEditPerms(r.permissions)
    setEditHoisted(r.hoisted)
    setEditMentionable(r.mentionable)
  }

  const createRole = useMutation({
    mutationFn: (name: string) => api.post(`/servers/${serverId}/roles`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles', serverId] }); setNewName('') },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Erreur'),
  })

  const saveRole = useMutation({
    mutationFn: () => api.patch(`/servers/${serverId}/roles/${selected!.id}`, {
      name: editName,
      color: hexToColorInt(editColor),
      permissions: editPerms,
      hoisted: editHoisted,
      mentionable: editMentionable,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', serverId] })
      toast.success('Rôle sauvegardé')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Erreur'),
  })

  const deleteRole = useMutation({
    mutationFn: (roleId: string) => api.delete(`/servers/${serverId}/roles/${roleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', serverId] })
      setSelected(null)
      toast.success('Rôle supprimé')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Erreur'),
  })

  const togglePerm = (bit: number) => setEditPerms(p => p ^ bit)
  const hasPerm = (bit: number) => (editPerms & bit) !== 0

  return (
    <div className="flex gap-4 h-full">
      {/* Liste rôles */}
      <div className="w-44 flex-shrink-0">
        <div className="flex gap-2 mb-3">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nouveau rôle"
            className="flex-1 px-2 py-1.5 bg-fc-input rounded text-white text-xs outline-none"
            onKeyDown={e => e.key === 'Enter' && newName.trim() && createRole.mutate(newName.trim())}
          />
          <button
            onClick={() => newName.trim() && createRole.mutate(newName.trim())}
            disabled={!newName.trim() || createRole.isPending}
            className="p-1.5 bg-fc-accent hover:bg-indigo-500 text-white rounded transition disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-0.5">
          {roles.map(r => (
            <button key={r.id} onClick={() => selectRole(r)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition
                ${selected?.id === r.id ? 'bg-fc-hover text-white' : 'text-fc-muted hover:text-white hover:bg-fc-hover/50'}`}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: r.color ? colorIntToHex(r.color) : '#99aab5' }} />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Éditeur rôle */}
      {selected ? (
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Modifier : {selected.name}</h3>
            {!selected.is_everyone && (
              <button onClick={() => deleteRole.mutate(selected.id)}
                className="p-1.5 text-fc-muted hover:text-red-400 hover:bg-fc-hover rounded transition"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-fc-muted uppercase mb-1 block">Nom</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                disabled={selected.is_everyone}
                className="w-full px-3 py-2 bg-fc-input rounded text-white text-sm outline-none focus:ring-2 focus:ring-fc-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-fc-muted uppercase mb-1 block">Couleur</label>
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                className="w-10 h-9 rounded cursor-pointer bg-fc-input border-0 p-0.5"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-fc-muted cursor-pointer select-none">
              <input type="checkbox" checked={editHoisted} onChange={e => setEditHoisted(e.target.checked)}
                className="accent-indigo-500" />
              Afficher séparément
            </label>
            <label className="flex items-center gap-2 text-sm text-fc-muted cursor-pointer select-none">
              <input type="checkbox" checked={editMentionable} onChange={e => setEditMentionable(e.target.checked)}
                className="accent-indigo-500" />
              Mentionnable
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-fc-muted uppercase mb-2 block">Permissions</label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center justify-between p-2.5 bg-fc-channel rounded cursor-pointer hover:bg-fc-hover transition select-none">
                  <span className="text-sm text-white">{p.label}</span>
                  <div
                    onClick={() => togglePerm(p.bit)}
                    className={`w-10 h-5 rounded-full relative transition ${hasPerm(p.bit) ? 'bg-fc-accent' : 'bg-fc-hover'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${hasPerm(p.bit) ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button onClick={() => saveRole.mutate()} disabled={saveRole.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-fc-accent hover:bg-indigo-500 text-white rounded text-sm font-medium transition disabled:opacity-50"
          >
            <Save size={14} />
            {saveRole.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-fc-muted text-sm">
          Sélectionne un rôle pour le modifier
        </div>
      )}
    </div>
  )
}
