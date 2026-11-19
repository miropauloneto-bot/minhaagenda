/* Gera icones.js só com os ícones usados no site (em vez de 350 KB do pacote inteiro). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const pastaIcones = path.join(raiz, 'node_modules/lucide/dist/esm/icons');
const existentes = new Set(fs.readdirSync(pastaIcones).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));

const fontes = ['index.html', 'agendar.html', 'painel.html', 'privacidade.html', 'config.js', 'nichos.js', 'comum.js', 'vendas.js', 'agendar.js', 'painel.js', 'privacidade.js'];
const usados = new Set();
for (const f of fontes) {
  const p = path.join(raiz, f);
  if (!fs.existsSync(p)) continue;
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/['"`]([a-z0-9]+(?:-[a-z0-9]+)*)['"`]/g)) if (existentes.has(m[1])) usados.add(m[1]);
}

const nos = {};
for (const nome of [...usados].sort()) {
  const mod = await import(pathToFileURL(path.join(pastaIcones, `${nome}.js`)).href);
  nos[nome] = mod.default[2];
}

const js = `/* Ícones Lucide (ISC) usados pelo site. Gerado por gerar-icones.mjs, não edite. */
window.lucide = (() => {
  const I = ${JSON.stringify(nos)};
  const NS = 'http://www.w3.org/2000/svg';
  function svg(nome, el) {
    const s = document.createElementNS(NS, 'svg');
    const a = { xmlns: NS, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.entries(a).forEach(([k, v]) => s.setAttribute(k, v));
    s.setAttribute('class', ('lucide lucide-' + nome + ' ' + (el.getAttribute('class') || '')).trim());
    I[nome].forEach(([tag, attrs]) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); s.appendChild(n); });
    return s;
  }
  return {
    createIcons() {
      document.querySelectorAll('i[data-lucide]').forEach((el) => {
        const nome = el.getAttribute('data-lucide');
        if (I[nome]) el.replaceWith(svg(nome, el));
      });
    }
  };
})();
`;
fs.writeFileSync(path.join(raiz, 'icones.js'), js);
console.log(`icones.js: ${usados.size} ícones, ${(js.length / 1024).toFixed(1)} KB`);
