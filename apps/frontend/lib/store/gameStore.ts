import { create } from 'zustand'

interface GameState {
  saveId: string | null
  currentStoryId: string | null
  inventory: Record<string, number>
  wallets: Record<string, number>
  stats: Record<string, number>
  flags: Record<string, any>
  setSaveId: (saveId: string) => void
  setCurrentStory: (storyId: string) => void
  updateInventory: (inventory: Record<string, number>) => void
  updateWallets: (wallets: Record<string, number>) => void
  updateStats: (stats: Record<string, number>) => void
  updateFlags: (flags: Record<string, any>) => void
  updateGameState: (updates: Partial<Omit<GameState, 'setSaveId' | 'setCurrentStory' | 'updateInventory' | 'updateWallets' | 'updateStats' | 'updateFlags' | 'updateGameState' | 'resetGame' | 'reset'>>) => void
  resetGame: () => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  saveId: null,
  currentStoryId: null,
  inventory: {},
  wallets: {},
  stats: {},
  flags: {},
  setSaveId: (saveId) => set({ saveId }),
  setCurrentStory: (storyId) => set({ currentStoryId: storyId }),
  updateInventory: (inventory) => set({ inventory }),
  updateWallets: (wallets) => set({ wallets }),
  updateStats: (stats) => set({ stats }),
  updateFlags: (flags) => set({ flags }),
  updateGameState: (updates) => set((state) => ({ ...state, ...updates })),
  resetGame: () => set({
    saveId: null,
    currentStoryId: null,
    inventory: {},
    wallets: {},
    stats: {},
    flags: {},
  }),
  reset: () => set({
    saveId: null,
    currentStoryId: null,
    inventory: {},
    wallets: {},
    stats: {},
    flags: {},
  }),
}))
