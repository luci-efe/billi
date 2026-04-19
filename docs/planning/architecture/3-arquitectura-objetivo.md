# 3. Arquitectura objetivo

## Stack propuesto

| Capa | Decisión |
|---|---|
| Frontend | `React 19 + Vite + TypeScript` |
| Hosting web | `Cloudflare Pages` |
| API/BFF | `Cloudflare Workers` o `Pages Functions` |
| Base de datos | `Turso Cloud / LibSQL` |
| ORM/migraciones | `Drizzle ORM` + `@libsql/client` |
| Auth | `Better Auth` con adapter de Drizzle |
| Billing | `Dodo Payments` |
| Storage | `Cloudflare R2` |
| IA | `Mastra` + `OpenRouter` |
| Jobs largos | `Cloudflare Workflows` |
