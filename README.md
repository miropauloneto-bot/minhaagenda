# MinhaAgenda — agendamento online para beleza e bem-estar

Sistema completo para salões, barbearias, esmalterias, clínicas de estética, spas, lash/brow designers, consultoras e estúdios de tatuagem.

| Página | Endereço | Para quem |
|---|---|---|
| Página de vendas | `/` | Seus anúncios e visitas |
| Demonstrações | `/agendar/?demo=barbearia` | Mostrar sem banco de dados |
| Página do negócio | `/agendar/?n=nome-do-negocio` | O cliente final agendar |
| Painel | `/painel/` | Dono e profissionais |
| Privacidade | `/privacidade/` | Exigida por lei e pelos anúncios do Instagram/Facebook |

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
- **Pronto para VPS:** Docker + Caddy, com HTTPS automático e cabeçalhos de segurança.
- **Mais rápido no celular:**
  - nenhuma biblioteca vem de fora: Tailwind compilado, ícones só os usados (12 KB em vez de 350 KB) e fontes no próprio site;
  - sem Google Fonts, o que também evita enviar dados de visitantes para terceiros.

---

## Atualizar da versão 2 para a 3 (nenhum dado é perdido)

1. **Banco:** Supabase → **SQL Editor** → *New query* → cole **todo** o `supabase/schema.sql` → **Run** → confirme o aviso. Deve aparecer *Success*.
2. **Supabase → Authentication → Sign In / Providers → Email** (ou *Policies*): procure *Minimum password length* e coloque **8**.
3. **Site:** no GitHub, **apague os arquivos antigos que não existem mais**: `assets/base.css` e `assets/tailwind-tema.js`. Depois envie **todo o conteúdo** da pasta nova por cima (**Add file → Upload files**), incluindo as pastas novas `assets/vendor`, `assets/fonts`, `privacidade`, `deploy`, `scripts` e `src`.
   - O `assets/config.js` já vem com a sua URL e a sua chave do Supabase.
   - **Não envie** a pasta `node_modules` se ela existir no seu computador.
4. Espere a publicação (1 a 3 minutos) e abra o painel com **Ctrl+F5**.

---

## Instalar do zero

### 1. Banco no Supabase
1. **supabase.com** → *New project* → região **South America (São Paulo)** → guarde a senha do banco.
2. **SQL Editor** → cole `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email:**
   - desligue **Confirm email**;
   - coloque o tamanho mínimo da senha em **8**.
4. **Project Settings → API Keys:** copie a **Project URL** e a **Publishable key** para `assets/config.js`.
   **Nunca** use a *secret key* / *service_role*.

### 2. Site no ar
- **Para testar (grátis):** GitHub → repositório **público** → **Settings → Pages** → branch `main`, pasta `/ (root)`.
- **Para clientes pagantes:** use a **VPS** (abaixo) ou o **Cloudflare Pages** ligado ao repositório. As regras do GitHub Pages não permitem uso como software comercial.
- Em qualquer caso, no Supabase vá em **Authentication → URL Configuration** e coloque o endereço do painel (`https://seudominio.com.br/painel/`) em *Site URL* e em *Redirect URLs*.

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
cd minhaagenda/deploy
cp .env.exemplo .env
nano .env        # troque para DOMINIO=seudominio.com.br
docker compose up -d
```

Em 1 a 2 minutos, `https://seudominio.com.br` está no ar. O certificado HTTPS é emitido e renovado sozinho, e `www` redireciona para o domínio principal.

**Para atualizar depois** (depois de enviar as mudanças ao GitHub):
```bash
cd ~/minhaagenda && ./deploy/atualizar.sh
```

**Boas práticas na VPS:**
- entre com chave SSH e desligue o login por senha (`PasswordAuthentication no` em `/etc/ssh/sshd_config`);
- não use o usuário `root` no dia a dia;
- ative os backups da própria VPS no painel do provedor.

> Se um dia você usar um **domínio próprio no Supabase** (em vez de `xxxx.supabase.co`), acrescente esse endereço em `connect-src` e `img-src` no `deploy/Caddyfile` e na linha `Content-Security-Policy` do topo de cada `index.html`.

---

## Editar o visual

As páginas usam `assets/app.css`, que é **gerado** a partir de `src/app.css`.

