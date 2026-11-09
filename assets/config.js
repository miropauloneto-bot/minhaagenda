/* =====================================================================
   CONFIG.JS — as ÚNICAS informações que você precisa preencher.
   ===================================================================== */
window.CONFIG = {
  /* 1) Supabase > Project Settings > API (ou "Connect"):
        - Project URL
        - Publishable key (ou "anon public key")
     Essas duas são públicas por natureza e podem ficar no GitHub.
     NUNCA coloque aqui a "secret key" / "service_role". */
  supabaseUrl: 'https://xggtvhmlnlxwbklpopaj.supabase.co',
  supabaseKey: 'sb_publishable_6HwKBV0UUwPfW7d9ZbD-ZQ_PZNsCQWO',

  /* 2) Seu produto (aparece na página de vendas) */
  produto: {
    nome: 'MinhaAgenda',
    slogan: 'Agenda online para quem cuida da beleza dos outros',
    whatsapp: '5585987971155',          // SEU WhatsApp de vendas (DDI + DDD + número)
    email: 'miropauloneto@gmail.com',
    cidade: 'Fortaleza/CE',

    /* Planos: deixe preco como null para mostrar "Sob consulta". */
    planos: [
      {
        nome: 'Essencial',
        preco: null,
        periodo: '/mês',
        destaque: false,
        itens: ['1 profissional (ideal para quem atende sozinho)', 'Página de agendamento com seu link', 'Agenda sem conflito de horário', 'Lembrete no WhatsApp com 1 clique', 'Financeiro: faturamento por semana e mês']
      },
      {
        nome: 'Equipe',
        preco: null,
        periodo: '/mês',
        destaque: true,
        itens: ['Até 6 profissionais', 'Tudo do Essencial', 'Login individual: cada profissional vê só a própria agenda e ganhos', 'Comissão automática por serviço e por profissional', 'Relatório por profissional e fechamento pelo WhatsApp', 'Mais de 6 profissionais: sob consulta']
      },
      {
        nome: 'Implantação',
        preco: null,
        periodo: 'pagamento único',
        destaque: false,
        itens: ['Cadastro dos seus serviços, preços e equipe', 'Comissões configuradas', 'Página com as cores do seu negócio', 'Mensagem automática do WhatsApp Business e QR Code', 'Treinamento rápido do dono e da equipe']
      }
    ]
  }
};
