# Epic EP-04: IA contextual y knowledge base

## Story 4.1: Curación e ingestión del corpus RAG

As a equipo del producto,  
I want cargar y estructurar 20 temas financieros mexicanos,  
So that el asistente pueda responder con contexto local útil.

**Linear metadata:**

- `external_id`: `ST-04-01`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-03 Inteligencia RAG`
- `labels`: `rag`, `research`, `backend`
- `priority`: `high`
- `estimate_o`: `3`
- `estimate_r`: `5`
- `estimate_p`: `8`
- `estimate_score`: `5.2`
- `estimate_tshirt`: `L`

**Acceptance Criteria:**

**Given** que existe un corpus curado  
**When** se procesa para el sistema  
**Then** queda indexado para retrieval  
**And** cada tema conserva referencia trazable.

## Story 4.2: Chatbot sobre historial del usuario

As a usuario,  
I want preguntarle al chatbot cuánto gasté o cuánto ingresé,  
So that reciba respuestas confiables basadas en mis datos reales.

**Linear metadata:**

- `external_id`: `ST-04-02`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `ai`, `chat`, `backend`
- `priority`: `urgent`
- `estimate_o`: `3`
- `estimate_r`: `5`
- `estimate_p`: `8`
- `estimate_score`: `5.2`
- `estimate_tshirt`: `L`
- `blocked_by`: `ST-03-01`

**Acceptance Criteria:**

**Given** que la pregunta se refiere al historial personal  
**When** el asistente responde  
**Then** usa cálculos deterministas sobre datos del usuario  
**And** no inventa valores financieros.

## Story 4.3: Chatbot educativo con RAG

As a El freelancer informal,  
I want preguntarle al chatbot qué es RESICO o cómo funciona SAT/CFDI,  
So that reciba explicaciones prácticas adaptadas a México.

**Linear metadata:**

- `external_id`: `ST-04-03`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `ai`, `rag`, `chat`
- `priority`: `urgent`
- `estimate_o`: `3`
- `estimate_r`: `5`
- `estimate_p`: `8`
- `estimate_score`: `5.2`
- `estimate_tshirt`: `L`
- `blocked_by`: `ST-04-01`

**Acceptance Criteria:**

**Given** que la pregunta es educativa  
**When** el asistente consulta el corpus  
**Then** responde con contexto claro y trazabilidad  
**And** indica límites si no hay soporte suficiente.

## Story 4.4: Registro de movimientos desde chat

As a usuario,  
I want registrar un ingreso o gasto directamente desde la conversación,  
So that el chat también funcione como interfaz de captura.

**Linear metadata:**

- `external_id`: `ST-04-04`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `chat-capture`, `ai`, `ux`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-04-02`

**Acceptance Criteria:**

**Given** que el usuario expresa un movimiento en chat  
**When** el sistema interpreta la intención  
**Then** muestra una propuesta editable de transacción  
**And** solo persiste el movimiento tras confirmación.

## Story 4.5: Fallback y trazabilidad del asistente

As a usuario,  
I want saber cuándo el asistente responde con certeza y cuándo no,  
So that pueda confiar en lo que veo.

**Linear metadata:**

- `external_id`: `ST-04-05`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `ai`, `security`, `ux`
- `priority`: `high`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`
- `blocked_by`: `ST-04-02`, `ST-04-03`

**Acceptance Criteria:**

**Given** que el asistente no tiene soporte suficiente  
**When** intenta responder  
**Then** activa un fallback seguro o pide aclaración  
**And** evita respuestas engañosas.
