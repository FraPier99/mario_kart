import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const AUTH_TOKEN_KEY = 'kart_auth_token'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
})

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

const apiRequest = (method, url, data) => {
    return apiClient.request({ method, url, data })
}

export const getApiErrorMessage = (error, fallbackMessage = 'Errore durante la chiamata al server') => {
    const detail = error?.response?.data?.detail
    const message = error?.response?.data?.message || error?.message

    if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
        const normalizedDetail = detail
            .map((item) => {
                if (typeof item === 'string') {
                    return item
                }

                if (item && typeof item === 'object') {
                    return item.msg || item.message || JSON.stringify(item)
                }

                return String(item)
            })
            .filter((item) => item && item.trim().length > 0)

        if (normalizedDetail.length > 0) {
            return normalizedDetail.join(', ')
        }
    }

    if (detail && typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail)
    }

    if (typeof message === 'string' && message.trim().length > 0) {
        return message
    }

    return fallbackMessage
}

export const _get = (url) => apiRequest('get', url)
export const _post = (url, data) => apiRequest('post', url, data)
export const _put = (url, data) => apiRequest('put', url, data)
export const _patch = (url, data) => apiRequest('patch', url, data)
export const _delete = (url) => apiRequest('delete', url)

const createCrudApi = (resourcePath) => ({
    list: () => _get(resourcePath),
    getById: (id) => _get(`${resourcePath}/${id}`),
    create: (payload) => _post(resourcePath, payload),
    update: (id, payload) => _put(`${resourcePath}/${id}`, payload),
    remove: (id) => _delete(`${resourcePath}/${id}`),
})

export const playersApi = {
    ...createCrudApi('/players'),
    uploadChampionPhoto: (playerId, imageData) => _put(`/players/${playerId}/champion-photo`, { image_data: imageData }),
}
export const charactersApi = createCrudApi('/characters')
export const gamesApi = createCrudApi('/games')
export const tournamentsApi = {
    ...createCrudApi('/tournaments'),
    leaderboard: (tournamentId) => _get(`/tournaments/${tournamentId}/leaderboard`),
    playoff: (tournamentId, payload) => _post(`/tournaments/${tournamentId}/playoff`, payload),
    playoffUndo: (tournamentId) => _delete(`/tournaments/${tournamentId}/playoff/undo`),
    updateDeadline: (tournamentId, deadlineLock) => _put(`/tournaments/${tournamentId}`, { deadline_lock: deadlineLock }),
    updateStatus: (tournamentId, status) => _put(`/tournaments/${tournamentId}`, { status }),
    activateLive: (tournamentId) => _post(`/tournaments/${tournamentId}/activate-live`, {}),
    generateFinals: (tournamentId) => _post(`/tournaments/${tournamentId}/group-stage/generate-finals`, {}),
    seedGroups: (tournamentId) => _post(`/tournaments/${tournamentId}/group-stage/seed`, {}),
    completeGroup: (tournamentId, groupKey) => _post(`/tournaments/${tournamentId}/group-stage/complete-group`, { group_key: groupKey }),
    reopenGroup: (tournamentId, groupKey) => _post(`/tournaments/${tournamentId}/group-stage/reopen-group`, { group_key: groupKey }),
    groupStageTies: (tournamentId) => _get(`/tournaments/${tournamentId}/group-stage/ties`),
    groupStageClassifiche: (tournamentId) => _get(`/tournaments/${tournamentId}/group-stage/classifiche`),
    classicTies: (tournamentId) => _get(`/tournaments/${tournamentId}/classic-ties`),
    finalsTies: (tournamentId) => _get(`/tournaments/${tournamentId}/finals-ties`),
    consolationTies: (tournamentId) => _get(`/tournaments/${tournamentId}/consolation-ties`),
    decreeConsolationWinner: (tournamentId) => _post(`/tournaments/${tournamentId}/decree-consolation-winner`, {}),
    overallClassifica: (tournamentId) => _get(`/tournaments/${tournamentId}/group-stage/overall-classifica`),
    resolutionNotes: (tournamentId) => _get(`/tournaments/${tournamentId}/resolution-notes`),
    overview: (tournamentId) => _get(`/tournaments/${tournamentId}/overview`),
    audit: (tournamentId) => _get(`/tournaments/${tournamentId}/audit`),
    closeSchedine: (tournamentId) => _post(`/tournaments/${tournamentId}/close-schedine`, {}),
    setPlayerWithdrawal: (tournamentId, playerId, withdrawn) => _patch(`/tournaments/${tournamentId}/players/${playerId}/withdrawal`, { withdrawn }),
    update: (tournamentId, payload) => _put(`/tournaments/${tournamentId}`, payload),
}
export const schedineDeluxeApi = {
    create: (payload) => _post('/schedine-deluxe', payload),
    me: () => _get('/schedine-deluxe/me'),
    allByTournament: (tournamentId) => _get(`/schedine-deluxe/tournament/${tournamentId}`),
    tournamentDetail: (tournamentId) => _get(`/schedine-deluxe/tournament/${tournamentId}/detail`),
    settle: (tournamentId) => _post(`/schedine-deluxe/tournament/${tournamentId}/settle`, {}),
}
export const racesApi = createCrudApi('/races')
export const resultsApi = createCrudApi('/results')
export const circuitsApi = createCrudApi('/circuits')
export const schedineApi = {
    me: () => _get('/schedine/me'),
    overview: (gameId) => _get(`/schedine/overview${gameId ? `?game_id=${gameId}` : ''}`),
    tournamentOverview: (tournamentId) => _get(`/schedine/tournament/${tournamentId}/overview`),
    tournamentDetail: (tournamentId) => _get(`/schedine/tournament/${tournamentId}/detail`),
    participantsStatus: (tournamentId) => _get(`/schedine/tournament/${tournamentId}/participants-status`),
    allByTournament: () => _get('/schedine/all-by-tournament'),
    create: (payload) => _post('/schedine', payload),
    settleTournament: (tournamentId) => _post(`/schedine/tournament/${tournamentId}/settle`),
    redeemPrize: (prizeId) => _post(`/schedine/premi/${prizeId}/redeem`),
    pendingNotifications: () => _get('/schedine/pending-notifications'),
}
export const inventoryApi = {
    me: () => _get('/inventory/me'),
    all: () => _get('/inventory/all'),
    public: () => _get('/inventory/public'),
    tournamentAvailable: (tournamentId) => _get(`/inventory/tournament/${tournamentId}/available`),
    tournamentHolders: (tournamentId) => _get(`/inventory/tournament/${tournamentId}/holders`),
    tournamentHistory: (tournamentId) => _get(`/inventory/tournament/${tournamentId}/history`),
    tournamentAwards: (tournamentId) => _get(`/inventory/tournament/${tournamentId}/awards`),
    use: (itemId, payload) => _post(`/inventory/${itemId}/use`, payload ?? {}),
    adminUse: (payload) => _post('/inventory/admin/use', payload),
    adminGrant: (payload) => _post('/inventory/admin/grant', payload),
}

