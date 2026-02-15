# Informe de la rama `sms-sender`

Fecha: 2026-01-24  
**Última actualización**: 2026-02-15 (Migración a GatewayAPI)

## 1) Objetivo de la rama

Esta rama introduce un flujo completo de **envío de SMS al crear una cita**, incluyendo un **enlace de cancelación** y un conjunto de cambios colaterales necesarios para que el envío sea fiable en un SaaS multi-tenant:

- Envío de SMS vía proveedor externo (**GatewayAPI**) **desde backend (Cloud Functions)**, no desde Angular.
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
6. **Adapter (Functions)** implementa `SmsRepository` llamando a GatewayAPI.
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
  - `GatewayApiAdapter`: implementación concreta del repositorio SMS (HTTP a GatewayAPI).

Esto evita acoplar el trigger directamente al proveedor, y deja el envío intercambiable.

### 3.3. Configuración, secretos y feature flags

- **Secret** requerido en Functions: `GATEWAY_API_TOKEN`.
- **Sender ID** configurable por tenant vía `sms.fromName` o `business.name` (normalizado a 11 caracteres alfanuméricos).
  - ⚠️ **LIMITACIÓN IMPORTANTE**: El estándar SMS internacional (GSM) limita los sender IDs alfanuméricos a **máximo 11 caracteres** (solo letras y números, sin espacios ni tildes).
  - Si `business.name` es muy largo (ej: "Peluquería Stylish Barber"), se recortará (ej: "PeluqueriaS").
  - **Solución recomendada**: Configurar `sms.fromName` con un nombre corto (≤11 chars) específico para SMS.
  - Ejemplo en Firestore:
    ```javascript
    hairdressers/{tenantId}/
      business:
        name: "Peluquería Stylish Barber Shop"  // Nombre completo para web
      sms:
        fromName: "Stylish"  // Nombre corto para SMS (máx 11 chars)
    ```
- **Feature flag** por tenant:
  - `features.enableSms` debe ser `true` en el documento `hairdressers/{tenantId}`.

La Function **no debe depender de Angular**: nada de DI de Angular ni servicios del frontend en runtime de Functions.

#### ⚠️ CRÍTICO: Whitelist de Dominios en GatewayAPI

**GatewayAPI filtra links en mensajes SMS** mediante una whitelist en su dashboard. Si el dominio del link de cancelación no está aprobado, el SMS será **rechazado** con error `0x1904 - Message filtered by content`.

**Proceso obligatorio al dar de alta un nuevo tenant**:

