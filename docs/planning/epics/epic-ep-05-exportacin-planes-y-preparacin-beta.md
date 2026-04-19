# Epic EP-05: Exportación, planes y preparación beta

## Story 5.1: Exportación CSV del plan gratuito

As a usuario,  
I want exportar mi historial en CSV,  
So that pueda reutilizarlo fuera de la plataforma.

**Linear metadata:**

- `external_id`: `ST-05-01`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-02 Core Visual`
- `labels`: `export`, `foundation`
- `priority`: `high`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`

**Acceptance Criteria:**

**Given** que el usuario selecciona un rango válido  
**When** solicita un CSV  
**Then** el archivo contiene todas las transacciones esperadas  
**And** respeta ownership y formato correcto.

## Story 5.2: Gestión de plan y checkout con Dodo Payments

As a usuario,  
I want elegir y activar un plan premium mediante Dodo Payments,  
So that pueda desbloquear capacidades pagadas del producto.

**Linear metadata:**

- `external_id`: `ST-05-02`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-02 Core Visual`
- `labels`: `billing`, `freemium`, `premium`, `ux`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`

**Acceptance Criteria:**

**Given** que el usuario quiere activar premium  
**When** inicia el flujo de upgrade  
**Then** puede ver beneficios, precio y checkout básico con Dodo Payments  
**And** el estado de su plan queda sincronizado en el producto.

**Given** que una funcionalidad es premium  
**When** un usuario gratuito intenta usarla  
**Then** ve un gate claro con beneficios y camino de upgrade  
**And** puede regresar sin perder contexto.

## Story 5.3: Exportación PDF premium

As a usuario premium,  
I want exportar mis finanzas en PDF formateado,  
So that pueda archivarlas o compartirlas en una presentación más legible.

**Linear metadata:**

- `external_id`: `ST-05-03`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-05 Refinamiento`
- `labels`: `export`, `premium`, `billing`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-05-02`

**Acceptance Criteria:**

**Given** que el usuario tiene plan premium  
**When** solicita PDF  
**Then** el sistema genera un reporte formateado  
**And** un usuario gratuito recibe un gate consistente.

## Story 5.4: QA funcional y beta launch

As a equipo del proyecto,  
I want validar los flujos críticos y lanzar beta con usuarios reales,  
So that confirmemos utilidad, estabilidad y fricción.

**Linear metadata:**

- `external_id`: `ST-05-04`
- `project`: `PRJ-02 RAG, Chatbot y MVP`
- `milestone`: `MS-05 Refinamiento`
- `labels`: `qa`, `beta`, `research`
- `priority`: `urgent`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-04-05`, `ST-05-01`

**Acceptance Criteria:**

**Given** que la funcionalidad mínima comprometida está implementada  
**When** el equipo ejecuta pruebas internas de punta a punta  
**Then** confirma que el sitio funciona como se espera  
**And** declara el producto beta ready para uso controlado.

**Given** que el producto ya es beta ready  
**When** el equipo abre la beta  
**Then** obtiene evidencia de funcionamiento y feedback cualitativo  
**And** valida al menos 10 usuarios beta.
