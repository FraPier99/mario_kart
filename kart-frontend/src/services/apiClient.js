import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
})

const apiRequest = (method, url, data) => {
    return apiClient.request({ method, url, data })
}

export const getApiErrorMessage = (error, fallbackMessage = 'Errore durante la chiamata al server') => {
    const responseMessage = error?.response?.data?.detail || error?.response?.data?.message || error?.message

    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
        return responseMessage
    }

    return fallbackMessage
}

export const _get = (url) => apiRequest('get', url)
export const _post = (url, data) => apiRequest('post', url, data)
export const _put = (url, data) => apiRequest('put', url, data)
export const _delete = (url) => apiRequest('delete', url)

const createCrudApi = (resourcePath) => ({
    list: () => _get(resourcePath),
    getById: (id) => _get(`${resourcePath}/${id}`),
    create: (payload) => _post(resourcePath, payload),
    update: (id, payload) => _put(`${resourcePath}/${id}`, payload),
    remove: (id) => _delete(`${resourcePath}/${id}`),
})

export const playersApi = createCrudApi('/players')
export const charactersApi = createCrudApi('/characters')
export const gamesApi = createCrudApi('/games')
export const tournamentsApi = {
    ...createCrudApi('/tournaments'),
    leaderboard: (tournamentId) => _get(`/tournaments/${tournamentId}/leaderboard`),
}
export const racesApi = createCrudApi('/races')
export const resultsApi = createCrudApi('/results')
export const circuitsApi = createCrudApi('/circuits')

export default apiClient