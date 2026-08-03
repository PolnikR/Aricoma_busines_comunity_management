import { useTranslation } from '@/hooks/useTranslation'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system']

export function ThemeSelector() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-text-muted">
        {t('theme.label')}
      </legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
        {THEME_OPTIONS.map((option) => {
          const selected = theme === option

          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setTheme(option)
              }}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                selected
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {t(`theme.${option}`)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
