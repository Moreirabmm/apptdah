# Cabe no Dia

Agenda pessoal pensada para quem tem TDAH e uma rotina espalhada em vários lugares. Abre direto no que importa hoje, funciona offline e pode ser instalada na tela inicial do celular, ao lado do WhatsApp.

## O que ele faz

- **Hoje** como tela inicial, juntando as tarefas de todas as áreas, com o que ficou pra trás destacado em laranja.
- **Abas por área:** Medicina, Bíblia, Conteúdo, Viagem, Lazer, Mensagens e **Algum dia** (coisas sem data, sem culpa).
- **Anotar do seu jeito:** escreva "postar vlog TikTok hoje" ou "prova de pediatria sexta 8h" e o app descobre a área, o dia e o horário. Para forçar uma área, termine com `#lazer`, `#biblia` etc.
- **Dopamina:** barra verde de progresso do dia, brilhinho ao concluir e a tarefa feita desce para o final, riscada.
- **Reorganizar em um toque:** botão "Amanhã" em cada tarefa, "Hoje" nas que estão sem data, e "Desfazer" depois de qualquer ação.
- **Backup:** em Ajustes dá para baixar e restaurar um arquivo com todas as tarefas.

## Como publicar (GitHub Pages)

1. No repositório, vá em **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em um ou dois minutos o app fica em `https://moreirabmm.github.io/apptdah/`.

## Como instalar no celular

- **Android (Chrome):** abra o link, toque no menu ⋮ e escolha **Instalar app** (ou use o botão em Ajustes).
- **iPhone (Safari):** abra o link, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.

As tarefas ficam salvas no próprio aparelho. Baixe um backup de vez em quando, principalmente antes de trocar de celular.

## Arquivos

- `index.html` — o app inteiro (visual, lógica e leitura do texto)
- `manifest.webmanifest` — nome, cores e ícones para instalar
- `sw.js` — faz o app abrir sem internet
- `icons/` — ícones da tela inicial
