# 11. Seguridad, privacidad y cumplimiento

- ownership verificado en backend en cada operación;
- secretos solo en edge/backend;
- cifrado en tránsito;
- minimización de datos enviados a LLM;
- redacción de identificadores sensibles;
- URLs firmadas para documentos;
- política clara de retención, borrado y exportación;
- posicionamiento del producto como herramienta educativa/organizacional, no servicio financiero regulado.

## Sub-procesadores (encargados) declarados

Bajo LFPDPPP Art. 36, toda transferencia de datos personales a un tercero debe estar consentida por el titular. El aviso de privacidad y el flujo de onboarding (BIL-1) deben listar explícitamente:

| Sub-procesador | Datos transferidos | Jurisdicción | Propósito |
|---|---|---|---|
| **Clerk Inc.** ([ADR-003](adr/ADR-003-auth-clerk.md)) | email, hash de contraseña, tokens OAuth, metadata de sesión | Estados Unidos | Autenticación e identidad |
| **Turso (ChiselStrike)** | datos financieros cifrados, consentimiento, espejo de `users` | Región configurable (preferencia MX/US más cercana) | Base de datos operacional |
| **Cloudflare** | logs mínimos, tráfico HTTP | Global edge | Hosting + runtime + R2 |
| **OpenRouter** (proxy a proveedores LLM) | fragmentos de consulta del usuario (sin PII, minimizados) | Estados Unidos (principalmente) | Respuestas educativas y embeddings |
| **Dodo Payments** | email, historial de suscripción | EE.UU. / LATAM según plaza | Cobro plan premium |

Reglas derivadas:
- El aviso de privacidad debe nombrar cada sub-procesador y su jurisdicción.
- El consentimiento inicial (BIL-1) debe surfacear al menos Clerk + OpenRouter por ser transferencias PII/contenido a EE.UU.
- Cambios futuros a esta tabla requieren revisar si el consentimiento anterior sigue siendo válido o debe renovarse (bump de `consent_v`).
