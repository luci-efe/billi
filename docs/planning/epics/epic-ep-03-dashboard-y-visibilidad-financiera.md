# Epic EP-03: Dashboard y visibilidad financiera

## Story 3.1: Dashboard básico del plan gratuito

As a El profesionista endeudado,  
I want ver saldo, ingresos y egresos del periodo actual,  
So that entienda de un vistazo cómo voy financieramente.

**Linear metadata:**

- `external_id`: `ST-03-01`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-02 Core Visual`
- `labels`: `dashboard`, `ux`
- `priority`: `urgent`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`
- `blocked_by`: `ST-02-02`

**Acceptance Criteria:**

**Given** que el usuario tiene transacciones  
**When** abre el dashboard  
**Then** ve balance, ingresos y egresos del periodo  
**And** la información se entiende sin navegar más pantallas.

## Story 3.2: Categorías y tendencia

As a usuario,  
I want ver en qué gasto más y comparar con el periodo anterior,  
So that pueda tomar decisiones sobre mis hábitos.

**Linear metadata:**

- `external_id`: `ST-03-02`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-02 Core Visual`
- `labels`: `dashboard`, `analytics`
- `priority`: `high`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`
- `blocked_by`: `ST-03-01`

**Acceptance Criteria:**

**Given** que el usuario tiene suficientes movimientos  
**When** revisa el dashboard  
**Then** ve desglose por categoría y comparativa de tendencia  
**And** identifica áreas de mayor gasto.

## Story 3.3: Dashboard avanzado premium

As a usuario premium,  
I want ver historial completo y comparativas más profundas,  
So that obtenga más contexto y análisis que en el plan gratuito.

**Linear metadata:**

- `external_id`: `ST-03-03`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-02 Core Visual`
- `labels`: `dashboard`, `premium`, `billing`
- `priority`: `medium`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-03-02`

**Acceptance Criteria:**

**Given** que el usuario tiene plan premium  
**When** abre la sección avanzada del dashboard  
**Then** puede consultar histórico y comparativas extendidas  
**And** un usuario gratuito ve un gate claro y no intrusivo.
