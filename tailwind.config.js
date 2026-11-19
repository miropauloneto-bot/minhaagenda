/* Cores ligadas às variáveis CSS: cada negócio troca o tema sem recompilar. */
module.exports = {
  content: ['./*.html', './agendar/*.html', './painel/*.html', './privacidade/*.html', './assets/*.js'],
  darkMode: ['class', '[data-tema="escuro"]'],
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        'brand-contrast': 'rgb(var(--c-brand-contrast) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        page: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        blush: 'rgb(var(--c-blush) / <alpha-value>)',
        mint: 'rgb(var(--c-mint) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        bad: 'rgb(var(--c-bad) / <alpha-value>)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Bricolage Grotesque', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif']
      },
      borderRadius: { panel: '1.75rem' }
    }
  },
  plugins: []
};
