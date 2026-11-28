# MinhaAgenda — agendamento online para beleza e bem-estar

Sistema completo para salões, barbearias, esmalterias e clínicas de estética, e agora também para **marmitarias/restaurantes** e **passeios/turismo** (cardápio ou pacotes com pedido pelo WhatsApp).

> Spas, lash/brow designers, consultoras e estúdios de tatuagem estão **ocultos** (em `NICHOS_OCULTOS`, no `nichos.js`). Para voltar a oferecer um deles, mova o bloco dele para dentro de `window.NICHOS`.

| Página | Endereço | Para quem |
|---|---|---|
| Página de vendas | `/` | Seus anúncios e visitas |
| Demonstrações | `/agendar.html?demo=barbearia` | Mostrar sem banco de dados |
| Página do negócio | `/agendar.html?n=nome-do-negocio` | O cliente final agendar |
| Cardápio / pacotes | `/loja.html?n=nome-do-negocio` | Cliente de marmitaria ou passeio fazer o pedido (o link de agendar também redireciona) |
| Demonstrações de pedido | `/loja.html?demo=marmitaria` · `/loja.html?demo=passeios` | Mostrar sem banco de dados |
| Painel | `/painel.html` | Dono e profissionais |
| Privacidade | `/privacidade.html` | Exigida por lei e pelos anúncios do Instagram/Facebook |

---

## Novidades da versão 5.1: acabamento e celular

- **Troca de nicho na demonstração** com transição: a tela nova carrega por trás enquanto uma varredura na cor do nicho (grade, linha de luz e "Montando…") cobre a troca, e o brilho em volta do celular muda de cor. Quem pede menos movimento no aparelho vê só um esmaecimento.
- **Celular:** sem o flash cinza ao tocar, toque sem atraso, botões que afundam no toque, hover que não fica preso, campos que não dão zoom no iPhone, conteúdo fora do entalhe da câmera e altura certa com a barra do navegador.
- **Textos longos** (nome de prato sem espaço, opção comprida) quebram a linha em vez de empurrar a página.

---

## Novidades da versão 5: gestão de pedidos

- **Aba Pedidos (ou Reservas, nos passeios)** no painel: fila do dia por ordem de chegada, com nº do pedido, hora, há quanto tempo chegou, cliente, itens e escolhas, entrega ou retirada, endereço, pagamento, troco e total.
- **Etapas com um toque:** Novo → Em preparo → Saiu para entrega (ou Pronto para retirar) → Entregue. Nos passeios: Nova → Confirmada → Realizada. Também dá para cancelar e reabrir.
- **"Avisar cliente":** abre o WhatsApp do cliente com a mensagem pronta da etapa ("Seu pedido nº 12 saiu para entrega").
- **Resumo do dia:** em aberto, quantidade, vendido, ticket médio, entregas x retiradas e o que mais saiu. Dá para ver dias anteriores.
- **Alerta de pedido novo:** número vermelho no menu, no título da aba e um bipe, em qualquer tela do painel (a fila se atualiza a cada 20 segundos).
- **Segurança:** o navegador do cliente manda só os itens e as escolhas. Preços, taxa e total são recalculados no banco, e o pedido ganha número sequencial do dia. Há limite de pedidos seguidos por aparelho. Só o dono vê os pedidos.
- O cliente agora informa **nome e WhatsApp** para pedir. A página avisa que esses dados ficam com o estabelecimento, e a política de privacidade foi atualizada.

**Para ativar (uma vez só):** rode no Supabase o arquivo **`atualizacao-v5.sql`** (SQL Editor › New query › Run), depois da `atualizacao-v4.sql`.

---

## Novidades da versão 4: marmitarias e passeios

