# Requirements Inventory

## Functional Requirements

FR1: Registro multimodal por formulario, texto libre, voz e imagen.  
FR2: Dashboard financiero con resumen, categorías y tendencias.  
FR3: Chatbot contextualizado sobre historial y RAG.  
FR4: Registro de transacciones desde conversación.  
FR5: Corpus curado de 20 temas financieros mexicanos.  
FR6: Almacenamiento de documentos vinculados.  
FR7: Exportación CSV y PDF.  
FR8: Autenticación y perfil.  
FR9: Diferenciación entre plan gratuito y premium.

## NonFunctional Requirements

NFR1: Producto en español y contexto mexicano.  
NFR2: Seguridad y privacidad.  
NFR3: Carga del dashboard menor a 3 segundos.  
NFR4: Compatibilidad web moderna.  
NFR5: Escalabilidad razonable.  
NFR6: Usabilidad inicial alta.  
NFR7: Trazabilidad de IA.  
NFR8: Confirmación humana en automatizaciones ambiguas.

## Additional Requirements

- arquitectura basada en Turso/LibSQL, Drizzle y Better Auth;
- storage en R2;
- bifurcación entre ruta determinista y ruta RAG;
- soporte para límites/gates premium;
- milestones del roadmap de 10 semanas.

## UX Design Requirements

UX-DR1: consentimiento visible;  
UX-DR2: captura multimodal coherente;  
UX-DR3: texto natural interpretable;  
UX-DR4: confirmación de voz e imagen;  
UX-DR5: dashboard de lectura inmediata;  
UX-DR6: chat con trazabilidad;  
UX-DR7: upgrade path limpio;  
UX-DR8: centro de privacidad.

## FR Coverage Map

FR1: EP-02  
FR2: EP-03  
FR3: EP-04  
FR4: EP-04  
FR5: EP-04  
FR6: EP-02  
FR7: EP-05  
FR8: EP-01  
FR9: EP-05
