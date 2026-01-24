# Informe de la rama `sms-sender`

Fecha: 2026-01-24

## 1) Objetivo de la rama

Esta rama introduce un flujo completo de **envío de SMS al crear una cita**, incluyendo un **enlace de cancelación** y un conjunto de cambios colaterales necesarios para que el envío sea fiable en un SaaS multi-tenant:

- Envío de SMS vía proveedor externo (Mocean) **desde backend (Cloud Functions)**, no desde Angular.
- Generación de un **token de cancelación** y una **pantalla pública** para confirmar/cancelar.
- Normalización/reestructuración de la captura del teléfono para soportar E.164.
- **Blacklist** de teléfonos para bloquear abuso o spam por tenant.
- Feature flag `features.enableSms` por tenant.

> El foco arquitectónico: el “core” de negocio sigue en capas (domain/application/infrastructure/presentation). El SMS y su disparo se resuelven en backend con su propia mini-Clean Architecture dentro de `functions/`.

## 2) Arquitectura (visión de alto nivel)

### 2.1. Separación de responsabilidades (Clean Architecture)

La rama mantiene/expande el patrón en capas:

- **Domain**: modelos/entidades y contratos (interfaces) sin dependencias de frameworks.
- **Application**: casos de uso (orquestan) y puertos (interfaces de repositorio).
- **Infrastructure**: adaptadores concretos (Firebase, HTTP a terceros).
- **Presentation**: UI Angular (standalone) para interacción usuario/administración.

Se aplica en dos “mundos”:

1) **Frontend Angular** (`src/app/...`) con su Clean Architecture.
2) **Backend Functions** (`functions/src/...`) con su propio `domain/application/infrastructure` para el SMS.

### 2.2. Flujo end-to-end

1. **UI (Angular)** captura teléfono (idealmente E.164) y datos de cita.
2. **Application (Angular)** crea la cita en Firestore (vía repositorio).
3. **Firestore trigger (Cloud Function v2)** detecta creación de documento de cita.
4. **Function** valida feature flag del tenant, normaliza teléfono, compone mensaje y genera link.
5. **Use case (Functions)** delega el envío a un `SmsRepository`.
6. **Adapter (Functions)** implementa `SmsRepository` llamando a Mocean.
7. **Usuario** recibe SMS con link `/cancelar/:token`.
8. **Pantalla pública (Angular)** decodifica token, verifica caducidad y permite cancelar.

## 3) Backend (Firebase Cloud Functions) — envío de SMS

### 3.1. Trigger y contexto multi-tenant

- Se añade una Cloud Function `sendSmsCancelation` (v2) que se ejecuta en la creación de documentos en:
  - `hairdressers/{tenantId}/appointments/{citaId}`

El `tenantId` forma parte del path y es el *contexto de ejecución* para:

- leer configuración del tenant,
- decidir si el SMS está habilitado,
- construir el link público correcto.

### 3.2. Mini Clean Architecture dentro de `functions/`

- **Domain**
  - `Appointment` (entidad para leer datos mínimos de la cita)
  - `SmsRepository` (puerto: contrato para enviar SMS)

- **Application**
  - `SendSmsCancelationUsecase`: caso de uso que compone el mensaje y llama a `SmsRepository`.

- **Infrastructure**
  - `MoceanAdapter`: implementación concreta del repositorio SMS (HTTP a Mocean).

Esto evita acoplar el trigger directamente al proveedor, y deja el envío intercambiable.

### 3.3. Configuración, secretos y feature flags

- **Secret** requerido en Functions: `MOCEAN_API_KEY`.
- **Sender ID** configurable: `MOCEAN_FROM` (normalizado y recortado para cumplir restricciones típicas de sender alfanumérico).
- **Feature flag** por tenant:
  - `features.enableSms` debe ser `true` en el documento `hairdressers/{tenantId}`.

La Function **no debe depender de Angular**: nada de DI de Angular ni servicios del frontend en runtime de Functions.

### 3.4. Enlace de cancelación y caducidad

- El token de cancelación es `base64url(JSON)` con:
  - `t` tenantId
  - `a` appointmentId
  - `e` expiresAt (timestamp)

- Caducidad diseñada: el link se invalida **24h antes** de la cita (`datetime - 24h`).

