# Épicas nuevas — Export Center, Backups y Analíticas

**Proyecto:** SaaS Peluquerías/Barberías (Angular + Firebase, multi-tenant)

**Objetivo de este documento**
- Registrar de forma profesional, legible y accionable las épicas nuevas a implementar.
- Dejar claros los límites, decisiones técnicas y criterios de aceptación.
- Servir como referencia operativa para un equipo humano y como especificación entendible para un modelo de IA que siga `copilot-instructions`.

---

## 0) Contexto y restricciones (NO negociables)

### 0.1 Arquitectura (Clean Architecture)
La base del proyecto se organiza por capas:
- `src/app/domain`: reglas y tipos de negocio (TypeScript puro). **Nada de Angular/Firebase.**
- `src/app/application`: casos de uso y puertos (interfaces de repositorio). Orquestan la lógica.
- `src/app/infrastructure`: implementaciones concretas (Firebase/HTTP/Storage/etc.).
- `src/app/presentation`: UI Angular (Standalone + Signals). Consume `application`.

**Regla crítica:** `presentation` NO habla directo con `infrastructure`.

### 0.2 Multi-tenancy
- Cada tenant se identifica con `tenantId`.
- Los datos se guardan bajo `hairdressers/{tenantId}/...`.
- El `TenantService` determina el tenant actual y condiciona toda lectura/escritura.

### 0.3 Roles y permisos (hoy simple, mañana no)
- Actualmente el único rol efectivo es “dueño/owner”.
- A futuro habrá más roles y **la diferencia principal será qué páginas/acciones ven dentro de `/admin`**.

**Implicación:** diseñar permisos de forma extensible (roles o capabilities) y no hardcodear una única vista.

### 0.4 Separación de conceptos (para no liarla)
- **Export Center (descargable por el dueño)** ≠ **Backups operacionales (recuperación ante desastre)**.
- **Analítica de negocio (dueño)** ≠ **Analítica de tráfico/producto (admins internos)**.

---

## 1) Épica A — Export Center (Owner) — Exportar citas a CSV

### 1.1 Problema
El dueño necesita exportar sus datos (MVP: **citas**) en un formato portable para:
- reporting propio,
- contabilidad,
- auditorías,
- migraciones.

### 1.2 Alcance (MVP)
- Exportación de **citas** a **CSV**.
- Selector de **rango de fechas**.
- Descarga desde el panel `/admin`.
- Respeta multi-tenancy (`tenantId`) y permisos.

### 1.3 Fuera de alcance (por ahora)
- XLSX/PDF (se podrá añadir después).
- Exportación asíncrona en backend (solo si el volumen lo exige).
- Exportar otras entidades (servicios/clientes/galería/etc.).

### 1.4 UX/Flujo
1) Owner entra en `/admin` → sección “Export Center”.
2) Selecciona rango de fechas.
3) Click “Exportar citas (CSV)”.
4) Descarga `appointments_<tenantId>_<from>_<to>.csv`.

### 1.5 Diseño por capas (Clean Architecture)

#### Domain
- Tipos recomendados (mínimos):
	- `ExportFormat` (MVP: `'csv'`)
	- `DateRange` o estructura equivalente (si ya existe, reutilizar)

> Nota: no hace falta crear un `ExportJob` en MVP si la exportación es síncrona en cliente.

#### Application
- Caso de uso propuesto:
	- `ExportAppointmentsToCsvUseCase`
		- **Input:** `{ tenantId, from, to, filters? }`
		- **Output:** `{ filename, mimeType: 'text/csv', content: string }`

- Dependencias:
	- Usa el repositorio/casos de uso existentes para obtener citas por rango.
	- Función pura de serialización:
		- `appointmentsToCsv(appointments): string` (sin Angular, sin DOM, sin Firebase).

#### Infrastructure
- No se introduce una “infra de export” para el MVP.
- Se reutiliza la infraestructura existente para leer citas.

#### Presentation
- Componente/página standalone en `presentation/admin-panel/...` (o sección admin equivalente):
	- Form con rango de fechas.
	- Botón de export.
	- Uso de Signals por defecto.
	- Descarga mediante `Blob`.

### 1.6 Contrato CSV (MVP)

**Formato**
- `mimeType`: `text/csv`
- Separador: `,`
- Escape: envolver con `"` valores con coma, comillas o saltos de línea
- Saltos: `\n`
- Fechas: ISO-8601 (recomendado) o formato local consistente (definir UNA opción y mantenerla)

**Columnas recomendadas (MVP)**
- `appointmentId`
- `startAt`
- `endAt` (si existe)
- `serviceName`
- `price` (si existe)
- `customerName` (si existe)
- `customerPhone` (si existe; ojo RGPD)
- `status`
- `createdAt`

### 1.7 Seguridad y RGPD
- Exportar datos personales implica riesgo.
- Medidas mínimas:
	- Solo owner (y futuros roles autorizados).
	- No registrar PII en logs.
	- Evaluar añadir “export sin PII” como opción futura.

### 1.8 Auditoría (recomendado desde el inicio)
Registrar el evento de export (para trazabilidad):
- `hairdressers/{tenantId}/admin_audit/{eventId}`
	- `type: 'export_appointments_csv'`
	- `range: { from, to }`
	- `requestedByUserId`
	- `createdAt`

### 1.9 Criterios de aceptación (MVP)
- Solo exporta citas del `tenantId` activo.
- CSV abre correctamente en Sheets/Excel sin columnas rotas.
- Si no hay datos: devuelve CSV con cabecera (o feedback claro + CSV vacío con cabecera).
- Errores del repositorio se muestran en UI de forma controlada.
- Rendimiento aceptable para rangos típicos (p.ej. 1–3 meses).

