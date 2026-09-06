import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeToggle() {
  const theme = useThemeStore(s => s.theme)
  const toggleTheme = useThemeStore(s => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-50 dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text dark:hover:bg-monokai-surface"
    >
      {theme === 'dark' ? (
        <Sun aria-hidden="true" className="h-5 w-5" />
      ) : (
        <Moon aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  )
}
