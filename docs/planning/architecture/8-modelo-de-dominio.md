# 8. Modelo de dominio

## Tablas principales

- `users`
- `sessions`
- `accounts`
- `user_profiles`
- `categories`
- `transactions`
- `document_assets`
- `document_links`
- `conversations`
- `messages`
- `knowledge_sources`
- `knowledge_chunks`
- `export_jobs`
- `subscription_plans`
- `user_subscriptions`
- `billing_events`

## Notas de diseño

- las tablas del RAG deben usar PK simple compatible con índices/vector search;
- no usar diseño que complique `vector_top_k` o índices vectoriales;
- `transactions.source` debe distinguir `form`, `text`, `voice`, `image`, `chat`.
- la voz dentro del chat no bloquea MVP; se trata como extensión si sobra tiempo.
