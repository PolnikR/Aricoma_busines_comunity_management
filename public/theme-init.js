;(function initializeTheme() {
  var preference = 'system'

  try {
    var storedPreference = localStorage.getItem('app-theme')
    if (storedPreference === 'light' || storedPreference === 'dark') {
      preference = storedPreference
    }
  } catch {
    // System preference remains available when storage is blocked.
  }

  var resolvedTheme =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference
  var root = document.documentElement

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
})()
