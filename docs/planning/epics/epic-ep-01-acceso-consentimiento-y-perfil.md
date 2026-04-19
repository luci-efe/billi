# Epic EP-01: Acceso, consentimiento y perfil

## Story 1.1: Onboarding con propuesta de valor y consentimiento

As a El profesionista endeudado,  
I want entender rápidamente para qué sirve Billi y qué hará con mis datos,  
So that pueda decidir si quiero empezar a usarla.

**Linear metadata:**

- `external_id`: `ST-01-01`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-01 Fundación`
- `labels`: `foundation`, `ux`, `security`
- `priority`: `high`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`

**Acceptance Criteria:**

**Given** que un usuario entra por primera vez  
**When** abre la experiencia inicial  
**Then** ve la propuesta de valor y el consentimiento en lenguaje claro  
**And** entiende que el producto usa IA y datos financieros personales.

## Story 1.2: Registro e inicio de sesión

As a usuario,  
I want crear una cuenta e iniciar sesión con email/contraseña u OAuth,  
So that pueda acceder a mi espacio financiero de forma segura.

**Linear metadata:**

- `external_id`: `ST-01-02`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-01 Fundación`
- `labels`: `foundation`, `backend`, `security`
- `priority`: `urgent`
- `estimate_o`: `2`
- `estimate_r`: `3`
- `estimate_p`: `5`
- `estimate_score`: `3.2`
- `estimate_tshirt`: `M`
- `blocked_by`: `ST-01-01`

**Acceptance Criteria:**

**Given** que el usuario completa credenciales válidas  
**When** envía el formulario de registro o login  
**Then** el sistema crea o abre su sesión correctamente  
**And** restringe el acceso a datos por ownership.

## Story 1.3: Configuración de perfil y categorías

As a El freelancer informal,  
I want configurar mi perfil, moneda y categorías,  
So that el sistema refleje mi realidad financiera.

**Linear metadata:**

- `external_id`: `ST-01-03`
- `project`: `PRJ-01 Fundación y Core`
- `milestone`: `MS-01 Fundación`
- `labels`: `foundation`, `ux`
- `priority`: `high`
- `estimate_o`: `1`
- `estimate_r`: `2`
- `estimate_p`: `3`
- `estimate_score`: `2.0`
- `estimate_tshirt`: `S`
- `blocked_by`: `ST-01-02`

**Acceptance Criteria:**

**Given** que el usuario está autenticado  
**When** entra por primera vez al producto  
**Then** puede definir datos mínimos del perfil y categorías base  
**And** esos datos se usan después en captura y dashboard.
