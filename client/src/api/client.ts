import axios from 'axios'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
export const SERVER_URL = isTauri ? 'https://forgechat.heiphaistos.org' : ''
const baseURL = isTauri ? 'https://forgechat.heiphaistos.org/api' : '/api'

const api = axios.create({ baseURL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', res.data.access_token)
          err.config.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
