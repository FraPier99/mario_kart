import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, authStorage, getApiErrorMessage } from '@/services/apiClient'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const refreshMe = useCallback(async () => {
        const token = authStorage.getToken()

        if (!token) {
            setUser(null)
            setLoading(false)
            return null
        }

        try {
            const response = await authApi.me()
            setUser(response.data ?? null)
            return response.data ?? null
        }
        catch {
            authStorage.clearToken()
            setUser(null)
            return null
        }
        finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshMe()
    }, [refreshMe])

    const login = useCallback(async (username, password) => {
        try {
            const response = await authApi.login({ username, password })
            const token = response.data?.access_token

            if (!token) {
                throw new Error('Token non restituito dal server')
            }

            authStorage.setToken(token)
            setUser(response.data?.user ?? null)
            return response.data?.user ?? null
        }
        catch (error) {
            authStorage.clearToken()

            if (error?.response?.status === 401) {
                throw new Error('Username o password non validi', { cause: error })
            }

            if (error?.response?.status === 403) {
                throw new Error('Account disattivato', { cause: error })
            }

            throw new Error(getApiErrorMessage(error, 'Impossibile effettuare il login'), { cause: error })
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        }
        catch {
            // logout is best-effort only
        }

        authStorage.clearToken()
        setUser(null)
    }, [])

    const hasRole = useCallback((roles) => {
        if (!user) return false
        const allowedRoles = Array.isArray(roles) ? roles : [roles]
        return allowedRoles.includes(user.role)
    }, [user])

    const value = useMemo(() => ({
        user,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: Boolean(user && ['admin', 'superadmin'].includes(user.role)),
        isSuperadmin: Boolean(user && user.role === 'superadmin'),
        mustChangePassword: Boolean(user?.must_change_password),
        login,
        logout,
        refreshMe,
        hasRole,
    }), [user, loading, login, logout, refreshMe, hasRole])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }

    return context
}