# 6. Componentes y responsabilidades

## 6.1 Frontend

- rendering de vistas;
- formularios;
- chat;
- dashboard;
- gates de plan;
- carga de documentos;
- experiencia de consentimiento.

## 6.2 API/BFF

- exponer endpoints para CRUD y exportación;
- validar sesión y ownership;
- coordinar acceso a DB, R2 y Mastra;
- implementar reglas del producto sin exponer secretos al cliente.

## 6.3 Turso / LibSQL

- usuarios, perfiles y sesiones ligadas a auth;
- categorías, transacciones y relaciones;
- metadata de documentos;
- conversaciones y mensajes;
- jobs de exportación;
- chunks y embeddings del RAG.
- planes, suscripciones y estado de acceso premium.

## 6.4 Better Auth

- registro;
- login;
- OAuth;
- sesiones;
- flujos de recuperación/verificación si se habilitan.

## 6.5 R2

- recibos y facturas;
- artefactos temporales de exportación;
- archivos fuente del corpus cuando haga falta.

## 6.6 Mastra

- clasificación de intención;
- ruta sobre historial;
- ruta RAG;
- fallback seguro;
- composición de prompts y tools.

## 6.7 Cloudflare Workflows

- ingestión de corpus;
- generación PDF si el proceso se vuelve largo;
- procesos asincrónicos de exportación o mantenimiento.

## 6.8 Dodo Payments

- checkout de suscripción;
- actualización del estado de plan;
- webhooks para sincronizar suscripción con el dominio de usuario.
