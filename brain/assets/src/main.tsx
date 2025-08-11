// Minimal bootstrap for hybrid setup. Avoid external deps to keep repo install-light.

// Initialize basic helpers (e.g., auto-hide site messages if present)
document.addEventListener('DOMContentLoaded', () => {
  const toasts = Array.from(document.querySelectorAll<HTMLElement>('.toast.site-message'))
  toasts.forEach((el) => {
    // Fallback: simple auto-hide without Bootstrap dependency
    el.style.opacity = '1'
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s'
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    }, 6000)
  })
})

// Export nothing; this is an entry file.