## 4) Frontend (Angular) — captura de teléfono y cancelación

### 4.1. Input de teléfono moderno (E.164)

Se introduce un componente dedicado de teléfono:

- `PhoneInputComponent` encapsula el input y usa librería de parsing/validación.
- Emite preferentemente formato **E.164** (ej: `+34600123456`).

Arquitectónicamente, la app deja de “confiar” en inputs libres y empuja el teléfono a un formato estable que:

- minimiza fallos en integraciones externas (SMS),
- simplifica reglas de negocio (blacklist),
- evita normalizaciones inconsistentes entre pantallas.

### 4.2. Pantalla pública de cancelación

Se añade la ruta pública:

- `/cancelar/:token`

Y un componente de cancelación que:

- decodifica el token,
- valida campos y caducidad,
- recupera la cita por `tenantId + appointmentId`,
- pide confirmación y, si el usuario acepta, borra la cita.

La cancelación se resuelve desde **Application** con un servicio dedicado para acciones sobre citas.

## 5) Blacklist de teléfonos (anti-abuso)

Esta rama añade un subdominio de blacklist orientado a seguridad/operación:

- **Application** define el puerto `BlockedNumberRepository`.
- **Infrastructure** implementa `FirebaseBlockedNumberRepository`.
- **UI Admin** incorpora una pantalla de gestión de blacklist.

Integración en el flujo de reserva:

- El caso de uso de creación de cita (`AddAppointmentUseCase`) ejecuta un check previo:
  - Si el teléfono está bloqueado, aborta con un error genérico (para no dar pistas).

Modelo multi-tenant:

- `blocked_phones` vive bajo `hairdressers/{tenantId}/blocked_phones`.

## 6) Multi-tenancy y consistencia de rutas

La rama refuerza la convención de datos multi-tenant bajo:

- `hairdressers/{tenantId}/...`

Puntos importantes:

- La Function escucha en `hairdressers/{tenantId}/appointments/{citaId}`.
- El frontend sigue usando un `SaasConfigService` para obtener rutas de colecciones.

**Ojo**: el repositorio de citas añade explícitamente `tenantId` en el DTO al crear la cita; esto ayuda a auditoría, aunque el tenant ya esté implícito en la ruta.

## 7) Observabilidad y operación

Dónde mirar para verificar que funciona:

- Logs de Functions: `firebase functions:log` (o Cloud Logging / Cloud Run para 2nd gen).
- Logs del adapter: se imprime la respuesta y los errores estructurados del proveedor.

Qué esperas ver:

- `📩 Procesando cita ...` cuando el trigger se ejecuta.
- `✅ SMS enviado...` si Mocean acepta.
- En error, un mensaje semántico tipo `MoceanAPI HTTP 400: ...`.

## 8) Cambios relevantes (inventario por áreas)

### Backend (Functions)

- Nuevo paquete `functions/` compilado con TypeScript y deploy en Node 20.
- Nuevos módulos `domain/application/infrastructure` para SMS.

### Frontend (Angular)

- Nueva ruta y pantalla de cancelación.
- Nuevo componente de input telefónico.
- Nuevo servicio de acciones de cita (buscar por token/cancelar).
- Nuevo subdominio de blacklist + UI de admin.
- Ajustes en creación de cita para soportar cancelación y multi-tenant.

## 9) Requisitos de configuración

Para que el SMS se envíe en un entorno real:

- Secret `MOCEAN_API_KEY` configurado en Firebase.
- (Opcional) `MOCEAN_FROM` configurado (sender ID).
- `features.enableSms = true` en `hairdressers/{tenantId}`.
- `domain/publicBaseUrl/publicUrl` correcto para construir el link público (si no, cae en `http://localhost:4200`).

## 10) Próximos pasos recomendados

- Centralizar el “sender” por tenant (white-label real), con validación (11 chars, alfanumérico).
- Consolidar rutas legacy del config `database.collections.*` si existen tenants antiguos (evitar que el frontend escriba fuera de `hairdressers/{tenantId}`).
- Añadir métricas/alertas (tasa de errores Mocean, latencia, ratio de envío).

---

Este documento describe la arquitectura y las piezas nuevas que incorpora la rama para habilitar envío de SMS con link de cancelación en un entorno multi-tenant.
