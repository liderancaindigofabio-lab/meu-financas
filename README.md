# MeuFinanças

Gestão financeira pessoal + Aroeira G Fitness.

## Estrutura

```
meufinancas/
├── README.md          # Este arquivo
├── app.js             # JavaScript principal (157KB)
├── dashboard.html     # Dashboard com sidebar (43KB)
├── index.html         # Login (1.2KB)
├── style.css          # Estilos (20KB)
├── manifest.json      # PWA manifest
├── sw.js              # Service Worker v3.0 (network-first)
├── vercel.json        # Config Vercel
│
├── backup/            # Backups antigos do workspace
├── backup_git/        # Backup consolidado do GitHub
└── fontes/            # Versões intermediárias
    ├── app.js.bak
    ├── app_com_ia.js
    ├── app_ref.js
    └── deployed_app.js
```

## Status atual (2026-07-03)

- 🧹 **LIMPEZA**: GitHub esvaziado, proxy de IA deletado
- 💾 **BACKUP**: Tudo guardado em `backup_git/`
- ⏳ **AGUARDANDO**: Decisão de como recomeçar

## Como voltar a funcionar (quando decidir)

1. Decidir plataforma: GitHub Pages (grátis) ou Render
2. Decidir IA: Groq direto (chave exposta) ou proxy
3. Upload dos arquivos principais
4. Testar dashboard, chat, importação

## Versão funcional conhecida

- app.js v157215b (corrigido: sem `let arquivoParaEnviar` duplicado, chaves balanceadas)
- IA funcionando: `chamarGroq()` limpa histórico, max_tokens=1500
- Service Worker v3.0 com network-first pro app.js
