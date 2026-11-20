/* =====================================================================
   CARDAPIO-DADOS.JS — dados do cardápio de marmitaria (exemplo fictício).
   A página cardapio.html carrega este arquivo e depois o catalogo.js,
   que é o mesmo motor da vitrine de salão.
   Para um cliente: troque nome, endereço, WhatsApp, horários e produtos.

   Escolhas dentro do produto ("grupos"):
     min = quantas o cliente É OBRIGADO a escolher (0 = opcional)
     max = quantas ele PODE escolher (1 = escolha única)
     preco em um item = valor somado ao produto
   ===================================================================== */
window.LOJA_DADOS = {
  nome: 'Sabor da Casa',
  sigla: 'SC',
  cor: '#d9480f',                        // cor principal da página
  capa: ['Sabor', 'da Casa', 'marmitaria'],
  endereco: 'Rua Exemplo, 456 - Bairro Modelo, Fortaleza - CE',
  whatsapp: '5585900000000',             // DDI + DDD + número da LOJA (troque pelo do cliente)
  pedidoMinimo: 15,
  taxaEntrega: 5,
  entrega: true,
  prazo: 'Entrega de 30 a 50 min · retirada em 15 min',
  pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'],
  instagram: '@sabordacasa.exemplo',
  // 0 = domingo ... 6 = sábado. null = fechado.
  horarios: [null, ['10:30', '14:30'], ['10:30', '14:30'], ['10:30', '14:30'], ['10:30', '14:30'], ['10:30', '14:30'], ['10:30', '14:00']],
  textos: { sacola: 'carrinho', retirada: 'Retirar no local', obs: 'Ex.: sem cebola, feijão separado', origem: 'cardápio' },
  categorias: [
    { id: 'marmita-p', nome: 'Marmita P 1 opção' },
    { id: 'marmita-g', nome: 'Marmita G 2 opções de proteína' },
    { id: 'guarnicoes', nome: 'Guarnições' },
    { id: 'proteinas', nome: 'Proteínas' },
    { id: 'latas', nome: 'Bebidas latas' },
    { id: 'litro', nome: 'Bebidas 1L' },
    { id: 'dois-litros', nome: 'Bebidas 2L' }
  ],
  produtos: [
    { id: 'mp', cat: 'marmita-p', nome: 'Marmita P', desc: '1 proteína + até 3 guarnições. Serve 1 pessoa.', preco: 15, figura: 'marmita', cor: '#d9480f', selo: 'Mais pedida',
      grupos: [
        { titulo: 'Proteína', min: 1, max: 1, itens: [{ nome: 'Frango grelhado' }, { nome: 'Carne de sol acebolada' }, { nome: 'Frango ao molho' }, { nome: 'Peixe frito', preco: 3 }, { nome: 'Picanha suína', preco: 4 }] },
        { titulo: 'Guarnições', min: 1, max: 3, itens: [{ nome: 'Arroz branco' }, { nome: 'Arroz à grega' }, { nome: 'Feijão de corda' }, { nome: 'Feijão carioca' }, { nome: 'Macarrão' }, { nome: 'Farofa' }, { nome: 'Salada' }, { nome: 'Purê de batata' }] }
      ] },
    { id: 'mg', cat: 'marmita-g', nome: 'Marmita G', desc: '2 proteínas + até 4 guarnições. Bem servida.', preco: 22, figura: 'marmita', cor: '#2f9e44',
      grupos: [
        { titulo: 'Proteínas', min: 2, max: 2, itens: [{ nome: 'Frango grelhado' }, { nome: 'Carne de sol acebolada' }, { nome: 'Frango ao molho' }, { nome: 'Peixe frito', preco: 3 }, { nome: 'Picanha suína', preco: 4 }] },
        { titulo: 'Guarnições', min: 1, max: 4, itens: [{ nome: 'Arroz branco' }, { nome: 'Arroz à grega' }, { nome: 'Feijão de corda' }, { nome: 'Feijão carioca' }, { nome: 'Macarrão' }, { nome: 'Farofa' }, { nome: 'Salada' }, { nome: 'Purê de batata' }] },
        { titulo: 'Adicionais', min: 0, max: 2, itens: [{ nome: 'Ovo frito', preco: 2 }, { nome: 'Queijo coalho', preco: 4 }, { nome: 'Vinagrete', preco: 1.5 }] }
      ] },
    { id: 'g1', cat: 'guarnicoes', nome: 'Arroz branco', desc: 'Porção avulsa 300 g.', preco: 6, figura: 'tigela', cor: '#f1e9d2' },
    { id: 'g2', cat: 'guarnicoes', nome: 'Arroz à grega', desc: 'Porção avulsa 300 g.', preco: 7, figura: 'tigela', cor: '#f2c14e' },
    { id: 'g3', cat: 'guarnicoes', nome: 'Feijão de corda', desc: 'Porção avulsa 300 g.', preco: 7, figura: 'tigela', cor: '#b08968' },
    { id: 'g4', cat: 'guarnicoes', nome: 'Feijão carioca', desc: 'Porção avulsa 300 g.', preco: 6, figura: 'tigela', cor: '#8d5524' },
    { id: 'g5', cat: 'guarnicoes', nome: 'Macarrão', desc: 'Ao alho e óleo. Porção 300 g.', preco: 7, figura: 'tigela', cor: '#f4d35e' },
    { id: 'g6', cat: 'guarnicoes', nome: 'Farofa', desc: 'Farofa da casa com bacon. Porção 150 g.', preco: 5, figura: 'tigela', cor: '#d4a373' },
    { id: 'pr1', cat: 'proteinas', nome: 'Frango grelhado', desc: 'Filé de peito, porção 200 g.', preco: 12, figura: 'carne', cor: '#e9a25f' },
    { id: 'pr2', cat: 'proteinas', nome: 'Carne de sol acebolada', desc: 'Porção 200 g.', preco: 16, figura: 'carne', cor: '#9c4221' },
    { id: 'pr3', cat: 'proteinas', nome: 'Peixe frito', desc: 'Filé empanado, porção 200 g.', preco: 15, figura: 'carne', cor: '#e0b15c' },
    { id: 'b1', cat: 'latas', nome: 'Refrigerante lata 350 ml', desc: 'Gelado.', preco: 5, figura: 'lata', cor: '#c92a2a',
      opcoes: { titulo: 'Sabor', obrigatorio: true, itens: [{ nome: 'Cola' }, { nome: 'Guaraná' }, { nome: 'Laranja' }, { nome: 'Limão' }] } },
    { id: 'b2', cat: 'latas', nome: 'Água mineral 500 ml', desc: 'Com ou sem gás.', preco: 3, figura: 'garrafa', cor: '#74c0fc',
      opcoes: { titulo: 'Tipo', obrigatorio: true, itens: [{ nome: 'Sem gás' }, { nome: 'Com gás', preco: 0.5 }] } },
    { id: 'b3', cat: 'litro', nome: 'Suco natural 1 L', desc: 'Feito na hora.', preco: 12, figura: 'garrafa', cor: '#f59f00',
      opcoes: { titulo: 'Sabor', obrigatorio: true, itens: [{ nome: 'Laranja' }, { nome: 'Caju' }, { nome: 'Acerola' }, { nome: 'Maracujá' }] } },
    { id: 'b4', cat: 'litro', nome: 'Refrigerante 1 L', desc: 'Gelado.', preco: 8, figura: 'garrafa', cor: '#a61e4d',
      opcoes: { titulo: 'Sabor', obrigatorio: true, itens: [{ nome: 'Cola' }, { nome: 'Guaraná' }] } },
    { id: 'b5', cat: 'dois-litros', nome: 'Refrigerante 2 L', desc: 'Ideal para a família.', preco: 12, figura: 'garrafa', cor: '#862e9c',
      opcoes: { titulo: 'Sabor', obrigatorio: true, itens: [{ nome: 'Cola' }, { nome: 'Guaraná' }, { nome: 'Laranja' }] } }
  ]
};