### 1.10 Testing (mínimo)
- Unit tests para:
	- `appointmentsToCsv` (escapes, comas, saltos, nulos).
	- Use case (filename + estructura coherente).

---

## 2) Épica B — Backups operacionales (Firestore)

### 2.1 Problema
Necesitamos backups recuperables para:
- borrado accidental,
- corrupción de datos,
- recuperación ante desastre.

**Esto NO se resuelve con Export Center.**

### 2.2 Alcance
- Backups automáticos diarios (mínimo).
- Export de Firestore a Cloud Storage.
- Retención automática (p.ej. 30 días) por lifecycle del bucket.
- Logs y monitorización básica de fallos.

### 2.3 Decisión técnica
Se implementa en Google Cloud/Firebase:
- **Cloud Storage**: bucket de backups (privado).
- **Scheduler**: Cloud Scheduler (o equivalente) para disparar ejecución.
- **Runner**: Cloud Function o Cloud Run que invoque el export de Firestore Admin.

### 2.4 Fuera de alcance (por ahora)
- Restauración desde UI `/admin` (prohibido en SaaS).
- Backups por tenant individuales (se evaluará más adelante si hace falta).

### 2.5 Seguridad
- Service Account con permisos mínimos necesarios:
	- `Datastore Import Export Admin` (o rol equivalente)
	- permisos de escritura en el bucket
- Bucket sin acceso público.
- Acceso restringido solo a operadores.

### 2.6 Criterios de aceptación
- Se genera un export diario en el bucket.
- Existe retención automática.
- Hay logs de ejecución y logs de error.
- Existe runbook documentado de restauración (al menos a un proyecto de staging).

### 2.7 Entregables
- Guía reproducible (paso a paso) para:
	- creación bucket,
	- permisos IAM,
	- scheduler,
	- función/servicio runner,
	- retención,
	- restauración.

---

## 3) Épica C — Analíticas

Separación obligatoria:
- **C1 Analítica de negocio (owner):** se calcula desde datos internos (citas).
- **C2 Analítica de tráfico/producto (admins internos):** se mide con herramienta tipo GA4.

---

### 3.1 Épica C1 — Analítica de negocio (Owner)

#### 3.1.1 Problema
El dueño quiere indicadores útiles:
- nº de citas por día/semana,
- cancelaciones,
- ocupación por franja horaria,
- (futuro) servicios top, ingresos estimados, recurrencia.

#### 3.1.2 Decisión técnica
No hacer analytics a base de queries masivas desde UI.

**Recomendación:** precomputar agregados en Firestore por día (y tenant).

#### 3.1.3 Modelo de datos propuesto (agregados)
- `hairdressers/{tenantId}/analytics_daily/{yyyy-mm-dd}`
	- `appointmentsTotal: number`
	- `appointmentsCancelled: number`
	- `appointmentsCompleted: number`
	- `slotsByHour: Record<string, number>` (por ejemplo `{"09": 3, "10": 5}`)
	- `updatedAt`

> Alternativa: array fijo de 24 buckets si preferís evitar maps.

#### 3.1.4 Pipeline de actualización
- Trigger server-side (Cloud Functions) cuando:
	- se crea una cita,
	- se actualiza (cambio de estado/fecha),
	- se cancela.

**Regla clave:** si cambia de día/hora/estado, hay que decrementar del bucket anterior e incrementar el nuevo.

#### 3.1.5 UI
- Nueva sección `/admin/analytics` (owner):
	- selector de rango,
	- gráficos (línea por días + barras por hora),
	- consumo desde `application` (use cases) leyendo agregados.

#### 3.1.6 Criterios de aceptación (MVP)
- Dashboard muestra:
	- total de citas (últimos 7 días),
	- cancelaciones (últimos 7 días),
	- distribución por hora (hoy o promedio semanal).
- Coste estable: lecturas de agregados, no lecturas masivas de citas.

---

### 3.2 Épica C2 — Analítica de tráfico/producto (Admins internos)

#### 3.2.1 Problema
El equipo (admins internos del SaaS) necesita:
- tráfico (visitas, fuentes, páginas),
- conversiones,
- embudo de reserva,
- segmentación por tenant.

#### 3.2.2 Decisión técnica
Integración con GA4 (o equivalente).

- Eventos clave (mínimos):
	- `view_services`
	- `start_booking`
	- `booking_step` (param `step`)
	- `booking_success`
	- `booking_cancel`

- Parámetros:
	- `tenantId`
	- `serviceId`/`serviceName` (si aplica)

**Prohibido:** enviar PII (nombre, teléfono, etc.) en eventos.

#### 3.2.3 Criterios de aceptación
- Eventos visibles en modo debug.
- Segmentación por `tenantId` posible.
- Cumplimiento básico de consentimiento/cookies según legal.

---

## 4) Dependencias y riesgos

### 4.1 Dependencias
- Export Center: existencia de lectura de citas por rango + esquema de citas consistente.
- Backups: proyecto GCP con billing + permisos IAM.
- Analítica negocio: triggers server-side y definición estable de estados/fechas.
- Analítica tráfico: GA4 + consentimiento.

### 4.2 Riesgos
- Export cliente con grandes volúmenes: puede saturar memoria/UX → migrar a export asíncrono backend.
- RGPD: export y/o analytics con PII → riesgo legal serio.
- Agregados inconsistentes por updates complejos: hay que definir transición de estado y actualización atómica.
- Coste Firestore si se queryean miles de documentos para analytics.

---

## 5) Orden recomendado de implementación (incremental)
1) Export Center MVP (citas → CSV)
2) Backups operacionales (export diario + retención + runbook)
3) Analítica negocio MVP (agregados diarios + UI)
4) Analítica tráfico (GA4 + eventos)