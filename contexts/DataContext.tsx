import { createContext, ReactNode, useContext, useReducer } from 'react'

type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  category?: string
  isBusiness?: boolean
}

type Goal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
}

type DataState = {
  transactions: Transaction[]
  goals: Goal[]
  netWorth: number
  lastSyncedAt?: string
}

type DataAction =
  | { type: 'set_transactions'; transactions: Transaction[] }
  | { type: 'set_goals'; goals: Goal[] }
  | { type: 'set_net_worth'; netWorth: number }
  | { type: 'set_synced_at'; lastSyncedAt: string }

const initialState: DataState = {
  transactions: [],
  goals: [],
  netWorth: 0,
}

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'set_transactions':
      return { ...state, transactions: action.transactions }
    case 'set_goals':
      return { ...state, goals: action.goals }
    case 'set_net_worth':
      return { ...state, netWorth: action.netWorth }
    case 'set_synced_at':
      return { ...state, lastSyncedAt: action.lastSyncedAt }
    default:
      return state
  }
}

type DataContextValue = DataState & {
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState)

  const refreshData = async () => {
    // TODO: fetch from API and update state.
    dispatch({ type: 'set_net_worth', netWorth: 47382 })
    dispatch({ type: 'set_synced_at', lastSyncedAt: new Date().toISOString() })
  }

  return (
    <DataContext.Provider value={{ ...state, refreshData }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}