1. Acceder al dashboard de GatewayAPI: [https://gatewayapi.com/](https://gatewayapi.com/)
2. Ir a **Settings → SMS → Link Filter**
3. Añadir el dominio del tenant (`tenant.domain`) a la whitelist
4. Ejemplos de dominios válidos:
   - `https://mipeluqueria.com`
   - `https://barberia-juan.es`
   - `https://proyecto-staging.web.app` (Firebase Hosting staging)
   - `https://abc123.ngrok-free.app` (túnel ngrok para testing local)

**⚠️ IMPORTANTE: GatewayAPI NO acepta `localhost` ni IPs locales** (127.0.0.1, 192.168.x.x). Solo dominios públicamente accesibles.

**Sin este paso, los SMS fallarán en producción con error `0x1904`**.

**Estrategias para testing**:

- **Opción 1 (Recomendada)**: Usar dominio de staging real (Firebase Hosting, Vercel, etc.)
- **Opción 2**: Túnel público temporal con [ngrok](https://ngrok.com/) o [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
  ```bash
  ngrok http 4200  # Genera URL pública tipo https://abc.ngrok-free.app
  ```
- **Opción 3**: Desarrollar localmente con `features.enableSms: false` en el tenant de prueba (la Function no enviará SMS)

#### Detalles Técnicos de GatewayAPI

**Endpoint**: `https://gatewayapi.com/rest/mtsms`  
**Autenticación**: `Authorization: Token {GATEWAY_API_TOKEN}`  
**Content-Type**: `application/json`

**Request Structure**:
```json
{
  "sender": "Peluqueria",
  "message": "Tu cita...",
  "recipients": [{"msisdn": 34600123456}]
}
```

**Success Response (HTTP 200)**:
```json
{
  "ids": [421332671],
  "usage": {
    "total_cost": 0.30,
    "currency": "DKK",
    "countries": {"ES": 1}
  }
}
```

**Error Response (HTTP 4xx/5xx)**:
```json
{
  "code": "0x0213",
  "message": "Unauthorized IP-address: %1",
  "incident_uuid": "...",
  "variables": ["1.2.3.4"]
}
```

**Códigos de error comunes**:
- `0x0229` - Invalid token (verificar secreto)
- `0x0216` - Insufficient credit (recargar cuenta)
- `0x1904` - Message filtered (dominio no en whitelist)
- `0x1010` - Unknown subscriber (número inválido)
- `0x0213` - Unauthorized IP-address (desactivar IP filtering en dashboard)

**Normalización del teléfono**:
- GatewayAPI espera el MSISDN sin el prefijo `+` (ej: `34600123456`).
- El adapter elimina automáticamente caracteres no numéricos del teléfono normalizado (que ya viene en formato E.164 desde el frontend/trigger).

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

- `� GatewayAPI Request: ...` cuando se envía el SMS.
- `✅ SMS enviado a ... - ID: ... - Coste: ...` si GatewayAPI acepta.
- En error, un mensaje semántico tipo `GatewayAPI HTTP 403 [0x0216]: Insufficient credit`.

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

- Secret `GATEWAY_API_TOKEN` configurado en Firebase Secret Manager.
- `features.enableSms = true` en `hairdressers/{tenantId}`.
- **⚠️ CRÍTICO**: Dominio del tenant (`domain`) añadido a la whitelist de GatewayAPI dashboard (Settings → SMS → Link Filter).
- `domain/publicBaseUrl/publicUrl` correcto para construir el link público (si no, cae en `http://localhost:4200`).

### Crear el secreto en Firebase

```bash
# Desde el directorio raíz del proyecto
firebase functions:secrets:set GATEWAY_API_TOKEN
# Pegar el token cuando lo pida y presiona Enter
```

O desde Google Cloud Console:
1. Ir a Secret Manager
2. Crear secreto `GATEWAY_API_TOKEN`
3. Añadir versión con el token
4. Dar permisos a la service account de Cloud Functions

## 10) Próximos pasos recomendados

- Automatizar alertas de balance bajo en GatewayAPI (webhook o monitoring manual).
- Implementar webhooks de delivery status (DSN) para auditar entregas fallidas.
- Añadir métricas/alertas (tasa de errores GatewayAPI, latencia, ratio de envío).
- Considerar rate limiting si hay picos masivos de reservas (GatewayAPI limita a 40 conexiones simultáneas por IP).

---

## ANEXO: Migración de Mocean a GatewayAPI (2026-02-15)

### Cambios realizados

1. **Nuevo adapter**: Creado `functions/src/infrastructure/gatewayapi.adapter.ts` implementando `SmsRepository`.
2. **Actualización de trigger**: Modificado `functions/src/index.ts` para usar `GatewayApiAdapter` y secreto `GATEWAY_API_TOKEN`.
3. **Eliminación de código legacy**: Borrado `mocean.adapter.ts`.

### Por qué GatewayAPI

- API más moderna (JSON nativo vs form-urlencoded).
- Mejor documentación y transparencia de costes.
- Soporte nativo para múltiples destinatarios en una llamada.
- Webhooks robustos con retry automático.

### Diferencias técnicas clave

| Aspecto | Mocean | GatewayAPI |
|---------|--------|------------|
| Content-Type | `application/x-www-form-urlencoded` | `application/json` |
| Autenticación | `Bearer {token}` | `Token {token}` |
| Request format | Form fields con prefijo `mocean-*` | JSON con campos raíz |
| Success check | `messages[0].status === 0` | HTTP 200 + `ids` array |
| Link filtering | No | **SÍ - Whitelist obligatoria** |

### Impacto

- **Cero impacto en frontend**: El cambio está completamente encapsulado en la capa de infraestructura del backend.
- **Cero cambios en lógica de negocio**: El caso de uso `SendSmsCancelationUsecase` permanece idéntico.
- **Única acción requerida**: Añadir dominios de tenants a whitelist de GatewayAPI manualmente.

### Testing post-migración
1. Hacer una reserva de prueba con un tenant configurado (`enableSms: true`).
2. Verificar logs en Firebase Console para request/response de GatewayAPI.
3. Comprobar recepción del SMS y funcionalidad del link de cancelación.
4. Probar casos de error: teléfono inválido, dominio no en whitelist.

---

Este documento describe la arquitectura y las piezas nuevas que incorpora la rama para habilitar envío de SMS con link de cancelación en un entorno multi-tenant, ahora usando **GatewayAPI** como proveedor.
