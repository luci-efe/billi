# Epic EP-02: Captura y evidencia financiera

## Story 2.1: Modelo base de transacciones

As a usuario autenticado,  
I want que mis movimientos se guarden con tipo, monto, categoría, fecha y fuente,  
So that el producto pueda construir todo el resto de la experiencia.

**Linear metadata:**

- `external_id`: `ST-02-01`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-01 Fundación`
- `labels`: `foundation`, `backend`
- `priority`: `urgent`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`

**Acceptance Criteria:**

**Given** que el sistema necesita persistir movimientos  
**When** se crea el modelo de transacciones  
**Then** soporta `form`, `text`, `voice`, `image` y `chat` como fuente  
**And** cada movimiento pertenece a un único usuario.

## Story 2.2: Registro por formulario

As a usuario,  
I want registrar un movimiento con formulario estructurado,  
So that pueda llevar control manual de mis finanzas.

**Linear metadata:**

- `external_id`: `ST-02-02`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-01 Fundación`
- `labels`: `backend`, `ux`
- `priority`: `urgent`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-02-01`

**Acceptance Criteria:**

**Given** que el usuario completa un formulario válido  
**When** guarda el movimiento  
**Then** la transacción queda persistida con todos los campos necesarios  
**And** puede editarse después.

## Story 2.3: Registro por texto libre

As a El profesionista endeudado,  
I want escribir “gasté 150 en gasolina” y ver cómo el sistema lo interpreta,  
So that pueda registrar movimientos más rápido.

**Linear metadata:**

- `external_id`: `ST-02-03`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `ai`, `nl-capture`, `ux`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-02-02`

**Acceptance Criteria:**

**Given** que el usuario escribe una frase de gasto o ingreso  
**When** el sistema interpreta entidades  
**Then** muestra una propuesta editable de monto, tipo, fecha y categoría  
**And** no guarda nada hasta confirmación.

## Story 2.4: Registro por voz

As a usuario,  
I want dictar un movimiento y revisar la propuesta antes de guardarla,  
So that reduzca fricción sin perder control.

**Linear metadata:**

- `external_id`: `ST-02-04`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-04 Chatbot Integrado`
- `labels`: `ai`, `voice`, `ux`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-02-03`

**Acceptance Criteria:**

**Given** que el usuario dicta un movimiento  
**When** el sistema transcribe e interpreta  
**Then** presenta una propuesta editable  
**And** permite fallback a captura manual.

## Story 2.5: Registro por imagen de recibo

As a El freelancer informal,  
I want fotografiar un recibo y revisar los datos detectados,  
So that pueda ahorrar tiempo sin aceptar errores automáticos.

**Linear metadata:**

- `external_id`: `ST-02-05`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-05 Refinamiento`
- `labels`: `ai`, `documents`, `ocr`
- `priority`: `medium`
- `estimate_o`: `3`
- `estimate_r`: `5`
- `estimate_p`: `8`
- `estimate_score`: `5.2`
- `estimate_tshirt`: `L`
- `blocked_by`: `ST-02-02`

**Acceptance Criteria:**

**Given** que el usuario carga una foto  
**When** el sistema procesa la imagen  
**Then** muestra una propuesta editable con monto, fecha y categoría sugerida  
**And** informa claramente si la extracción falla.

## Story 2.6: Recibos y documentos vinculados

As a usuario,  
I want ver mis documentos vinculados a transacciones,  
So that pueda recuperar evidencia financiera cuando la necesite.

**Linear metadata:**

- `external_id`: `ST-02-06`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-02 Core Visual`
- `labels`: `documents`, `backend`, `ux`
- `priority`: `high`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-02-02`

**Acceptance Criteria:**

**Given** que un usuario tiene documentos asociados  
**When** abre la sección de facturas  
**Then** puede buscar, filtrar y abrir documentos  
**And** ve su relación con la transacción correspondiente.
