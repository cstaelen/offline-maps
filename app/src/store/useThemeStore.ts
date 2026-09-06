import { create } from 'zustand'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mapstackui-theme'

// localStorage can throw in restricted contexts (e.g. Safari private browsing
// with strict settings, or a browser with storage disabled entirely). Since
// getInitialTheme runs at store-creation time (module load), an uncaught
// throw here would crash the whole app before it renders anything — so both
// the read and the write are defensive, falling back to system preference /
// in-memory-only state rather than propagating the error.
function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore: theme still applies for this session via in-memory state,
    // it just won't persist across reloads.
  }
}

function getInitialTheme(): Theme {
  const stored = readStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeStoreState {
  theme: Theme
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    writeStoredTheme(next)
    set({ theme: next })
  },
}))
