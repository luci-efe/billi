# Billi

> Plataforma web de finanzas personales con captura multimodal y asistente conversacional contextualizado para el mercado mexicano.

Billi ayuda a jóvenes mexicanos (21–35) a registrar, entender y mejorar sus finanzas. Combina captura de movimientos por **formulario, texto libre, voz e imagen de recibo**, un **dashboard** con saldo y tendencia, y un **chatbot bifurcado** que responde sobre el historial personal con cálculos deterministas o sobre un corpus curado de 20 temas financieros mexicanos vía RAG.

Producto orientado a usuarios finales en español. Documentación técnica interna en inglés.

---

## Highlights

- **Multimodal capture** — `form` · `text` · `voice` · `image (OCR)` · `chat`, todos pasando por una propuesta editable antes de persistir.
- **Two-route assistant** — preguntas sobre dinero del usuario van por SQL determinista; preguntas educativas (RESICO, SAT, CFDI, AFORE, CETES…) van por retrieval sobre Turso vector search.
- **Freemium con gates explícitos** — exportación CSV, dashboard avanzado y exportación PDF gobernados por estado de plan.
- **Privacy-first** — consentimiento visible, ownership verificado en backend en cada operación, fallback seguro cuando la IA no tiene soporte suficiente.

## Stack

| Capa            | Tecnología                                  |
|-----------------|---------------------------------------------|
| Frontend        | React 19 · Vite · TypeScript · shadcn/ui    |
| Hosting         | Cloudflare Pages                            |
| API / BFF       | Cloudflare Workers (Pages Functions)        |
| Base de datos   | Turso Cloud (libSQL)                        |
| ORM             | Drizzle ORM · `@libsql/client`              |
| Auth            | Better Auth (Drizzle adapter)               |
| Storage binario | Cloudflare R2                               |
| Pagos           | Dodo Payments                               |
| Orquestación IA | Mastra · OpenRouter                         |
| Jobs largos     | Cloudflare Workflows                        |

Decisiones y tradeoffs detallados en [`docs/planning/architecture/`](docs/planning/architecture/index.md).

## Repository layout

```
billi/
├── README.md                 ← you are here
├── LINEAR.md                 ← issue ↔ story mapping (BIL-* ↔ ST-*)
├── CLAUDE.md                 ← Claude Code guidance for this repo
├── AGENTS.md                 ← provider-neutral agent guidance
├── .claude/skills/           ← BMad + SpecSafe skill packs
├── .agents/skills/           ← mirror for non-Claude agents
└── docs/
    └── planning/
        ├── prd/                     ← sharded PRD (index.md + per-section files)
        ├── architecture/            ← sharded architecture doc
        ├── ux-design-specification/ ← sharded UX spec
        ├── epics/                   ← sharded epics + stories
        └── source/
            └── Billi_BRD.docx       ← Business Requirements Document (canonical source)
```

## Project management

- **Linear team:** [Billi (BIL)](https://linear.app/agentic-engineering-agency/team/BIL/all)
- **Projects:** `PRJ-01 Fundación y Core`, `PRJ-02 RAG, Chatbot y MVP`
- **Sprint window:** 4 cycles, **Mon 2026-04-20 → Sun 2026-05-17**
- **Workflow:** Planning artifacts here → stories in Linear → SpecSafe loop per slice (spec → tests → impl → verify → complete).

See [`LINEAR.md`](LINEAR.md) for the full issue ↔ story mapping and dependency graph.

## Development workflow

We follow the **SpecSafe** five-step loop, one spec slice at a time:

```
spec  →  tests  →  implementation  →  verify (PASS/FAIL)  →  complete
                                            ↑________if FAIL_______|
```

Never skip a step, never compress two into one. Verification is binary; on FAIL, loop back to implementation.

## Bilingual conventions

- **User-facing copy / product UI / external comms** → Spanish.
- **Code, code comments, commit messages, PR descriptions, internal docs** → English.
- **Planning artifacts** under `docs/planning/` are Spanish (sourced from class deliverable); treat as source-of-truth, but new technical docs go in English.

## Status

Phase: **Planning complete, implementation starting Cycle 1 (2026-04-20).**
21 stories across 5 epics queued in Linear, all dependencies wired, all milestones dated.
