/* Aplica o modo escuro salvo antes de a página aparecer (evita "piscar" claro). */
(() => {
  let t = null;
  try { t = JSON.parse(localStorage.getItem('tema')); } catch { /* ignora */ }
  if (t === 'escuro' || (t == null && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.setAttribute('data-tema', 'escuro');
})();
