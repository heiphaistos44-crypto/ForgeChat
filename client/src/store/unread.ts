import { create } from 'zustand'
import api from '../api/client'

interface UnreadState {
  counts: Record<string, number>
  increment: (channelId: string) => void
  reset: (channelId: string) => void
  fetchAll: () => Promise<void>
  markRead: (channelId: string) => Promise<void>
}

export const useUnread = create<UnreadState>((set, get) => ({
  counts: {},

  increment: (channelId) =>
    set(s => ({ counts: { ...s.counts, [channelId]: (s.counts[channelId] ?? 0) + 1 } })),

  reset: (channelId) =>
    set(s => { const c = { ...s.counts }; delete c[channelId]; return { counts: c } }),

  fetchAll: async () => {
    try {
      const { data } = await api.get('/unread')
      const counts: Record<string, number> = {}
      for (const item of data) counts[item.channel_id] = item.count
      set({ counts })
    } catch {}
  },

  markRead: async (channelId) => {
    get().reset(channelId)
    try { await api.post(`/channels/${channelId}/read`) } catch {}
  },
}))
