# MinhaAgenda — agendamento online para beleza e bem-estar

Sistema completo para salões, barbearias, esmalterias, clínicas de estética, spas, lash/brow designers, consultoras e estúdios de tatuagem.

| Página | Endereço | Para quem |
|---|---|---|
| Página de vendas | `/` | Você mostrar o produto e captar clientes |
| Demonstrações | `/agendar/?demo=barbearia` | Mostrar nas visitas (funciona sem banco) |
| Página do negócio | `/agendar/?n=nome-do-negocio` | O cliente final agendar |
| Painel do dono | `/painel/` | O dono gerenciar agenda, serviços, equipe etc. |

> **Já instalou a versão anterior?** Veja [Atualizar para a versão 2](#atualizar-para-a-versão-2) no fim deste guia.

**Custo: R$ 0.** O site fica no **GitHub Pages** e o banco de dados no **Supabase**, ambos no plano gratuito.

---

## Por que GitHub Pages e não Streamlit

O Streamlit Community Cloud é ótimo para painéis em Python, mas não para isto:

- **O app "dorme"** quando ninguém acessa e leva um tempo para acordar. A cliente do salão abriria o link da bio e veria uma tela de "acordando o app". Ela desiste.
- O link fica feio (`xxx.streamlit.app`) e a página fica dentro de uma moldura do Streamlit, sem controle total do visual no celular.

O GitHub Pages serve as páginas na hora, 24 horas, direto do seu repositório. E você continua com tudo no GitHub, como queria.

---

## Passo 1 — Criar o banco no Supabase (10 minutos)

1. Acesse **supabase.com** → *Start your project* → entre com sua conta do GitHub.
2. *New project*:
   - **Name:** `minhaagenda`
   - **Database password:** gere uma e **guarde** (não vai no código).
   - **Region:** *South America (São Paulo)*.
3. Quando o projeto terminar de criar, vá em **SQL Editor** → *New query*.
4. Abra o arquivo `supabase/schema.sql`, copie **tudo**, cole e clique **Run**. Deve aparecer *Success*.
   (Pode rodar de novo no futuro sem perder dados.)
5. **Authentication → Sign In / Providers → Email:** desligue **Confirm email** e salve.
   Assim o dono cria a conta e já entra. O envio de e-mails do plano grátis é bem limitado por hora, então é melhor não depender dele.
6. **Project Settings → API Keys** (ou botão **Connect**): copie
   - **Project URL**, algo como `https://abcdxyz.supabase.co`
   - **Publishable key** (`sb_publishable_...`) ou a **anon public key** (a que começa com `eyJ...`)

   > ⚠️ **Nunca** copie a *secret key* / *service_role*. Essa dá acesso total e não pode ir para o GitHub.

7. Abra `assets/config.js` e cole os dois valores em `supabaseUrl` e `supabaseKey`.
   Aproveite e coloque **seu** WhatsApp de vendas, o nome do produto e os preços dos planos.

> A *publishable/anon key* é pública por natureza: a segurança vem das regras do banco (Row Level Security), que já estão no `schema.sql`. Cada dono só enxerga e altera os dados do próprio negócio, e os dados dos clientes finais não ficam visíveis para o público.

---

## Passo 2 — Publicar no GitHub Pages (5 minutos)

### Pelo VS Code (recomendado)

1. Abra a pasta `minhaagenda` no VS Code.
2. No terminal do VS Code:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão"
   ```
3. Clique no ícone **Source Control** → *Publish to GitHub* → escolha **Public repository**.
   (No plano grátis, o GitHub Pages só funciona com repositório **público**. Não há nenhuma senha no código, então tudo bem.)

### Ou pelo navegador

1. github.com → **New repository** → nome `minhaagenda` → **Public** → *Create*.
2. *uploading an existing file* → arraste **o conteúdo** da pasta (index.html, assets, agendar, painel, supabase, README.md) → *Commit changes*.

### Ativar o Pages

1. No repositório: **Settings → Pages**.
2. **Source:** *Deploy from a branch* · **Branch:** `main` · pasta `/ (root)` → *Save*.
3. Em 1 a 2 minutos o site estará em:
   `https://SEU-USUARIO.github.io/minhaagenda/`

### Avisar o Supabase sobre o endereço

**Authentication → URL Configuration:**
- **Site URL:** `https://SEU-USUARIO.github.io/minhaagenda/painel/`
- **Redirect URLs:** adicione `https://SEU-USUARIO.github.io/minhaagenda/painel/`

Isso é usado no link de "Esqueci a senha".

---

## Passo 3 — Testar tudo

1. Abra `https://SEU-USUARIO.github.io/minhaagenda/painel/` → **Criar conta**.
2. Escolha o nicho, preencha nome e WhatsApp → **Criar minha página**.
   Serviços, equipe e horários de exemplo já vêm cadastrados.
3. Na aba **Divulgar**, clique em **Abrir** e faça um agendamento como se fosse cliente.
4. Volte ao painel → **Agenda**: o agendamento está lá.
5. Tente marcar o mesmo horário de novo com o mesmo profissional: o sistema não deixa.

### Testar no seu computador antes de publicar

Instale a extensão **Live Server** no VS Code → clique com o botão direito em `index.html` → *Open with Live Server*. Pode testar o painel e o agendamento normalmente, porque eles falam direto com o Supabase.

---

## Como gerenciar seus clientes (você, como fornecedor)

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

Altere os arquivos no VS Code → `git add .` → `git commit -m "o que mudou"` → `git push`. O GitHub Pages publica sozinho em 1 a 2 minutos, para todos os clientes ao mesmo tempo.

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

---

## Personalizar

| O quê | Arquivo |
|---|---|
| Nome do produto, seu WhatsApp, e-mail, cidade, **preços dos planos** | `assets/config.js` |
| Cores, fonte, textos, serviços e horários de exemplo de cada nicho | `assets/nichos.js` |
| Cores da sua marca (página de vendas e painel) | `TEMA_PRODUTO` em `assets/nichos.js` |
| Textos da página de vendas | `index.html` |
| Perguntas frequentes e diferenciais das páginas dos negócios | `TEXTOS` em `assets/nichos.js` |

Cada dono também pode mudar pelo próprio painel (**Meu negócio**): nome, cor principal, textos do topo, endereço, Instagram e link do Maps.

---

## Limites do plano grátis (confira no site do Supabase, porque mudam)

- **Supabase Free:** 2 projetos, 500 MB de banco, 1 GB de fotos. Dá para muitos pequenos negócios: cada agendamento ocupa poucos KB e as fotos são reduzidas automaticamente antes do envio.
- **Pausa por inatividade:** projeto grátis **sem nenhum acesso por 1 semana é pausado**. Com clientes usando todo dia isso não acontece. Se acontecer, entre no Supabase e clique em *Restore*. Quando tiver clientes pagando, vale migrar para o plano pago, que não pausa e tem backup automático.
- **GitHub Pages:** grátis com repositório público.

---

## O que ainda não faz (próximos passos sugeridos)

- **Envio automático de lembretes no WhatsApp:** hoje o lembrete é enviado com 1 clique (dono ou profissional). Automático exige a API oficial do WhatsApp (Meta), com custo por mensagem.
- **Serviço por profissional:** hoje qualquer profissional pode fazer qualquer serviço. Útil para salões com especialistas (ex.: só a colorista faz coloração).
- **Controle de comissão paga:** hoje o relatório mostra quanto pagar; marcar "pago em tal dia" ainda é manual.
- **Painel do fornecedor:** lista de clientes, vencimentos e suspensão sem abrir o Supabase.
- **Domínio próprio** (ex.: `agenda.seunegocio.com.br`): o GitHub Pages aceita, em *Settings → Pages → Custom domain*.
- **Aviso de privacidade (LGPD):** o sistema guarda nome e WhatsApp dos clientes finais. Antes de vender em escala, publique uma política de privacidade simples.
- **Tailwind via CDN:** ótimo para começar e editar fácil; o navegador mostra um aviso no console dizendo que não é para produção. Funciona normalmente, e mais tarde dá para trocar por um CSS compilado.

---

## Estrutura dos arquivos

```
minhaagenda/
├── index.html              Página de vendas
├── agendar/index.html      Página pública de cada negócio (+ demonstrações)
├── painel/index.html       Painel do dono
├── assets/
│   ├── config.js           ← SUAS configurações (Supabase, WhatsApp, planos)
│   ├── nichos.js           Modelos por nicho (cores, serviços, textos)
│   ├── comum.js            Funções compartilhadas
│   ├── agendar.js          Lógica da página de agendamento
│   ├── painel.js           Lógica do painel
│   ├── base.css            Componentes visuais (botões, cartões, campos)
│   └── tailwind-tema.js    Liga as cores do Tailwind ao tema
└── supabase/schema.sql     Banco de dados (rodar uma vez no Supabase)
```

### Como o "nunca dois clientes no mesmo horário" funciona

A regra está **no banco de dados** (`sem_conflito_de_horario` em `schema.sql`), não só na tela. Mesmo se duas pessoas confirmarem no mesmo segundo, o Postgres aceita só uma. A outra recebe "Esse horário acabou de ser reservado" e escolhe outro. Com "sem preferência", o sistema tenta o próximo profissional livre automaticamente. A mesma regra vale para os agendamentos lançados pelo painel.

---

## Atualizar para a versão 2

Para quem já instalou a primeira versão. **Nenhum dado é perdido.**

1. **Banco:** Supabase → **SQL Editor** → *New query* → cole **todo** o `supabase/schema.sql` novo → **Run** → confirme o aviso de "destructive operation".
   Deve aparecer *Success*. As tabelas `comissoes`, `acessos` e `convites` aparecem no Table Editor.
2. **Site:** no GitHub, envie os arquivos alterados (**Add file → Upload files**, arrastando por cima dos antigos):
   - `index.html`
   - `README.md`
   - `assets/config.js` ⚠️ **antes, copie para o novo a sua URL e a sua chave do Supabase**, senão o site perde a configuração
   - `assets/painel.js`, `assets/base.css`, `assets/comum.js`, `assets/agendar.js`, `assets/nichos.js`
   - `supabase/schema.sql`
3. Espere a publicação terminar (1 a 3 minutos) e recarregue o painel com **Ctrl+F5**.