- **Mudou só textos ou dados** (`config.js`, `nichos.js`, textos dos HTML)? Não precisa fazer nada.
- **Mudou classes de estilo ou cores?** No VS Code, com o [Node.js](https://nodejs.org) instalado, rode:
```bash
npm install      # só na primeira vez
npm run build    # gera assets/app.css e assets/vendor/icones.js
```
- Usou um **ícone novo** do [Lucide](https://lucide.dev/icons)? Rode `npm run build` também: só os ícones usados entram no site.
- **Cores da sua marca:** variáveis `--c-*` no início de `src/app.css`.
- **Cores dos negócios:** `assets/nichos.js`, ou a cor escolhida pelo dono no painel.

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
  - arquivos internos (`supabase/`, `src/`, `package.json`…) nunca são servidos;
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
- **Imagem de compartilhamento:** `assets/og-image.png` aparece quando o link é postado no Instagram, WhatsApp e Facebook.
- **Política de privacidade:** use `https://seudominio.com.br/privacidade/`, exigida pela Meta em formulários de anúncio.
- **Indicação no rodapé:** cada página de cliente tem no rodapé "Agendamento online por MinhaAgenda", com link rastreado (`utm_source=rodape`). Cliente do salão que gostou chega até você.

---

## Gerenciar seus clientes (você, como fornecedor)

### Cadastrar um cliente novo (na visita ou depois)

1. Abra `/painel/` → **Criar conta** com o **e-mail do dono do negócio** e uma senha provisória.
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

Altere os arquivos no VS Code → `git add .` → `git commit -m "o que mudou"` → `git push`. Na VPS, rode `./deploy/atualizar.sh`. No GitHub Pages ou Cloudflare Pages, a publicação é automática.

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
- Textos e preços dos planos na página de vendas: `assets/config.js`.

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
2. Entregue o celular com `/agendar/?demo=NICHO` e peça para ele marcar um horário como se fosse cliente.
3. Mostre no painel o agendamento que acabou de chegar, o botão de **lembrete no WhatsApp** e o valor previsto do dia.
4. Mostre que **não dá para marcar dois clientes no mesmo horário**.
5. Mostre a aba **Divulgar**: link da bio, resposta automática do WhatsApp e QR Code.
6. Feche: *"Eu deixo tudo cadastrado com os seus serviços hoje mesmo."*

Links das demonstrações: `?demo=salao`, `barbearia`, `esmalteria`, `estetica`, `spa`, `lash`, `consultora`, `tattoo`.

### Clientes
A aba **Clientes** é montada sozinha a partir dos agendamentos:
- mostra visitas, quanto cada cliente já gastou, faltas, última e próxima visita;
- o filtro **Sumidos há 45+ dias** traz o botão **Chamar de volta**, com mensagem pronta e o link de agendamento;
- o profissional vê só os clientes que atendeu.

---

## Personalizar

| O quê | Arquivo |
|---|---|
| Nome do produto, seu WhatsApp, e-mail, cidade, **preços dos planos** | `assets/config.js` |
| Cores, fonte, textos, serviços e horários de exemplo de cada nicho | `assets/nichos.js` |
| Cores da sua marca (vendas e painel) | `src/app.css` (depois `npm run build`) |
| Textos da página de vendas | `index.html` e `assets/vendas.js` |
| Perguntas e passos das páginas dos negócios | `TEXTOS` em `assets/nichos.js` |
| Política de privacidade | `privacidade/index.html` (peça para um advogado revisar) |

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

## Estrutura dos arquivos

```
minhaagenda/
├── index.html               Página de vendas
├── agendar/index.html       Página pública de cada negócio (+ demonstrações)
├── painel/index.html        Painel do dono e da equipe
├── privacidade/index.html   Política de privacidade
├── assets/
│   ├── config.js            ← SUAS configurações (Supabase, WhatsApp, planos)
│   ├── nichos.js            Modelos por nicho (cores, serviços, textos)
│   ├── comum.js             Funções compartilhadas (segurança, datas, WhatsApp)
│   ├── vendas.js            Interações da página de vendas
│   ├── agendar.js           Página de agendamento
│   ├── painel.js            Painel
│   ├── tema-escuro.js       Aplica o modo escuro sem piscar
│   ├── privacidade.js       Preenche a política
│   ├── app.css              Visual compilado (gerado, não edite)
│   ├── fonts/               Fontes do próprio site
│   ├── vendor/              Supabase, QR Code e ícones (sem CDN externo)
│   ├── favicon.svg, og-image.png
├── src/app.css              Fonte do visual (edite aqui)
├── scripts/build-icons.mjs  Gera o pacote de ícones
├── supabase/schema.sql      Banco de dados (rodar no Supabase)
└── deploy/                  VPS: Caddyfile, docker-compose.yml, .env.exemplo, atualizar.sh
```