**Dois nichos novos, nos mesmos moldes dos outros.** Aparecem na demonstração da página de vendas, na criação de negócio do painel e em "Meu negócio".
- **Marmitarias & Restaurantes:** cardápio com categorias em abas, marmita com escolha de proteínas e guarnições, adicionais pagos, carrinho, entrega ou retirada, taxa e pedido mínimo.
- **Passeios & Turismo:** pacotes com data de saída, embarque, extras e número de pessoas (preço por pessoa).
- **Sem agenda:** a página do cliente (`loja.html`) é um cardápio. O pedido chega pronto no WhatsApp do negócio e **nada do cliente fica gravado** no banco.
- **Painel do dono** (só para esses nichos): Início, Cardápio/Pacotes, Horários, Meu negócio e Divulgar. Ele cadastra item com foto, preço, preço antigo riscado, etiqueta ("Mais pedido") e escolhas. Quando algo acaba, desmarca "Disponível".
- **Escolhas em texto simples**, no cadastro do item:
  ```
  Proteína (escolha 1)
  - Frango grelhado
  - Peixe frito + 3,00

  Guarnições (escolha de 1 a 3)
  - Arroz
  - Feijão

  Adicionais (até 2)
  - Ovo frito + 2,00
  ```
  Regras: `(escolha 1)`, `(escolha 2)`, `(escolha de 1 a 3)`, `(até 2)` ou `(opcional)`. Para passeios, use o mesmo formato para as datas: `Data de saída (escolha 1)` e embaixo `- Sábado, 7h (10 vagas)`.

**Para ativar (uma vez só):** no Supabase, abra **SQL Editor › New query**, cole o arquivo **`atualizacao-v4.sql`** e clique em **Run**. Ele só acrescenta colunas, sem apagar nada, e pode ser rodado de novo sem problema. Instalações novas já recebem isso no `schema.sql` (seção 11).

As páginas antigas `catalogo.html` (vitrine de salão) e `cardapio.html` (cardápio fixo) continuam funcionando como exemplos.

---

## Novidades da versão 3

**Visual novo e próprio.** Ultramar com rosa e menta, fontes Bricolage Grotesque e Manrope.
- **Página de vendas:**
  - agenda que se enche sozinha ao abrir;
  - demonstração no celular que troca pelo tipo de negócio;
  - mini-telas interativas, com comissão que se calcula ao mexer;
  - calculadora "quanto custa marcar na mão";
  - barra fixa de WhatsApp no celular;
  - imagem de compartilhamento para redes sociais.
- **Página de agendamento:**
  - serviços por categoria;
  - barra fixa com o resumo da escolha;
  - "lembrar meus dados";
  - salvar na agenda do celular (.ics) e no Google Agenda;
  - botão de compartilhar;
  - tabela de horários da semana;
  - fotos do portfólio no topo.
- **Painel:**
  - menu lateral no computador e menu inferior no celular;
  - modo escuro;
  - tela **Início**: próximo cliente, números do dia e da semana, atalhos;
  - aba **Clientes**: histórico, gasto total, faltas, filtro "sumidos há 45+ dias" com mensagem de retorno pronta.