// ── Local card-usage log (per-tournament, persisted in localStorage) ──────────
const CARD_LOG_PREFIX = 'kart_card_log_'

export const cardLog = {
    key: (tournamentId) => `${CARD_LOG_PREFIX}${tournamentId}`,

    get: (tournamentId) => {
        try {
            return JSON.parse(localStorage.getItem(cardLog.key(tournamentId)) ?? '[]')
        } catch {
            return []
        }
    },

    add: (tournamentId, entry) => {
        const log = cardLog.get(tournamentId)
        log.unshift({ ...entry, used_at: new Date().toISOString() })
        localStorage.setItem(cardLog.key(tournamentId), JSON.stringify(log))
    },

    clear: (tournamentId) => {
        localStorage.removeItem(cardLog.key(tournamentId))
    },
}
export const galleryApi = {
    list: () => _get('/gallery'),
    upload: (payload) => _post('/gallery', payload),
    remove: (photoId) => _delete(`/gallery/${photoId}`),
    addComment: (photoId, text, parentId, imageData) => _post(`/gallery/${photoId}/comments`, { text, parent_id: parentId, image_data: imageData ?? null }),
    editComment: (commentId, text) => _patch(`/gallery/comments/${commentId}`, { text }),
    deleteComment: (commentId) => _delete(`/gallery/comments/${commentId}`),
}

export const notificationsApi = {
    list: () => _get('/notifications'),
    markRead: (id) => _patch(`/notifications/${id}/read`, {}),
    markAllRead: () => _patch('/notifications/read-all', {}),
    delete: (id) => _delete(`/notifications/${id}`),
    deleteRead: () => _delete('/notifications/read'),
    deleteAll: () => _delete('/notifications'),
}

export const authApi = {
    login: (payload) => _post('/auth/login', payload),
    me: () => _get('/auth/me'),
    logout: () => _post('/auth/logout'),
    updateMyProfile: (payload) => _put('/auth/me/profile', payload),
    // { current_password, new_password } — backend validates current before updating
    changePassword: (payload) => _post('/auth/me/change-password', payload),
    listUsers: () => _get('/auth/users'),
    listCommunityUsers: () => _get('/auth/community/users'),
    getCommunityUser: (id) => _get(`/auth/community/users/${id}`),
    createUser: (payload) => _post('/auth/users', payload),
    updateUser: (id, payload) => _put(`/auth/users/${id}`, payload),
    deleteUser: (id) => _delete(`/auth/users/${id}`),
}

export const auditApi = {
    list: () => _get('/audit-log'),
    resetPassword: (userId) => _post(`/audit-log/users/${userId}/reset-password`),
    tempPasswords: (userId) => _get(`/audit-log/users/${userId}/temp-passwords`),
}

export const authStorage = {
    tokenKey: AUTH_TOKEN_KEY,
    getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
    setToken: (token) => localStorage.setItem(AUTH_TOKEN_KEY, token),
    clearToken: () => localStorage.removeItem(AUTH_TOKEN_KEY),
}

export default apiClient