import { createContext, ReactNode, useContext, useReducer } from 'react'

type UserProfile = {
  id: string
  email?: string
}

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated'
  user: UserProfile | null
  sessionToken: string | null
}

type AuthAction =
  | { type: 'start' }
  | { type: 'signed_in'; user: UserProfile; sessionToken: string }
  | { type: 'signed_out' }

const initialState: AuthState = {
  status: 'idle',
  user: null,
  sessionToken: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'start':
      return { ...state, status: 'loading' }
    case 'signed_in':
      return {
        status: 'authenticated',
        user: action.user,
        sessionToken: action.sessionToken,
      }
    case 'signed_out':
      return { status: 'idle', user: null, sessionToken: null }
    default:
      return state
  }
}

type AuthContextValue = AuthState & {
  signInWithApple: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const signInWithApple = async () => {
    dispatch({ type: 'start' })
    // TODO: integrate expo-auth-session + Supabase Auth.
    dispatch({
      type: 'signed_in',
      user: { id: 'demo-user', email: 'demo@keepmore.app' },
      sessionToken: 'demo-session',
    })
  }

  const signOut = () => {
    dispatch({ type: 'signed_out' })
  }

  return (
    <AuthContext.Provider value={{ ...state, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
