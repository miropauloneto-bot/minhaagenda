/* Liga as cores do Tailwind às variáveis CSS (trocadas por nicho em comum.js).
   Carregue logo depois de <script src="https://cdn.tailwindcss.com">. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        'brand-contrast': 'rgb(var(--c-brand-contrast) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        page: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  }
};
