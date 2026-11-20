/* =====================================================================
   VENDAS.JS — interações da página de vendas
   ===================================================================== */
(() => {
  'use strict';
  const { $, $$, esc, icons } = U;
  const P = CONFIG.produto;
  const reais = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v >= 100 ? 0 : 2 });
  const slot = (n, html) => $$(`[data-slot="${n}"]`).forEach((el) => { el.innerHTML = html; });
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Origem do anúncio (utm) entra na mensagem do WhatsApp ---------- */
  const params = new URLSearchParams(location.search);
  let origem = params.get('utm_source') || '';
  try { if (origem) sessionStorage.setItem('origem', origem); else origem = sessionStorage.getItem('origem') || ''; } catch { /* navegação privada */ }
  const ORIGENS = { ig: 'Instagram', instagram: 'Instagram', fb: 'Facebook', facebook: 'Facebook', tiktok: 'TikTok', google: 'Google', whatsapp: 'WhatsApp' };
  const sufixo = origem ? ` (vim pelo ${ORIGENS[origem.toLowerCase()] || U.limparTexto(origem, 20)})` : '';

  slot('produto', esc(P.nome)); slot('ano', new Date().getFullYear()); slot('cidade', esc(P.cidade)); slot('email', esc(P.email));
  $$('[data-slot-href="email"]').forEach((a) => { a.href = `mailto:${P.email}`; });
  $$('[data-wa-vendas]').forEach((a) => { a.href = U.waLink(P.whatsapp, a.dataset.waVendas + sufixo); a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- Hero: agenda que se enche sozinha (uma vez, ao carregar) ---------- */
  const AGENDA = [
    ['09:00', 'Corte + escova', 'Ana', 'Marina', 140],
    ['09:30', 'Manicure', 'Juliana', 'Bruna', 30],
    ['10:30', 'Coloração', 'Bruna', 'Patrícia', 180],
    ['11:00', 'Corte masculino', 'Rafael', 'Diego', 45],
    ['13:30', 'Design de sobrancelha', 'Camila', 'Larissa', 45]
  ];
  slot('agenda-viva', AGENDA.map(([h], i) => `
    <li class="flex min-h-[4rem] items-center gap-4 px-5 py-3" data-linha="${i}">
      <span class="w-12 shrink-0 font-display text-sm font-bold text-muted">${h}</span>
      <span class="h-9 flex-1 rounded-xl border border-dashed border-line" data-vaga="${i}"></span>
    </li>`).join(''));
  let total = 0;
  const preencher = (i) => {
    const [h, serv, prof, cli, val] = AGENDA[i];
    const vaga = $(`[data-vaga="${i}"]`);
    vaga.outerHTML = `<span class="flex-1 rounded-xl bg-accent/70 px-3 py-2 ${reduzMovimento ? '' : 'animate-[entrar_.45s_ease-out]'}">
      <b class="block text-sm leading-tight">${esc(serv)}</b><span class="text-xs text-muted">${esc(cli)} com ${esc(prof)}</span></span>`;
    total += val;
    $('[data-slot="agenda-total"]').textContent = reais(total);
    const n = $('[data-slot="notificacao"]');
    $('[data-slot="notificacao-texto"]').textContent = `${serv}, ${h}`;
    n.classList.remove('opacity-0'); n.classList.add('opacity-100');
    clearTimeout(preencher.t); preencher.t = setTimeout(() => n.classList.replace('opacity-100', 'opacity-0'), 1500);
  };
  if (reduzMovimento) AGENDA.forEach((_, i) => preencher(i));
  else AGENDA.forEach((_, i) => setTimeout(() => preencher(i), 700 + i * 1100));

  /* ---------- Faixa de nichos ---------- */
  slot('faixa-nichos', Object.values(NICHOS).map((n) => `<span class="flex shrink-0 items-center gap-2 rounded-full bg-sunken px-4 py-2"><span class="h-2.5 w-2.5 rounded-full" style="background:${U.rgbParaHex(n.tema.brand)}"></span>${esc(n.rotulo)}</span>`).join(''));

  /* ---------- Demonstração: amostras de cor que trocam o celular ---------- */
  const frame = $('[data-slot="demo-frame"]');
  function escolherNicho(id, foco) {
    const n = NICHOS[id];
    $$('[data-nicho]').forEach((b) => { const on = b.dataset.nicho === id; b.setAttribute('aria-checked', on); b.querySelector('[data-anel]').classList.toggle('ring-4', on); });
    const pagina = n.modo === 'pedido' ? 'loja' : 'agendar';      /* marmitaria e passeios: cardápio com pedido no WhatsApp */
    frame.src = `${pagina}.html?demo=${id}`;
    $('[data-slot="demo-link"]').href = `${pagina}.html?demo=${id}`;
    $('[data-slot="demo-titulo"]').textContent = `${n.emoji} ${n.rotulo}`;
    $('[data-slot="demo-detalhe"]').textContent = n.modo === 'pedido'
      ? `${n.loja.aba} com ${n.loja.acao} pelo WhatsApp: já vem com ${n.servicos.length} ${n.loja.itens} de exemplo, com escolhas e horários. Você troca tudo pelo painel.`
      : `Já vem com ${n.servicos.length} serviços, ${n.profissionais.length} profissional(is) e horários de exemplo. Você troca tudo pelo painel.`;
    if (foco) $(`[data-nicho="${id}"]`).focus();
  }
  slot('amostras', Object.entries(NICHOS).map(([id, n]) => `
    <button type="button" role="radio" aria-checked="false" data-nicho="${id}" class="group grid justify-items-center gap-2 rounded-2xl p-1 text-center text-[11px] font-semibold leading-tight text-muted focus-visible:outline-offset-0">
      <span data-anel class="grid h-14 w-14 place-items-center rounded-full text-2xl ring-brand/30 transition group-hover:scale-105" style="background:${U.rgbParaHex(n.tema.brand)};--tw-ring-color:${U.rgbParaHex(n.tema.brand)}55">${n.emoji}</span>
      <span class="line-clamp-2">${esc(n.rotulo.split(' & ')[0].split(' de ')[0])}</span>
    </button>`).join(''));
  $('[data-slot="amostras"]').addEventListener('click', (e) => { const b = e.target.closest('[data-nicho]'); if (b) escolherNicho(b.dataset.nicho); });
  $('[data-slot="amostras"]').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const ids = Object.keys(NICHOS), atual = ids.indexOf($('[data-nicho][aria-checked="true"]').dataset.nicho);
    escolherNicho(ids[(atual + (/Right|Down/.test(e.key) ? 1 : ids.length - 1)) % ids.length], true);
  });
  escolherNicho(Object.keys(NICHOS).includes(params.get('nicho')) ? params.get('nicho') : 'salao');

  /* ---------- Bento: comissão interativa ---------- */
  const calcCom = () => {
    const preco = Math.max(0, Number($('[data-calc-com="preco"]').value) || 0), pct = Number($('[data-calc-com="pct"]').value);
    $('[data-slot="com-pct"]').textContent = `${pct}%`;
    $('[data-slot="com-valor"]').textContent = (preco * pct / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  $$('[data-calc-com]').forEach((el) => el.addEventListener('input', calcCom));
  calcCom();

  /* ---------- Bento: financeiro de exemplo ---------- */
  slot('mini-fin', [['Ana', 2380, 40], ['Rafael', 1720, 35], ['Juliana', 1240, 50]].map(([nome, fat, pct]) => `
    <div class="rounded-2xl bg-sunken p-4">
      <p class="text-sm font-semibold text-muted">${nome}</p>
      <p class="mt-1 font-display text-2xl font-bold">${reais(fat)}</p>
      <div class="mt-3 h-2 rounded-full bg-line"><div class="h-2 rounded-full bg-brand" style="width:${Math.round(fat / 2380 * 100)}%"></div></div>
      <p class="mt-2 text-xs text-muted">Comissão ${pct}%: <b class="text-ink">${reais(fat * pct / 100)}</b></p>
    </div>`).join(''));

  /* ---------- Bento: QR Code real da demonstração ---------- */
  if (window.qrcode) {
    const qr = qrcode(0, 'M'); qr.addData(new URL('agendar.html?demo=barbearia', location.href).href); qr.make();
    $('[data-slot="qr-demo"]').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  /* ---------- Calculadora ---------- */
  const calc = $('[data-slot="calc"]');
  const SEMANAS = 4.33;
  function calcular() {
    const v = Object.fromEntries([...new FormData(calc)].map(([k, x]) => [k, Number(x)]));
    calc.querySelector('[data-out="ag"]').textContent = v.ag;
    calc.querySelector('[data-out="min"]').textContent = `${v.min} min`;
    calc.querySelector('[data-out="faltas"]').textContent = v.faltas;
    calc.querySelector('[data-out="ticket"]').textContent = reais(v.ticket);
    calc.querySelector('[data-out="evita"]').textContent = `${v.evita}%`;
    const horas = v.ag * v.min * SEMANAS / 60, perdido = v.faltas * v.ticket * SEMANAS;
    $('[data-slot="calc-horas"]').textContent = `${horas < 10 ? horas.toFixed(1).replace('.', ',') : Math.round(horas)} h`;
    $('[data-slot="calc-perdido"]').textContent = reais(Math.round(perdido));
    $('[data-slot="calc-recupera"]').textContent = reais(Math.round(perdido * v.evita / 100));
  }
  calc.addEventListener('input', calcular);
  calcular();

  /* ---------- Planos ---------- */
  slot('planos', P.planos.map((p) => `
    <div class="relative flex flex-col p-7 ${p.destaque ? 'rounded-panel bg-ink text-page' : 'panel'}">
      ${p.destaque ? '<span class="badge absolute -top-3 left-7 bg-blush px-3 py-1 text-xs text-ink">Mais escolhido</span>' : ''}
      <p class="font-display text-2xl font-bold">${esc(p.nome)}</p>
      <p class="mt-4"><span class="font-display text-4xl font-extrabold">${p.preco == null ? 'Sob consulta' : reais(p.preco)}</span>${p.preco == null ? '' : ` <span class="text-sm opacity-70">${esc(p.periodo)}</span>`}</p>
      <ul class="mt-6 grid flex-1 gap-3 text-sm">${p.itens.map((i) => `<li class="flex gap-3"><i data-lucide="check" class="mt-0.5 h-4 w-4 shrink-0 ${p.destaque ? 'text-mint' : 'text-ok'}"></i><span>${esc(i)}</span></li>`).join('')}</ul>
      <a href="${U.waLink(P.whatsapp, `Olá! Tenho interesse no plano ${p.nome}.${sufixo}`)}" target="_blank" rel="noopener" class="btn mt-8 ${p.destaque ? 'bg-page text-ink hover:bg-white' : 'btn-ghost'}">Quero o ${esc(p.nome)}</a>
    </div>`).join(''));

  /* ---------- Dúvidas ---------- */
  const FAQ = [
    ['Meu cliente precisa baixar aplicativo?', 'Não. Ele abre o link pelo navegador do celular, escolhe e confirma com nome e WhatsApp.'],
    ['E se duas pessoas tentarem o mesmo horário?', 'Só a primeira consegue. O próprio banco de dados bloqueia a segunda reserva, e a pessoa vê os horários que continuam livres.'],
    ['Cada profissional tem seu login?', 'No plano Equipe, sim. Cada um vê só a própria agenda e quanto ganhou de comissão. Preços, equipe e dados do negócio ficam com o dono.'],
    ['O sistema calcula a comissão?', 'Sim. Você define a porcentagem por serviço e pode ter exceções por profissional. No fechamento da semana ou do mês, o valor de cada um já está pronto.'],
    ['O cliente recebe o link quando me chama no WhatsApp?', 'Sim, pela mensagem de saudação do WhatsApp Business. O texto vem pronto no painel, é só colar.'],
    ['Consigo lançar quem marca por telefone ou no balcão?', 'Consegue. No painel tem "Novo agendamento", que também respeita a regra de não conflitar.'],
    ['Tem fidelidade?', 'Não. Você pode cancelar quando quiser.']
  ];
  slot('faq', FAQ.map(([p, r]) => `
    <details class="card group px-5">
      <summary class="flex cursor-pointer items-center justify-between gap-4 py-5 font-display text-lg font-semibold">${p}<i data-lucide="plus" class="faq-icon h-5 w-5 shrink-0 text-brand transition"></i></summary>
      <p class="-mt-1 pb-5 text-muted">${r}</p>
    </details>`).join(''));

  /* ---------- Barra fixa no celular depois do topo ---------- */
  const barra = $('[data-slot="barra-fixa"]');
  const hero = $('main section');
  new IntersectionObserver(([e]) => barra.classList.toggle('translate-y-full', e.isIntersecting), { threshold: 0 }).observe(hero);

  icons();
})();
