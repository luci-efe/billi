# Linear ↔ Spec Mapping

Single source of truth for translating between **Linear issue IDs** (`BIL-*`) and **planning external IDs** (`ST-*` from `docs/planning/epics/`).

- **Workspace:** `agentic-engineering-agency`
- **Team:** [Billi (BIL)](https://linear.app/agentic-engineering-agency/team/BIL/all)
- **Cycles:** 1-week, starting Mon 2026-04-20
- **Window:** 4 cycles, ending Sun 2026-05-17

## Projects

| ID  | Linear name                  | Linear URL                                                                                            | Dates                       |
|-----|------------------------------|-------------------------------------------------------------------------------------------------------|-----------------------------|
| P1  | PRJ-01 Fundación y Core      | https://linear.app/agentic-engineering-agency/project/prj-01-fundacion-y-core-28b37d343f8d            | 2026-04-20 → 2026-05-17     |
| P2  | PRJ-02 RAG, Chatbot y MVP    | https://linear.app/agentic-engineering-agency/project/prj-02-rag-chatbot-y-mvp-35cf136249fb           | 2026-04-20 → 2026-05-17     |

## Milestones (target dates)

| Milestone                  | Project | Target       |
|----------------------------|---------|--------------|
| MS-01 Fundación            | P1      | 2026-05-03   |
| MS-02 Core Visual          | P1      | 2026-05-10   |
| MS-04 Chatbot Integrado    | P1      | 2026-05-17   |
| MS-05 Refinamiento         | P1      | 2026-05-17   |
| MS-02 Core Visual          | P2      | 2026-05-03   |
| MS-03 Inteligencia RAG     | P2      | 2026-04-26   |
| MS-04 Chatbot Integrado    | P2      | 2026-05-17   |
| MS-05 Refinamiento         | P2      | 2026-05-17   |

## Issue map

| Linear   | Story    | Title                                          | Epic   | Project | Milestone | Cycle | Pri    | Est | Blocked by      |
|----------|----------|------------------------------------------------|--------|---------|-----------|-------|--------|-----|-----------------|
| BIL-1    | ST-01-01 | Onboarding con propuesta de valor              | EP-01  | P1      | MS-01     | 1     | High   | S   | —               |
| BIL-2    | ST-01-02 | Registro e inicio de sesión                    | EP-01  | P1      | MS-01     | 1     | Urgent | M   | BIL-1           |
| BIL-3    | ST-01-03 | Configuración de perfil y categorías           | EP-01  | P1      | MS-01     | 2     | High   | S   | BIL-2           |
| BIL-4    | ST-02-01 | Modelo base de transacciones                   | EP-02  | P1      | MS-01     | 1     | Urgent | M   | —               |
| BIL-5    | ST-02-02 | Registro por formulario                        | EP-02  | P1      | MS-01     | 2     | Urgent | M   | BIL-4           |
| BIL-6    | ST-02-03 | Registro por texto libre                       | EP-02  | P1      | MS-04     | 3     | High   | M   | BIL-5           |
| BIL-7    | ST-02-04 | Registro por voz                               | EP-02  | P1      | MS-04     | 4     | High   | M   | BIL-6           |
| BIL-8    | ST-02-05 | Registro por imagen de recibo (OCR)            | EP-02  | P1      | MS-05     | 4     | Medium | L   | BIL-5           |
| BIL-9    | ST-02-06 | Recibos y documentos vinculados                | EP-02  | P1      | MS-02     | 2     | High   | M   | BIL-5           |
| BIL-10   | ST-03-01 | Dashboard básico del plan gratuito             | EP-03  | P1      | MS-02     | 2     | Urgent | S   | BIL-5           |
| BIL-11   | ST-03-02 | Categorías y tendencia                         | EP-03  | P1      | MS-02     | 3     | High   | S   | BIL-10          |
| BIL-12   | ST-03-03 | Dashboard avanzado premium                     | EP-03  | P1      | MS-02     | 3     | Medium | M   | BIL-11          |
| BIL-13   | ST-04-01 | Curación e ingestión del corpus RAG            | EP-04  | P2      | MS-03     | 1     | High   | L   | —               |
| BIL-14   | ST-04-02 | Chatbot sobre historial del usuario            | EP-04  | P2      | MS-04     | 3     | Urgent | L   | BIL-10          |
| BIL-15   | ST-04-03 | Chatbot educativo con RAG                      | EP-04  | P2      | MS-04     | 2     | Urgent | L   | BIL-13          |
| BIL-16   | ST-04-04 | Registro de movimientos desde chat             | EP-04  | P2      | MS-04     | 4     | High   | M   | BIL-14          |
| BIL-17   | ST-04-05 | Fallback y trazabilidad del asistente          | EP-04  | P2      | MS-04     | 4     | High   | S   | BIL-14, BIL-15  |
| BIL-18   | ST-05-01 | Exportación CSV del plan gratuito              | EP-05  | P2      | MS-02     | 1     | High   | S   | —               |
| BIL-19   | ST-05-02 | Gestión de plan + checkout (Dodo Payments)     | EP-05  | P2      | MS-02     | 2     | High   | M   | —               |
| BIL-20   | ST-05-03 | Exportación PDF premium                        | EP-05  | P2      | MS-05     | 3     | High   | M   | BIL-19          |
| BIL-21   | ST-05-04 | QA funcional y beta launch                     | EP-05  | P2      | MS-05     | 4     | Urgent | M   | BIL-17, BIL-18  |

T-shirt → Fibonacci estimate: `XS=1`, `S=2`, `M=3`, `L=5`, `XL=8`.

## Cycle load (Fibonacci points)

| Cycle | Dates                  | Issues                                | Points |
|-------|------------------------|---------------------------------------|--------|
| 1     | Apr 20 – Apr 26        | BIL-1, 2, 4, 13, 18                   | 15     |
| 2     | Apr 27 – May 3         | BIL-3, 5, 9, 10, 15, 19               | 18     |
| 3     | May 4 – May 10         | BIL-6, 11, 12, 14, 20                 | 16     |
| 4     | May 11 – May 17        | BIL-7, 8, 16, 17, 21                  | 16     |

## Labels

**Epic** — `ep-01` `ep-02` `ep-03` `ep-04` `ep-05`
**Functional** — `foundation` `security` `ux` `backend` `documents` `dashboard` `analytics` `ai` `rag` `chat` `chat-capture` `nl-capture` `voice` `ocr` `export` `billing` `freemium` `premium` `qa` `beta` `research`

## Conventions

- **Title format:** `ST-XX-XX: <story title>` to keep external ID searchable.
- **Description:** user story + Gherkin acceptance criteria + PERT table + dependency list (textual mirror of Linear's `blocked_by`).
- **Source-of-truth precedence on conflict:** Linear field > description text > `epics.md`. Update upstream when correcting downstream.
- **Don't use sub-issues for checklist decomposition.** Prefer explicit dependencies between stories. Reserve sub-issues for true parent/child decomposition of a story too large for one slice.
