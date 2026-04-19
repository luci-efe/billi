# 17. Modelo de trabajo para Linear

- `Initiative`: `Billi MVP`
- `Team`: uno solo para todo el backlog
- `Projects`:
  - `Fundación y Core`
  - `RAG, Chatbot y MVP`
- `Milestones`: fases del roadmap de 10 semanas
- `Issues`: historias y trabajos implementables
- `Sub-issues`: uso mínimo; preferir dependencias explícitas entre historias

Campos importantes:

- `external_id`
- `priority`
- `estimate`
- `labels`
- `project`
- `milestone`
- `blocked_by`
- `blocking`
- `acceptance_criteria`
- referencias a arquitectura y UX

## Reglas operativas para Linear

- usar un solo team;
- usar los 2 proyectos del WBS como contenedores principales;
- usar milestones para las 5 fases del roadmap;
- evitar sub-issues salvo que una historia sea realmente demasiado grande;
- preferir `blocked_by` y `blocking` para secuenciar trabajo.

## Prioridad

- `urgent`: bloquea la ruta crítica o el arranque de otros frentes;
- `high`: imprescindible para MVP pero no bloquea inmediatamente todo el resto;
- `medium`: importante, pero puede entrar después de la base funcional;
- `low`: deseable o claramente posterior.

## Estimación formal

Se usará estimación PERT por historia:

- `O`: optimista
- `R`: realista
- `P`: pesimista
- `score = (O + 4R + P) / 6`

Luego el score se traduce a talla T-shirt:

- `XS`: score <= 1.5
- `S`: score > 1.5 y <= 2.5
- `M`: score > 2.5 y <= 4
- `L`: score > 4 y <= 6.5
- `XL`: score > 6.5