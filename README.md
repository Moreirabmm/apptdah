# Cabe no Dia

Agenda pensada para quem tem TDAH e uma rotina espalhada em vários lugares. Abre direto no que importa hoje, funciona sem internet, pode ser instalada no celular ao lado do WhatsApp e permite compartilhar a agenda com outras pessoas.

**Endereço do app:** https://moreirabmm.github.io/apptdah/ (depois de ativar o GitHub Pages, passo 1 abaixo)

## O que ele faz

- **Hoje** como tela inicial, juntando as tarefas de todas as categorias, com o que ficou pra trás em laranja.
- **Categorias editáveis:** crie, renomeie, troque a cor, reordene e apague. Cada categoria tem uma lista de palavras que ajuda o app a adivinhar onde a tarefa vai (toque em **+ Categoria** nas abas ou em Ajustes → Editar categorias). Ao apagar uma categoria, as tarefas dela vão para Geral.
- **Algum dia:** coisas sem data, sem culpa.
- **Anotar do seu jeito:** "postar vlog TikTok hoje", "prova de pediatria sexta 8h", "treino dia 20". O app descobre a categoria, o dia e o horário. Para forçar uma categoria, termine com `#nome`, por exemplo `#lazer`.
- **Dopamina:** barra verde do dia, brilhinho ao concluir e a tarefa feita desce riscada para o final.
- **Um toque para reorganizar:** botão "Amanhã" em cada tarefa, "Hoje" nas que estão sem data, e "Desfazer" depois de qualquer ação.
- **Contas Google e agenda compartilhada:** cada pessoa tem a própria agenda e pode convidar outras pelo Gmail. Quem aceita vê e edita tudo da agenda. Quem participa de mais de uma agenda alterna entre elas no topo da tela.
- **Backup** em Ajustes, para baixar e restaurar.

Sem o Firebase configurado, o app funciona normalmente, só que sem login: tudo fica salvo no próprio aparelho.

---

## Passo 1 — Publicar no GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em um ou dois minutos o app fica em `https://moreirabmm.github.io/apptdah/`.

## Passo 2 — Ativar contas e compartilhamento (Firebase, gratuito)

Leva uns 10 minutos e só precisa ser feito uma vez.

### 2.1 Criar o projeto

1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. Clique em **Criar um projeto**, dê o nome `cabe-no-dia` e conclua (pode desativar o Google Analytics).

### 2.2 Ligar o login com Google

1. No menu da esquerda: **Criação → Authentication → Vamos começar**.
2. Na aba **Método de login**, escolha **Google**, ative, escolha seu e-mail de suporte e salve.
3. Ainda em Authentication, abra **Configurações → Domínios autorizados → Adicionar domínio** e coloque:
   `moreirabmm.github.io`

### 2.3 Criar o banco de dados

1. No menu: **Criação → Firestore Database → Criar banco de dados**.
2. Escolha a localização `southamerica-east1 (São Paulo)` e comece no **modo de produção**.
3. Abra a aba **Regras**, apague tudo, cole o conteúdo do arquivo [`firestore.rules`](firestore.rules) deste repositório e clique em **Publicar**.

As regras garantem que só os membros de uma agenda vejam e editem as tarefas dela.

### 2.4 Conectar o app ao projeto

1. Na página inicial do projeto, clique no ícone **`</>`** (Web) para adicionar um app. Dê o apelido `Cabe no Dia` e registre (não precisa marcar o Hosting).
2. O Firebase mostra um bloco `const firebaseConfig = { ... }`. Copie só o que está entre as chaves.
3. Aqui no GitHub, abra o arquivo [`firebase-config.js`](firebase-config.js), clique no lápis para editar e troque
   `export const firebaseConfig = null;`
   por
   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
4. Clique em **Commit changes**. Em um ou dois minutos o botão **Entrar com Google** aparece no app.

Esses dados não são senha e podem ficar públicos: quem protege as agendas são as regras do passo 2.3.

---

## Como compartilhar a agenda

1. Toque no botão abaixo da data (**Compartilhar agenda**) ou em Ajustes → Agendas e compartilhar.
2. Digite o Gmail da pessoa e toque em **Convidar**.
3. Avise a pessoa para abrir o app e entrar com esse Gmail. O convite aparece no topo da tela dela, com **Aceitar** e **Recusar**.

A dona da agenda pode renomear a agenda, cancelar convites e remover pessoas. Quem foi convidado pode sair quando quiser. Todos os membros editam tarefas e categorias.

## Como instalar no celular

- **Android (Chrome):** abra o link, toque no menu ⋮ e escolha **Instalar app** (ou use o botão em Ajustes).
- **iPhone (Safari):** abra o link, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.

Se você usava o app antes de criar a conta, ao entrar ele oferece trazer as tarefas salvas no celular para a sua agenda na nuvem.

## Arquivos

- `index.html` — estrutura da página
- `styles.css` — visual (cores, fontes, claro e escuro)
- `app.js` — lógica: tarefas, categorias, leitura do texto, contas e compartilhamento
- `firebase-config.js` — onde entram os dados do seu projeto Firebase
- `firestore.rules` — regras de segurança para colar no Firebase
- `manifest.webmanifest`, `sw.js`, `icons/` — instalação no celular e funcionamento offline
