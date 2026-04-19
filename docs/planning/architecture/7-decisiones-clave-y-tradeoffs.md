# 7. Decisiones clave y tradeoffs

## AD-01. Reemplazar Convex por Turso/LibSQL

Se adopta Turso como base relacional principal. Ganancia: modelo SQL explícito, relaciones claras, mejor ajuste con Drizzle y Better Auth. Costo: se pierde reactividad nativa y algunas comodidades runtime de Convex.

## AD-02. Realtime no es requisito estructural del MVP

El dashboard y listados usarán refetch/polling o actualización manual controlada. No se introduce complejidad de realtime dedicado salvo que una necesidad real lo justifique.

## AD-03. Better Auth sobre Drizzle

La persistencia de auth se integra con la misma base relacional, simplificando ownership y joins del dominio. Requiere esquema y migraciones explícitas.

## AD-04. RAG sobre Turso

El MVP puede usar vector search nativo de Turso/libSQL para embeddings y retrieval, evitando una base vectorial separada en esta fase.

## AD-05. Blob y metadata separados

Los binarios van a R2. La metadata, ownership, links y auditoría quedan en Turso.

## AD-06. Chat separado en dos rutas

Preguntas sobre dinero del usuario usan consultas deterministas al dominio SQL. Preguntas educativas usan retrieval sobre el corpus curado.

## AD-07. Billing básico sí entra en MVP

Se mantiene un flujo básico de integración con Dodo Payments porque el producto original define plan gratuito y premium desde MVP. El objetivo es cubrir checkout y sincronización mínima de estado de plan, no un sistema complejo de facturación.
