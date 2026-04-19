# 2. Principios arquitectónicos

- mantener el MVP lo más simple posible;
- separar lógica financiera determinista de generación con LLM;
- usar una base de datos relacional explícita para el core del dominio;
- mantener el storage binario fuera de la base de datos;
- no depender de realtime si no aporta valor directo al MVP;
- tratar privacidad, consentimiento y ownership como reglas del backend, no del cliente.