- **Segurança:** veja a seção [Segurança](#segurança).
- **Pronto para VPS:** Docker + Caddy (`Caddyfile`, `docker-compose.yml`), com HTTPS automático e cabeçalhos de segurança.
- **Mais rápido no celular:**
  - nenhuma biblioteca vem de fora: Tailwind compilado, ícones só os usados (12 KB em vez de 350 KB) e fontes no próprio site;
  - sem Google Fonts, o que também evita enviar dados de visitantes para terceiros.

---

## Enviar para o GitHub (todos os arquivos ficam soltos, sem pastas)

O projeto não tem mais pastas: **todos os arquivos ficam soltos**, um ao lado do outro. Assim o envio pelo navegador funciona de primeira.

1. **Banco (uma vez):** Supabase → **SQL Editor** → *New query* → cole **todo** o `schema.sql` → **Run** → confirme o aviso. Deve aparecer *Success*.
2. **Senha mínima:** Supabase → **Authentication → Sign In / Providers → Email** → *Minimum password length* = **8**.
3. **Endereço do painel:** Supabase → **Authentication → URL Configuration** → em *Site URL* e em *Redirect URLs*, coloque `https://SEU-USUARIO.github.io/minhaagenda/painel.html`.
4. **Site:** abra o repositório no GitHub → **Add file → Upload files** → abra a pasta do zip, aperte **Ctrl+A** para selecionar **todos os arquivos** e arraste para a página → **Commit changes**.
   - A pasta `node_modules` não vem no zip. Se um dia ela aparecer no seu computador, não envie.
5. Espere 1 a 3 minutos e abra `https://SEU-USUARIO.github.io/minhaagenda/verificar.html`. Precisa aparecer **"Tudo certo!"**.

**Endereços novos:**

| Página | Endereço |
|---|---|
| Painel | `.../minhaagenda/painel.html` |
| Página de um negócio | `.../minhaagenda/agendar.html?n=nome-do-negocio` |
| Demonstração | `.../minhaagenda/agendar.html?demo=barbearia` |

> **Faxina opcional:** as pastas antigas (`agendar/`, `painel/`, `assets/`, `supabase/`) não são mais usadas. Para apagar: no GitHub, abra cada arquivo dentro delas → **⋯ → Delete file** → **Commit changes**. Quando todos os arquivos de uma pasta forem apagados, a pasta some.

> **Não teste com duplo clique no `index.html`.** Teste pelo endereço publicado, ou no VS Code com a extensão **Live Server**.

---

## Instalar do zero

### 1. Banco no Supabase
1. **supabase.com** → *New project* → região **South America (São Paulo)** → guarde a senha do banco.
2. **SQL Editor** → cole `schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email:**
   - desligue **Confirm email**;
   - coloque o tamanho mínimo da senha em **8**.
4. **Project Settings → API Keys:** copie a **Project URL** e a **Publishable key** para `config.js`.
   **Nunca** use a *secret key* / *service_role*.

### 2. Site no ar
- **Para testar (grátis):** GitHub → repositório **público** → **Settings → Pages** → branch `main`, pasta `/ (root)`.
- **Para clientes pagantes:** use a **VPS** (abaixo) ou o **Cloudflare Pages** ligado ao repositório. As regras do GitHub Pages não permitem uso como software comercial.
- Em qualquer caso, no Supabase vá em **Authentication → URL Configuration** e coloque o endereço do painel (`https://seudominio.com.br/painel.html`) em *Site URL* e em *Redirect URLs*.

---

## Subir numa VPS (Ubuntu 22.04 ou 24.04)

Funciona em qualquer VPS com 1 GB de RAM (Hostinger, Contabo, DigitalOcean, Hetzner, Magalu Cloud…). O banco continua no Supabase, e a VPS só entrega o site.

**1. Aponte o domínio para a VPS.** No registro.br (ou onde está o DNS), crie:
- registro **A** de `@` com o IP da VPS;
- registro **A** de `www` com o mesmo IP.

**2. Prepare o servidor.** Entre por SSH e rode:
```bash
# atualizações automáticas de segurança e firewall
sudo apt update && sudo apt -y upgrade
sudo apt -y install unattended-upgrades git
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

**3. Baixe o site e configure o domínio:**
```bash
git clone https://github.com/SEU-USUARIO/minhaagenda.git
cd minhaagenda
cp env.exemplo .env
nano .env        # troque para DOMINIO=seudominio.com.br
docker compose up -d
```

Em 1 a 2 minutos, `https://seudominio.com.br` está no ar. O certificado HTTPS é emitido e renovado sozinho, e `www` redireciona para o domínio principal.

**Para atualizar depois** (depois de enviar as mudanças ao GitHub):
```bash
cd ~/minhaagenda && ./atualizar.sh
```

**Boas práticas na VPS:**
- entre com chave SSH e desligue o login por senha (`PasswordAuthentication no` em `/etc/ssh/sshd_config`);
- não use o usuário `root` no dia a dia;
- ative os backups da própria VPS no painel do provedor.

> Se um dia você usar um **domínio próprio no Supabase** (em vez de `xxxx.supabase.co`), acrescente esse endereço em `connect-src` e `img-src` no `Caddyfile` e na linha `Content-Security-Policy` do topo de cada `index.html`.

---

## Editar o visual

As páginas usam `app.css`, que é **gerado** a partir de `estilo-fonte.css`.

- **Mudou só textos ou dados** (`config.js`, `nichos.js`, textos dos HTML)? Não precisa fazer nada.
- **Mudou classes de estilo ou cores?** No VS Code, com o [Node.js](https://nodejs.org) instalado, rode:
```bash
npm install      # só na primeira vez
npm run build    # gera app.css e icones.js
```
- Usou um **ícone novo** do [Lucide](https://lucide.dev/icons)? Rode `npm run build` também: só os ícones usados entram no site.
- **Cores da sua marca:** variáveis `--c-*` no início de `estilo-fonte.css`.
- **Cores dos negócios:** `nichos.js`, ou a cor escolhida pelo dono no painel.

---

## Segurança

**O que o sistema faz:**
- **Cada dono só vê os dados dele.** Cada profissional só vê a própria agenda e os próprios clientes. Isso é garantido pelas regras do banco (Row Level Security), não pela tela.
- **O visitante anônimo:**
  - só lê as informações públicas do negócio;
  - não vê dono, plano, suspensão, agendamentos nem dados de clientes;
  - não consegue gravar nada fora da função de agendamento.
- **Dois clientes no mesmo horário são impossíveis.** A trava fica no próprio banco.
- **Anti-spam:**
  - no máximo 4 reservas a cada 30 min vindas do mesmo aparelho/rede (guarda só um código, nunca o IP);
  - no máximo 20 reservas a cada 10 min por negócio;
  - no máximo 3 agendamentos em aberto por WhatsApp;
  - um campo invisível pega robôs simples.
- **Links e textos validados no banco:**
  - o link do mapa e as fotos só aceitam `https://`, o que bloqueia links `javascript:` usados em ataques;
  - Instagram e WhatsApp só no formato certo;
  - os textos têm tamanho máximo.
- **Política de segurança de conteúdo (CSP)** em todas as páginas:
  - o navegador só executa scripts do próprio site;
  - todo o JavaScript está em arquivos, nenhum dentro do HTML.
- **Na VPS:**
  - HTTPS obrigatório (HSTS);
  - proteção contra o site ser embutido em outros (clickjacking);
  - arquivos internos (`schema.sql`, `package.json`, `Caddyfile`…) nunca são servidos;
  - o painel não aparece no Google.
- **Senhas:** mínimo de 8 caracteres com letras e números. Configure o mesmo mínimo no Supabase (Passo 3 da instalação).
- **Plano e suspensão** só mudam pelo Supabase. O dono não consegue alterar.

**Recomendações:**
- ative a **autenticação em duas etapas** na sua conta do Supabase e do GitHub;
- nunca coloque a *secret key* em nenhum arquivo do site;
- faça backup mensal (Table Editor → Export CSV) enquanto estiver no plano grátis.

---

## Anúncios nas redes sociais

- **Link do anúncio:** use `https://seudominio.com.br/?utm_source=instagram`. Quando a pessoa clica em qualquer botão de WhatsApp, a mensagem chega com **"(vim pelo Instagram)"**, e você sabe de onde veio cada contato. Também funciona `facebook`, `tiktok` e `google`.
- **Link direto para uma demonstração:** `https://seudominio.com.br/?nicho=barbearia#demo` abre a página já com a demonstração do nicho.
- **Imagem de compartilhamento:** `og-image.png` aparece quando o link é postado no Instagram, WhatsApp e Facebook.
- **Política de privacidade:** use `https://seudominio.com.br/privacidade.html`, exigida pela Meta em formulários de anúncio.
- **Indicação no rodapé:** cada página de cliente tem no rodapé "Agendamento online por MinhaAgenda", com link rastreado (`utm_source=rodape`). Cliente do salão que gostou chega até você.

---

## Gerenciar seus clientes (você, como fornecedor)

### Cadastrar um cliente novo (na visita ou depois)

1. Abra `/painel.html` → **Criar conta** com o **e-mail do dono do negócio** e uma senha provisória.
2. Crie o negócio, ajuste com ele serviços, preços, equipe e horários.
3. Na aba **Divulgar**:
   - copie o texto para a **bio do Instagram**;
   - cole a **mensagem de saudação** no WhatsApp Business dele (o passo a passo está na própria tela): quem chamar recebe o link na hora;
   - baixe o **QR Code** para imprimir no balcão.
4. Entregue e-mail e senha ao dono e peça para trocar a senha depois ("Esqueci a senha" na tela de login).

> Cada e-mail tem **um** negócio. Para criar um segundo negócio, use outro e-mail.

### Ver e administrar tudo

No Supabase, **Table Editor** mostra todas as tabelas de todos os clientes:

| Quero… | Onde |
|---|---|
| Ver todos os negócios | tabela `negocios` |
| **Suspender** um cliente que não pagou | `negocios` → coluna `suspenso` = `true` (a página sai do ar; o dono entra no painel e vê o aviso para falar com você) |
| Reativar | `suspenso` = `false` |
| **Mudar o plano** de um cliente | `negocios` → coluna `plano` = `essencial`, `equipe` ou `ilimitado` |
| Ver quantos agendamentos cada um teve | tabela `agendamentos`, filtre por `negocio_id` |
| Trocar a senha de um dono | **Authentication → Users** → ⋯ → *Send password recovery* (ou apague o usuário e crie de novo) |
| Fazer backup | Table Editor → cada tabela → *Export → CSV* (faça uma vez por mês) |

> O dono **não consegue** mudar o próprio plano nem tirar a suspensão: o banco bloqueia. Só você, pelo Table Editor.
> (A coluna `ativo` é outra coisa: é o botão "Página no ar" que o próprio dono usa para pausar a agenda, por exemplo nas férias.)


### Atualizar o sistema

Altere os arquivos no VS Code → `git add .` → `git commit -m "o que mudou"` → `git push`. Na VPS, rode `./atualizar.sh`. No GitHub Pages ou Cloudflare Pages, a publicação é automática.

---

## Planos: o que cada um libera

| | Essencial | Equipe | Ilimitado |
|---|---|---|---|
| Profissionais ativos | 1 | até 6 | sem limite |
| Página de agendamento, agenda, lembrete, financeiro | ✅ | ✅ | ✅ |
| Login individual para cada profissional | — | ✅ | ✅ |
| Aba Comissões | — | ✅ | ✅ |

- Toda conta nova começa no **Equipe** (bom para teste grátis). Depois você ajusta pelo Table Editor.
- **Implantação** não é um plano do sistema: é o seu serviço de cadastrar tudo para o cliente, cobrado uma vez.
- O plano **Ilimitado** não aparece na página de vendas. Use para salões grandes, com preço combinado.
- Textos e preços dos planos na página de vendas: `config.js`.

## Equipe, comissões e financeiro

### Login de cada profissional (plano Equipe)
1. O dono vai em **Equipe** e clica em **Dar acesso ao painel** no profissional.
2. O sistema gera um **código de convite** (vale 7 dias e só pode ser usado uma vez) e um link. O dono envia pelo WhatsApp.
3. O profissional abre o link, cria a conta com **o próprio e-mail** e já entra.
4. O profissional **vê e faz:** a própria agenda; concluir atendimento (valor e forma de pagamento); marcar falta; lançar agendamento para si mesmo; ver **Meus ganhos** (comissão por semana e mês).
5. O profissional **não vê nem faz:** agenda dos colegas, preços, equipe, comissões dos outros, dados do negócio, cancelar agendamentos.
6. Se a pessoa sair da equipe: **Equipe → remover acesso**. O login para de funcionar na hora e o histórico continua.

### Comissões
Na aba **Comissões** há uma tabela de serviços × profissionais, em %. O sistema usa a regra mais específica:
1. **Serviço + profissional** (exceção: "Diego ganha 50% no corte")
2. **Padrão do serviço** ("corte paga 40% para todos")
3. **Padrão do profissional** ("Rafael ganha 30% em tudo que não tem regra")

A comissão é **gravada em cada atendimento**. Mudar a regra hoje não muda o que já foi feito. Se o atendimento for concluído com desconto (ex.: tabela R$ 45, cobrou R$ 40), a comissão é calculada sobre o valor cobrado.

### Financeiro
- **Concluir e receber** na agenda registra o valor cobrado e a forma de pagamento (Pix, dinheiro, crédito, débito).
- A aba **Financeiro** mostra hoje, esta semana, semana passada, este mês, mês passado ou datas à escolha:
  - faturado, comissões, líquido, ticket médio, faltas e cancelados;
  - tabela por profissional;
  - formas de pagamento, serviços mais feitos e faturamento por dia.
- O botão **Fechamento** envia o resumo do período para o profissional pelo WhatsApp.
- **Baixar planilha** gera um CSV que abre no Excel.

## Roteiro para as visitas

**Antes de sair:**
1. Crie um negócio de demonstração **real** para o nicho que vai visitar (ex.: `barbearia-demo` com um e-mail seu). Assim você mostra um agendamento chegando no painel ao vivo.
2. Deixe abertos no celular: a página de vendas, a demonstração do nicho e o painel.

**Na conversa (5 minutos):**
1. *"Quanto tempo por dia você passa respondendo 'tem horário?' no WhatsApp?"*
2. Entregue o celular com `/agendar.html?demo=NICHO` e peça para ele marcar um horário como se fosse cliente.
3. Mostre no painel o agendamento que acabou de chegar, o botão de **lembrete no WhatsApp** e o valor previsto do dia.
4. Mostre que **não dá para marcar dois clientes no mesmo horário**.
5. Mostre a aba **Divulgar**: link da bio, resposta automática do WhatsApp e QR Code.
6. Feche: *"Eu deixo tudo cadastrado com os seus serviços hoje mesmo."*

Links das demonstrações: `?demo=salao`, `barbearia`, `esmalteria`, `estetica`.

### Clientes
A aba **Clientes** é montada sozinha a partir dos agendamentos:
- mostra visitas, quanto cada cliente já gastou, faltas, última e próxima visita;
- o filtro **Sumidos há 45+ dias** traz o botão **Chamar de volta**, com mensagem pronta e o link de agendamento;
- o profissional vê só os clientes que atendeu.

---

## Personalizar

| O quê | Arquivo |
|---|---|
| Nome do produto, seu WhatsApp, e-mail, cidade, **preços dos planos** | `config.js` |
| Cores, fonte, textos, serviços e horários de exemplo de cada nicho | `nichos.js` |
| Cores da sua marca (vendas e painel) | `estilo-fonte.css` (depois `npm run build`) |
| Textos da página de vendas | `index.html` e `vendas.js` |
| Perguntas e passos das páginas dos negócios | `TEXTOS` em `nichos.js` |
| Política de privacidade | `privacidade.html` (peça para um advogado revisar) |

---

## Limites do plano grátis (confira no site do Supabase, porque mudam)

- **Supabase Free:** 2 projetos, 500 MB de banco, 1 GB de fotos. Dá para muitos pequenos negócios: cada agendamento ocupa poucos KB e as fotos são reduzidas automaticamente antes do envio.
- **Pausa por inatividade:** projeto grátis **sem nenhum acesso por 1 semana é pausado**. Com clientes usando todo dia isso não acontece. Se acontecer, entre no Supabase e clique em *Restore*. Quando tiver clientes pagando, vale migrar para o plano pago, que não pausa e tem backup automático.
- **GitHub Pages:** grátis com repositório público.
- **VPS:** plano mensal do provedor (o menor costuma bastar; confira os preços atuais) mais o domínio.

---

## Próximos passos sugeridos

- **Lembrete automático no WhatsApp** pela API oficial da Meta (custo por mensagem).
- **Serviço por profissional** (ex.: só a colorista faz coloração).
- **Controle de comissão paga** ("paguei em tal dia").
- **Painel do fornecedor:** clientes, vencimentos e suspensão sem abrir o Supabase.

---

## Estrutura dos arquivos (todos soltos na raiz)

| Arquivo | O que é |
|---|---|
| `index.html` | Página de vendas |
| `agendar.html` | Página pública de cada negócio (e as demonstrações) |
| `loja.html` · `loja.js` | Página pública dos nichos de pedido (marmitaria, passeios) |
| `catalogo.js` | Motor do cardápio/vitrine (carrinho, escolhas, mensagem do WhatsApp) |
| `catalogo.html` · `cardapio.html` · `cardapio-dados.js` | Exemplos fixos de vitrine de salão e cardápio |
| `atualizacao-v4.sql` | Atualização do banco para os nichos de pedido (rodar uma vez) |
| `atualizacao-v5.sql` | Atualização do banco para a gestão de pedidos (rodar uma vez, depois da v4) |
| `painel.html` | Painel do dono e da equipe |
| `privacidade.html` | Política de privacidade |
| `verificar.html` | Confere se todos os arquivos subiram |
| `config.js` | **Suas configurações** (Supabase, WhatsApp, planos) |
| `nichos.js` | Modelos por nicho (cores, serviços, textos) |
| `comum.js` | Funções compartilhadas (segurança, datas, WhatsApp) |
| `vendas.js` · `agendar.js` · `painel.js` | Lógica de cada página |
| `tema-escuro.js` · `privacidade.js` | Modo escuro e preenchimento da política |
| `app.css` | Visual compilado (gerado, não edite) |
| `estilo-fonte.css` | Fonte do visual (edite aqui e rode `npm run build`) |
| `icones.js` · `supabase.js` · `qrcode.js` | Bibliotecas servidas pelo próprio site |
| `*.woff2` | Fontes |
| `favicon.svg` · `og-image.png` | Ícone da aba e imagem de compartilhamento |
| `schema.sql` | Banco de dados (colar no SQL Editor do Supabase) |
| `Caddyfile` · `docker-compose.yml` · `env.exemplo` · `atualizar.sh` | Para subir na VPS |
| `package.json` · `tailwind.config.js` · `gerar-icones.mjs` | Ferramentas para gerar o visual |
