/* Preenche nome do produto e e-mail na política de privacidade. */
(() => {
  const P = (window.CONFIG || {}).produto || {};
  document.querySelectorAll('[data-slot="produto"]').forEach((el) => { el.textContent = P.nome || 'MinhaAgenda'; });
  document.querySelectorAll('[data-slot="email"]').forEach((el) => { el.textContent = P.email || ''; });
  document.querySelectorAll('[data-slot-href="email"]').forEach((a) => { a.href = `mailto:${P.email || ''}`; });
  if (window.lucide) window.lucide.createIcons();
})();
