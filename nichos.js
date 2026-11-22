/* =====================================================================
   NICHOS.JS — modelos prontos por tipo de negócio.
   Usados em 3 lugares:
     1. Demonstração sem banco: agendar.html?demo=barbearia
     2. Criação de um negócio novo no painel (serviços, equipe e horários iniciais)
     3. Cores, fonte e textos padrão da página de cada negócio
   tema: cores "R G B" | fonte: 'serif' (Playfair), 'condensed' (Oswald) ou 'sans' (Inter)
   horarios: [diaSemana (0 = domingo), abre, fecha]
   ===================================================================== */
(() => {
  const CLARO = { bg: '253 251 250', surface: '255 255 255', sunken: '246 242 242', text: '28 22 26', muted: '108 98 104', line: '236 228 231' };
  const ESCURO = { bg: '13 13 13', surface: '24 24 24', sunken: '19 19 19', text: '244 240 234', muted: '163 157 149', line: '46 46 46' };
  const semana = (dias, abre, fecha) => dias.map((d) => [d, abre, fecha]);

  window.NICHOS = {
    salao: {
      rotulo: 'Salões de Beleza', emoji: '💇‍♀️', nomeDemo: 'Studio Bella',
      tema: { ...CLARO, brand: '190 24 93', brandContrast: '255 255 255', accent: '251 207 232', fonte: 'serif' },
      hero: { selo: 'Agenda online aberta', titulo: 'Seu cabelo do jeito que você *sempre quis*', subtitulo: 'Corte, cor e tratamento com quem entende. Agende em menos de 1 minuto, sem ligar e sem esperar resposta.' },
      horarios: semana([2, 3, 4, 5, 6], '09:00', '19:00'),
      profissionais: [{ nome: 'Ana', funcao: 'Cabeleireira' }, { nome: 'Bruna', funcao: 'Colorista' }],
      servicos: [
        { nome: 'Corte feminino', descricao: 'Corte personalizado com lavagem e finalização.', duracao_min: 60, preco: 80, categoria: 'Cortes' },
        { nome: 'Escova modelada', descricao: 'Escova com acabamento e brilho.', duracao_min: 45, preco: 60, categoria: 'Cortes' },
        { nome: 'Coloração', descricao: 'Cor global com produtos profissionais.', duracao_min: 120, preco: 180, categoria: 'Coloração' },
        { nome: 'Mechas e luzes', descricao: 'Iluminado, morena iluminada ou balayage.', duracao_min: 180, preco: 320, categoria: 'Coloração' },
        { nome: 'Hidratação profunda', descricao: 'Tratamento para fios secos ou danificados.', duracao_min: 45, preco: 70, categoria: 'Tratamentos' },
        { nome: 'Progressiva', descricao: 'Alinhamento e redução de volume.', duracao_min: 150, preco: 250, categoria: 'Tratamentos' }
      ],
      portfolio: [['Long bob repicado', 'Cortes', '✂️'], ['Morena iluminada', 'Coloração', '🎨'], ['Hidratação + escova', 'Tratamentos', '💧'], ['Corte em camadas', 'Cortes', '✂️'], ['Loiro platinado', 'Coloração', '🎨'], ['Reconstrução', 'Tratamentos', '💧']]
    },

    barbearia: {
      rotulo: 'Barbearias', emoji: '💈', nomeDemo: 'Barbearia Navalha',
      tema: { ...ESCURO, brand: '201 151 63', brandContrast: '18 18 18', accent: '92 64 30', fonte: 'condensed' },
      hero: { selo: 'Horários abertos esta semana', titulo: 'Corte na régua, *barba alinhada*', subtitulo: 'Escolha seu barbeiro e o horário em segundos. Chegou, sentou, cortou. Sem fila e sem espera.' },
      horarios: semana([1, 2, 3, 4, 5], '09:00', '20:00').concat([[6, '08:00', '18:00']]),
      profissionais: [{ nome: 'Rafael', funcao: 'Barbeiro' }, { nome: 'Diego', funcao: 'Barbeiro' }],
      servicos: [
        { nome: 'Corte masculino', descricao: 'Máquina e tesoura, com lavagem.', duracao_min: 40, preco: 45, categoria: 'Cortes' },
        { nome: 'Barba completa', descricao: 'Toalha quente, navalha e hidratação.', duracao_min: 30, preco: 35, categoria: 'Barbas' },
        { nome: 'Corte + barba', descricao: 'O combo completo.', duracao_min: 60, preco: 70, categoria: 'Cortes' },
        { nome: 'Pigmentação de barba', descricao: 'Preenchimento de falhas.', duracao_min: 30, preco: 30, categoria: 'Barbas' },
        { nome: 'Sobrancelha', descricao: 'Limpeza na navalha ou pinça.', duracao_min: 15, preco: 15, categoria: 'Cortes' },
        { nome: 'Platinado', descricao: 'Descoloração global com matização.', duracao_min: 120, preco: 150, categoria: 'Química' }
      ],
      portfolio: [['Low fade', 'Cortes', '✂️'], ['Barba desenhada', 'Barbas', '🧔'], ['Nevou', 'Química', '⚗️'], ['Mid fade + risco', 'Cortes', '✂️'], ['Barba lenhador', 'Barbas', '🧔'], ['Social clássico', 'Cortes', '✂️']]
    },

    esmalteria: {
      rotulo: 'Esmalterias & Manicures', emoji: '💅', nomeDemo: 'Esmalteria Rosé',
      tema: { ...CLARO, brand: '219 39 119', brandContrast: '255 255 255', accent: '252 231 243', fonte: 'serif' },
      hero: { selo: 'Agenda online aberta', titulo: 'Unhas perfeitas, *sem esperar*', subtitulo: 'Manicure, pedicure e alongamento com hora marcada. Escolha sua manicure favorita e agende pelo celular.' },
      horarios: semana([1, 2, 3, 4, 5, 6], '09:00', '19:00'),
      profissionais: [{ nome: 'Juliana', funcao: 'Manicure' }, { nome: 'Patrícia', funcao: 'Nail designer' }],
      servicos: [
        { nome: 'Manicure', descricao: 'Cutilagem e esmaltação.', duracao_min: 40, preco: 30, categoria: 'Mãos' },
        { nome: 'Pedicure', descricao: 'Cutilagem, lixamento e esmaltação.', duracao_min: 50, preco: 35, categoria: 'Pés' },
        { nome: 'Pé e mão', descricao: 'O combo completo.', duracao_min: 80, preco: 60, categoria: 'Mãos' },
        { nome: 'Alongamento em gel', descricao: 'Aplicação completa com formato à escolha.', duracao_min: 120, preco: 150, categoria: 'Alongamento' },
        { nome: 'Manutenção de gel', descricao: 'Manutenção a cada 15–21 dias.', duracao_min: 90, preco: 100, categoria: 'Alongamento' },
        { nome: 'Spa dos pés', descricao: 'Esfoliação, hidratação e massagem.', duracao_min: 40, preco: 45, categoria: 'Pés' }
      ],
      portfolio: [['Francesinha moderna', 'Mãos', '💅'], ['Gel almond nude', 'Alongamento', '✨'], ['Pedicure vermelho', 'Pés', '🦶'], ['Nail art floral', 'Alongamento', '✨'], ['Esmaltação em gel', 'Mãos', '💅'], ['Spa dos pés', 'Pés', '🦶']]
    },

    estetica: {
      rotulo: 'Clínicas de Estética', emoji: '💆‍♀️', nomeDemo: 'Clínica Essenza',
      tema: { ...CLARO, bg: '248 252 251', sunken: '238 246 244', line: '220 236 233', brand: '13 148 136', brandContrast: '255 255 255', accent: '204 251 241', fonte: 'serif' },
      hero: { selo: 'Avaliação e agendamento online', titulo: 'Cuidado com a sua pele, *com hora marcada*', subtitulo: 'Protocolos faciais e corporais com profissionais habilitadas. Agende pelo celular em menos de 1 minuto.' },
      horarios: semana([1, 2, 3, 4, 5], '08:00', '18:00').concat([[6, '08:00', '12:00']]),
      profissionais: [{ nome: 'Dra. Helena', funcao: 'Biomédica esteta' }, { nome: 'Larissa', funcao: 'Esteticista' }],
      servicos: [
        { nome: 'Avaliação estética', descricao: 'Análise e plano de tratamento personalizado.', duracao_min: 30, preco: 0, categoria: 'Facial' },
        { nome: 'Limpeza de pele', descricao: 'Extração, peeling leve e máscara calmante.', duracao_min: 60, preco: 150, categoria: 'Facial' },
        { nome: 'Peeling químico', descricao: 'Renovação celular e uniformização do tom.', duracao_min: 45, preco: 180, categoria: 'Facial' },
        { nome: 'Microagulhamento', descricao: 'Estímulo de colágeno, cicatrizes e poros.', duracao_min: 60, preco: 280, categoria: 'Facial' },
        { nome: 'Drenagem linfática', descricao: 'Redução de inchaço e retenção.', duracao_min: 60, preco: 120, categoria: 'Corporal' },
        { nome: 'Massagem modeladora', descricao: 'Contorno corporal e firmeza.', duracao_min: 60, preco: 130, categoria: 'Corporal' }
      ],
      portfolio: [['Protocolo antiacne', 'Facial', '🧖‍♀️'], ['Drenagem', 'Corporal', '🌿'], ['Rejuvenescimento', 'Facial', '🧖‍♀️'], ['Modeladora', 'Corporal', '🌿'], ['Clareamento de manchas', 'Facial', '🧖‍♀️'], ['Nosso espaço', 'Corporal', '🌿']]
    },

    /* ---------- Nichos de PEDIDO (modo: 'pedido') ----------
       Em vez de agenda, a página do cliente é um cardápio/vitrine (loja.html)
       e o pedido chega pronto no WhatsApp. "servicos" aqui são os itens.
       opcoes: grupos de escolha. min = obrigatório escolher, max = pode escolher. */
    marmitaria: {
      rotulo: 'Marmitarias & Restaurantes', emoji: '🍱', nomeDemo: 'Sabor da Casa', modo: 'pedido',
      tema: { ...CLARO, brand: '217 72 15', brandContrast: '255 255 255', accent: '255 232 214', fonte: 'sans' },
      hero: { selo: 'Cardápio online', titulo: 'Comida caseira, *pedido no WhatsApp*', subtitulo: 'Monte sua marmita, escolha entrega ou retirada e mande o pedido pronto.' },
      loja: {
        aba: 'Cardápio', acao: 'pedido', icone: 'layers', item: 'Prato', itens: 'pratos', origem: 'cardápio',
        chamada: 'Peça pelo nosso cardápio online', verTexto: 'ver o cardápio e deixar seu pedido pronto',
        textos: { sacola: 'carrinho', tituloSacola: 'Seu carrinho', verSacola: 'Ver carrinho', adicionar: 'Adicionar ao carrinho', retirada: 'Retirar no local', obs: 'Ex.: sem cebola, feijão separado' },
        entrega: true, taxa: 5, minimo: 15, pagamentos: 'Pix, Cartão na entrega, Dinheiro', prazo: 'Entrega de 30 a 50 min · retirada em 15 min',
        /* gestão de pedidos no painel: etapas e mensagens prontas para o cliente ({n} = nº do pedido, {nome} = cliente) */
        fluxo: {
          rotulos: { novo: 'Novo', preparo: 'Em preparo', saiu: 'Saiu para entrega', pronto: 'Pronto para retirar', entregue: 'Entregue', cancelado: 'Cancelado' },
          entrega: ['novo', 'preparo', 'saiu', 'entregue'], retirada: ['novo', 'preparo', 'pronto', 'entregue'],
          acoes: { preparo: 'Aceitar e preparar', saiu: 'Saiu para entrega', pronto: 'Pronto para retirar', entregue: 'Marcar como entregue' },
          avisos: {
            novo: 'Olá, {nome}! Recebemos seu pedido nº {n}. Já já começamos a preparar.',
            preparo: 'Olá, {nome}! Seu pedido nº {n} está sendo preparado. 🍳',
            saiu: 'Olá, {nome}! Seu pedido nº {n} saiu para entrega. 🛵',
            pronto: 'Olá, {nome}! Seu pedido nº {n} está pronto para retirar. ✅',
            entregue: 'Obrigado pela preferência, {nome}! Bom apetite. 😊',
            cancelado: 'Olá, {nome}. Infelizmente seu pedido nº {n} foi cancelado. Qualquer dúvida, é só chamar.'
          }
        }
      },
      horarios: semana([1, 2, 3, 4, 5], '10:30', '14:30').concat([[6, '10:30', '14:00']]),
      profissionais: [],
      servicos: [
        { nome: 'Marmita P', descricao: '1 proteína + até 3 guarnições. Serve 1 pessoa.', duracao_min: 30, preco: 15, categoria: 'Marmita P 1 opção', selo: 'Mais pedida', figura: 'marmita', cor: '#d9480f',
          opcoes: [
            { titulo: 'Proteína', min: 1, max: 1, itens: [{ nome: 'Frango grelhado' }, { nome: 'Carne de sol acebolada' }, { nome: 'Frango ao molho' }, { nome: 'Peixe frito', preco: 3 }] },
            { titulo: 'Guarnições', min: 1, max: 3, itens: [{ nome: 'Arroz branco' }, { nome: 'Arroz à grega' }, { nome: 'Feijão de corda' }, { nome: 'Feijão carioca' }, { nome: 'Macarrão' }, { nome: 'Farofa' }, { nome: 'Salada' }] }
          ] },
        { nome: 'Marmita G', descricao: '2 proteínas + até 4 guarnições. Bem servida.', duracao_min: 30, preco: 22, categoria: 'Marmita G 2 opções de proteína', figura: 'marmita', cor: '#2f9e44',
          opcoes: [
            { titulo: 'Proteínas', min: 2, max: 2, itens: [{ nome: 'Frango grelhado' }, { nome: 'Carne de sol acebolada' }, { nome: 'Frango ao molho' }, { nome: 'Peixe frito', preco: 3 }] },
            { titulo: 'Guarnições', min: 1, max: 4, itens: [{ nome: 'Arroz branco' }, { nome: 'Arroz à grega' }, { nome: 'Feijão de corda' }, { nome: 'Feijão carioca' }, { nome: 'Macarrão' }, { nome: 'Farofa' }, { nome: 'Salada' }] },
            { titulo: 'Adicionais', min: 0, max: 2, itens: [{ nome: 'Ovo frito', preco: 2 }, { nome: 'Queijo coalho', preco: 4 }] }
          ] },
        { nome: 'Arroz à grega', descricao: 'Porção avulsa de 300 g.', duracao_min: 30, preco: 7, categoria: 'Guarnições', figura: 'tigela', cor: '#f2c14e' },
        { nome: 'Feijão de corda', descricao: 'Porção avulsa de 300 g.', duracao_min: 30, preco: 7, categoria: 'Guarnições', figura: 'tigela', cor: '#b08968' },
        { nome: 'Farofa da casa', descricao: 'Com bacon. Porção de 150 g.', duracao_min: 30, preco: 5, categoria: 'Guarnições', figura: 'tigela', cor: '#d4a373' },
        { nome: 'Carne de sol acebolada', descricao: 'Porção de 200 g.', duracao_min: 30, preco: 16, categoria: 'Proteínas', figura: 'carne', cor: '#9c4221' },
        { nome: 'Frango grelhado', descricao: 'Filé de peito, porção de 200 g.', duracao_min: 30, preco: 12, categoria: 'Proteínas', figura: 'carne', cor: '#e9a25f' },
        { nome: 'Refrigerante lata 350 ml', descricao: 'Gelado.', duracao_min: 30, preco: 5, categoria: 'Bebidas', figura: 'lata', cor: '#c92a2a',
          opcoes: [{ titulo: 'Sabor', min: 1, max: 1, itens: [{ nome: 'Cola' }, { nome: 'Guaraná' }, { nome: 'Laranja' }] }] },
        { nome: 'Suco natural 1 L', descricao: 'Feito na hora.', duracao_min: 30, preco: 12, categoria: 'Bebidas', figura: 'garrafa', cor: '#f59f00',
          opcoes: [{ titulo: 'Sabor', min: 1, max: 1, itens: [{ nome: 'Laranja' }, { nome: 'Caju' }, { nome: 'Acerola' }, { nome: 'Maracujá' }] }] }
      ],
      portfolio: []
    },

    passeios: {
      rotulo: 'Passeios & Turismo', emoji: '🧭', nomeDemo: 'Rota Sol Turismo', modo: 'pedido',
      tema: { ...CLARO, bg: '247 251 253', sunken: '236 245 249', line: '219 234 242', brand: '2 132 199', brandContrast: '255 255 255', accent: '207 236 252', fonte: 'sans' },
      hero: { selo: 'Reservas online', titulo: 'Seu próximo passeio, *reservado pelo celular*', subtitulo: 'Escolha o passeio, a data e quantas pessoas vão. A reserva chega pronta no WhatsApp da agência.' },
      loja: {
        aba: 'Pacotes', acao: 'reserva', icone: 'map', item: 'Pacote', itens: 'pacotes', origem: 'site de passeios',
        chamada: 'Reserve seu passeio pelo nosso site', verTexto: 'ver os passeios e montar sua reserva',
        textos: { sacola: 'reserva', tituloSacola: 'Sua reserva', verSacola: 'Ver reserva', adicionar: 'Adicionar à reserva', retirada: 'Embarque no ponto combinado', obs: 'Ex.: levamos uma criança de 5 anos', unidade: 'por pessoa', quantidade: 'pessoas', linhaEntrega: false, enviar: 'Enviar reserva no WhatsApp', saudacao: 'Quero fazer uma reserva' },
        entrega: false, taxa: 0, minimo: 0, pagamentos: 'Pix (sinal de 30%), Cartão em até 3x', prazo: 'Confirmamos a reserva pelo WhatsApp em até 2 horas',
        fluxo: {
          rotulos: { novo: 'Nova', preparo: 'Confirmada', entregue: 'Realizada', cancelado: 'Cancelada' },
          entrega: ['novo', 'preparo', 'entregue'], retirada: ['novo', 'preparo', 'entregue'],
          acoes: { preparo: 'Confirmar reserva', entregue: 'Marcar como realizada' },
          avisos: {
            novo: 'Olá, {nome}! Recebemos sua reserva nº {n}. Vamos confirmar as vagas e já te respondemos.',
            preparo: 'Olá, {nome}! Sua reserva nº {n} está confirmada. 🧭 Te esperamos no embarque!',
            entregue: 'Obrigado por passear com a gente, {nome}! Volte sempre. 🌞',
            cancelado: 'Olá, {nome}. Sua reserva nº {n} foi cancelada. Qualquer dúvida, é só chamar.'
          }
        }
      },
      horarios: semana([1, 2, 3, 4, 5, 6], '08:00', '18:00'),
      profissionais: [],
      servicos: [
        { nome: 'Passeio de buggy pelas dunas', descricao: 'Dia inteiro com paradas para banho em lagoas. Buggy para até 4 pessoas, com bugueiro credenciado.', duracao_min: 30, preco: 120, preco_de: 150, categoria: 'Praias e dunas', selo: 'Mais procurado', figura: 'buggy', cor: '#f59f00',
          opcoes: [
            { titulo: 'Data de saída', min: 1, max: 1, itens: [{ nome: 'Sábado, 7h (10 vagas)' }, { nome: 'Domingo, 7h (6 vagas)' }, { nome: 'Quarta, 7h (12 vagas)' }] },
            { titulo: 'Embarque', min: 1, max: 1, itens: [{ nome: 'Hotel na orla' }, { nome: 'Ponto de encontro no centro' }] },
            { titulo: 'Extras', min: 0, max: 2, itens: [{ nome: 'Almoço incluso', preco: 45 }, { nome: 'Fotos profissionais', preco: 30 }] }
          ] },
        { nome: 'Day use em praia', descricao: 'Transporte ida e volta e cadeira com guarda-sol na barraca parceira.', duracao_min: 30, preco: 90, categoria: 'Praias e dunas', figura: 'praia', cor: '#0ea5e9',
          opcoes: [{ titulo: 'Data de saída', min: 1, max: 1, itens: [{ nome: 'Sábado, 8h (14 vagas)' }, { nome: 'Domingo, 8h (8 vagas)' }] }] },
        { nome: 'Trilha e cachoeira na serra', descricao: 'Trilha leve de 4 km com guia, banho de cachoeira e café regional.', duracao_min: 30, preco: 140, categoria: 'Serra e natureza', figura: 'serra', cor: '#2f9e44',
          opcoes: [
            { titulo: 'Data de saída', min: 1, max: 1, itens: [{ nome: 'Sábado, 6h (12 vagas)' }, { nome: 'Domingo, 6h (12 vagas)' }] },
            { titulo: 'Extras', min: 0, max: 1, itens: [{ nome: 'Almoço regional', preco: 40 }] }
          ] },
        { nome: 'City tour histórico', descricao: 'Centro histórico, mercado e museus, em van climatizada com guia.', duracao_min: 30, preco: 70, categoria: 'City tour', figura: 'cidade', cor: '#7c3aed',
          opcoes: [{ titulo: 'Horário', min: 1, max: 1, itens: [{ nome: 'Manhã, 9h' }, { nome: 'Tarde, 14h' }] }] },
        { nome: 'Pacote fim de semana na praia', descricao: '2 diárias em pousada com café da manhã, transporte e 1 passeio de buggy.', duracao_min: 30, preco: 690, categoria: 'Pacotes com hospedagem', selo: 'Promoção', figura: 'mala', cor: '#2563eb',
          opcoes: [{ titulo: 'Acomodação', min: 1, max: 1, itens: [{ nome: 'Quarto duplo' }, { nome: 'Quarto triplo' }, { nome: 'Quarto individual', preco: 180 }] }] }
      ],
      portfolio: []
    }
  };

  /* Nichos OCULTOS: não aparecem no site nem na criação de negócio.
     Para voltar a mostrar um deles, mova o bloco para dentro de window.NICHOS acima. */
  window.NICHOS_OCULTOS = {
    spa: {
      rotulo: 'Spas & Bem-estar', emoji: '🌿', nomeDemo: 'Spa Lótus',
      tema: { ...CLARO, bg: '250 248 243', surface: '255 254 251', sunken: '243 239 230', line: '232 226 214', text: '38 40 34', muted: '112 112 100', brand: '96 116 80', brandContrast: '255 255 255', accent: '236 229 214', fonte: 'serif' },
      hero: { selo: 'Reserve seu momento', titulo: 'Desacelere. *O resto pode esperar.*', subtitulo: 'Massagens, rituais e day spa em um ambiente pensado para o seu descanso. Reserve online em poucos toques.' },
      horarios: semana([2, 3, 4, 5, 6], '10:00', '20:00').concat([[0, '10:00', '16:00']]),
      profissionais: [{ nome: 'Marina', funcao: 'Massoterapeuta' }, { nome: 'Tiago', funcao: 'Massoterapeuta' }],
      servicos: [
        { nome: 'Massagem relaxante', descricao: 'Óleos essenciais e movimentos suaves.', duracao_min: 60, preco: 140, categoria: 'Massagens' },
        { nome: 'Pedras quentes', descricao: 'Alívio profundo de tensões musculares.', duracao_min: 75, preco: 180, categoria: 'Massagens' },
        { nome: 'Esfoliação corporal', descricao: 'Pele renovada e hidratada.', duracao_min: 45, preco: 110, categoria: 'Corpo' },
        { nome: 'Escalda-pés', descricao: 'Ervas, sais e reflexologia.', duracao_min: 30, preco: 60, categoria: 'Corpo' },
        { nome: 'Day spa', descricao: 'Massagem, esfoliação, facial e chá.', duracao_min: 180, preco: 420, categoria: 'Pacotes' },
        { nome: 'Ritual a dois', descricao: 'Massagem simultânea em sala para casal.', duracao_min: 120, preco: 380, categoria: 'Pacotes' }
      ],
      portfolio: [['Sala de massagem', 'Massagens', '🪷'], ['Ritual de pedras', 'Massagens', '🪷'], ['Esfoliação de café', 'Corpo', '🌾'], ['Day spa', 'Pacotes', '🕯️'], ['Escalda-pés', 'Corpo', '🌾'], ['Sala para casal', 'Pacotes', '🕯️']]
    },

    lash: {
      rotulo: 'Lash & Brow Designers', emoji: '✨', nomeDemo: 'Lash Studio Aurora',
      tema: { ...CLARO, bg: '252 250 255', sunken: '245 241 253', line: '234 228 248', brand: '124 58 237', brandContrast: '255 255 255', accent: '237 233 254', fonte: 'serif' },
      hero: { selo: 'Agenda aberta', titulo: 'Olhar marcante, *todos os dias*', subtitulo: 'Extensão de cílios, design de sobrancelhas e lifting. Agende sua aplicação ou manutenção em segundos.' },
      horarios: semana([1, 2, 3, 4, 5, 6], '09:00', '19:00'),
      profissionais: [{ nome: 'Camila', funcao: 'Lash designer' }],
      servicos: [
        { nome: 'Extensão fio a fio', descricao: 'Efeito natural e alongado.', duracao_min: 120, preco: 180, categoria: 'Cílios' },
        { nome: 'Volume russo', descricao: 'Mais volume e densidade.', duracao_min: 150, preco: 250, categoria: 'Cílios' },
        { nome: 'Manutenção de cílios', descricao: 'Reposição a cada 15–20 dias.', duracao_min: 60, preco: 100, categoria: 'Cílios' },
        { nome: 'Lash lifting', descricao: 'Curvatura dos fios naturais.', duracao_min: 60, preco: 130, categoria: 'Cílios' },
        { nome: 'Design de sobrancelha', descricao: 'Mapeamento e design personalizado.', duracao_min: 30, preco: 45, categoria: 'Sobrancelhas' },
        { nome: 'Brow lamination', descricao: 'Fios alinhados e efeito preenchido.', duracao_min: 60, preco: 140, categoria: 'Sobrancelhas' }
      ],
      portfolio: [['Fio a fio natural', 'Cílios', '👁️'], ['Brow lamination', 'Sobrancelhas', '〰️'], ['Volume russo', 'Cílios', '👁️'], ['Design + henna', 'Sobrancelhas', '〰️'], ['Lash lifting', 'Cílios', '👁️'], ['Antes e depois', 'Sobrancelhas', '〰️']]
    },

    consultora: {
      rotulo: 'Consultoras & Revendedoras', emoji: '💄', nomeDemo: 'Bia Beauty',
      tema: { ...CLARO, brand: '225 29 72', brandContrast: '255 255 255', accent: '255 228 230', fonte: 'serif' },
      hero: { selo: 'Atendimento com hora marcada', titulo: 'Sua pele merece *uma consultoria de verdade*', subtitulo: 'Análise de pele, aulas de automaquiagem e retirada de pedidos. Escolha o melhor horário para você.' },
      horarios: semana([1, 2, 3, 4, 5], '09:00', '18:00').concat([[6, '09:00', '13:00']]),
      profissionais: [{ nome: 'Bia', funcao: 'Consultora de beleza' }],
      servicos: [
        { nome: 'Consultoria de pele', descricao: 'Análise e rotina de cuidados personalizada.', duracao_min: 40, preco: 0, categoria: 'Consultoria' },
        { nome: 'Aula de automaquiagem', descricao: 'Aprenda a make do dia a dia.', duracao_min: 90, preco: 150, categoria: 'Aulas' },
        { nome: 'Maquiagem para eventos', descricao: 'Make completa para festas e ocasiões.', duracao_min: 60, preco: 140, categoria: 'Maquiagens' },
        { nome: 'Demonstração de produtos', descricao: 'Teste lançamentos antes de comprar.', duracao_min: 30, preco: 0, categoria: 'Consultoria' },
        { nome: 'Retirada de pedido', descricao: 'Agende para buscar seus produtos.', duracao_min: 15, preco: 0, categoria: 'Consultoria' }
      ],
      portfolio: [['Make para madrinha', 'Maquiagens', '💄'], ['Aula em grupo', 'Aulas', '🎓'], ['Kit skincare', 'Consultoria', '🛍️'], ['Make natural', 'Maquiagens', '💄'], ['Lançamentos do mês', 'Consultoria', '🛍️'], ['Aula individual', 'Aulas', '🎓']]
    },

    tattoo: {
      rotulo: 'Estúdios de Tatuagem', emoji: '🖋️', nomeDemo: 'Inkwell Tattoo',
      tema: { ...ESCURO, bg: '10 10 10', surface: '22 22 22', sunken: '16 16 16', line: '40 40 40', brand: '220 38 38', brandContrast: '255 255 255', accent: '80 20 20', fonte: 'condensed' },
      hero: { selo: 'Agenda de sessões aberta', titulo: 'Sua ideia, *nossa arte na pele*', subtitulo: 'Agende orçamento, sessão ou retoque com o tatuador que combina com seu estilo.' },
      horarios: semana([2, 3, 4, 5, 6], '10:00', '19:00'),
      profissionais: [{ nome: 'Vini', funcao: 'Blackwork & fineline' }, { nome: 'Lara', funcao: 'Realismo & aquarela' }],
      servicos: [
        { nome: 'Orçamento / avaliação', descricao: 'Conversa sobre a ideia, tamanho e local.', duracao_min: 30, preco: 0, categoria: 'Estúdio' },
        { nome: 'Tatuagem pequena', descricao: 'Até 7 cm, traço simples.', duracao_min: 90, preco: 250, categoria: 'Tatuagens' },
        { nome: 'Sessão média', descricao: 'Até 3 horas de sessão.', duracao_min: 180, preco: 600, categoria: 'Tatuagens' },
        { nome: 'Sessão fechada', descricao: 'Diária para projetos grandes.', duracao_min: 360, preco: 1200, categoria: 'Tatuagens' },
        { nome: 'Retoque', descricao: 'Retoque de trabalho do estúdio.', duracao_min: 60, preco: 100, categoria: 'Estúdio' },
        { nome: 'Piercing', descricao: 'Aplicação com joia inclusa.', duracao_min: 30, preco: 120, categoria: 'Piercings' }
      ],
      portfolio: [['Fineline botânico', 'Tatuagens', '🖋️'], ['Realismo', 'Tatuagens', '🖋️'], ['Helix', 'Piercings', '💍'], ['Blackwork', 'Tatuagens', '🖋️'], ['Nosso estúdio', 'Estúdio', '🏷️'], ['Septo', 'Piercings', '💍']]
    }
  };

  /* Busca o modelo de um negócio (inclusive de nicho oculto, para quem já usa) */
  window.nichoPorId = (id) => window.NICHOS[id] || window.NICHOS_OCULTOS[id] || window.NICHOS.salao;
  /* Nichos de pedido usam cardápio/vitrine (loja.html) em vez de agenda */
  window.ehPedido = (id) => window.nichoPorId(id).modo === 'pedido';

  /* Cores da SUA marca (página de vendas e painel) */
  window.TEMA_PRODUTO = null; /* a marca MinhaAgenda usa as cores padrão de src/app.css */

  /* Textos comuns a todas as páginas de negócio. {nome} e {cidade} são trocados automaticamente. */
  window.TEXTOS = {
    beneficios: [
      { icone: 'calendar-clock', titulo: 'Agende 24 horas', texto: 'Escolha serviço, profissional e horário a qualquer hora, direto pelo celular.' },
      { icone: 'layers', titulo: 'Vários serviços de uma vez', texto: 'Monte seu combo: somamos a duração e reservamos tudo em sequência.' },
      { icone: 'smartphone', titulo: 'Sem baixar aplicativo', texto: 'Funciona pelo navegador. Só nome e WhatsApp para confirmar.' },
      { icone: 'shield-check', titulo: 'Horário garantido', texto: 'Quando você confirma, o horário é seu. Ninguém mais consegue marcar por cima.' }
    ],
    passos: [
      { titulo: 'Escolha os serviços', texto: 'Selecione um ou mais serviços e veja o tempo e o valor na hora.' },
      { titulo: 'Escolha dia e horário', texto: 'Aparecem só os horários realmente livres.' },
      { titulo: 'Pronto, está marcado', texto: 'Seu horário fica reservado e você recebe a confirmação.' }
    ],
    faq: [
      { p: 'Preciso baixar algum aplicativo ou criar conta?', r: 'Não. O agendamento funciona pelo navegador do celular ou computador, sem senha e sem cadastro.' },
      { p: 'Posso agendar mais de um serviço?', r: 'Sim. Selecione todos os serviços desejados: o tempo total é somado e o horário é reservado em sequência.' },
      { p: 'Como remarco ou cancelo?', r: 'Chame o {nome} no WhatsApp com pelo menos 24 horas de antecedência para liberarmos o horário para outra pessoa.' },
      { p: 'Quais formas de pagamento são aceitas?', r: 'Pix, cartões de débito e crédito e dinheiro, pagos no dia do atendimento.' }
    ]
  };
})();
