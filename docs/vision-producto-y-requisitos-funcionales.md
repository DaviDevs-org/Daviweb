# Visión del producto y requisitos funcionales (sin código)

**Proyecto:** Plataforma SaaS White‑Label para peluquerías y barberías (España)

**Propósito de este documento**
- Explicar el proyecto para entenderlo sin abrir el repositorio ni leer código.
- Dejar claros el modelo de negocio, el alcance funcional actual y la dirección futura.
- Servir como base para priorización, estimación y alineamiento del equipo.

---

## 1) Resumen ejecutivo

Construimos una plataforma **SaaS multi‑tenant (white‑label)** que permite a peluquerías y barberías tener su propia web/app de marca (colores, logo, datos del negocio) con un único código base.

El **core del negocio** son las **citas** (reservas), y alrededor viven el catálogo de **servicios**, la información del negocio, la galería, reseñas y un panel de administración.

La plataforma está pensada para escalar a:
- múltiples peluquerías (tenants),
- múltiples roles (owner y staff),
- diferentes planes de pago (membresías) con funcionalidades y límites.

---

## 2) Modelo de negocio (SaaS white‑label)

### 2.1 Qué vendemos
- Una “web/app” lista para usar para cada peluquería: branding, información, reservas y gestión.
- Un producto único que se configura por peluquería sin desarrollo a medida.

### 2.2 Quién paga
- El **dueño (owner)** de cada peluquería paga una suscripción mensual.
- En el futuro, podrán existir roles de empleados (staff) con permisos limitados.

### 2.3 Diferenciación por planes (visión, sin detalle)
El roadmap incluye un sistema de **planes** (membresías) donde el acceso a ciertas capacidades depende de lo contratado. Ejemplos de capacidades “planificadas”:
- exportación de datos (Export Center),
- analítica de negocio (KPIs),
- recordatorios por SMS,
- funciones avanzadas de administración y reportes.

> Nota: este documento no define precios ni un catálogo de planes detallado; solo establece que existe el concepto y su impacto.

---

## 3) Stakeholders y usuarios

### 3.1 Owner (dueño de la peluquería)
Objetivo: gestionar la operación (citas, servicios, disponibilidad) y maximizar reservas.

Necesidades típicas:
- ver y gestionar citas,
- configurar servicios y horarios,
- configurar la web visible para clientes,
- recibir señales de negocio (analíticas),
- extraer datos (exportaciones) y tener garantías de seguridad (backups operacionales de plataforma).

### 3.2 Cliente final (persona que reserva)
Objetivo: reservar rápido y sin fricción.

Necesidades típicas:
- ver servicios, horarios y disponibilidad,
- reservar una cita,
- cancelar o modificar si se permite,
- encontrar ubicación/contacto,
- ver opiniones y galería.

### 3.3 Admin interno del SaaS (equipo propietario del producto)
Objetivo: operar la plataforma (salud del sistema, crecimiento, conversiones, soporte).

Necesidades típicas:
- analítica de tráfico y conversión,
- administración de tenants, soporte y configuración,
- control de costes (SMS, almacenamiento, etc.).

---

## 4) Multi‑tenancy (concepto y requisitos)

### 4.1 Definición
Cada peluquería es un **tenant**. La misma aplicación cambia de “piel” y de datos en función del tenant.

### 4.2 Requisitos funcionales del multi‑tenant
- Cada tenant tiene:
  - identidad (tenantId),
  - datos de negocio (nombre, redes, contacto),
  - tema (colores/typografías),
  - flags de funcionalidades activas (feature flags).
- La experiencia del cliente final debe reflejar el branding del tenant.
- Los datos deben estar aislados: un tenant no ve datos de otro.

---

## 5) Requisitos funcionales (alcance actual)

> Esta sección describe “qué hace el producto” hoy como conjunto de capacidades. No entra en implementación.

### 5.1 Web pública (customer‑facing)
**Objetivo:** convertir visitas en reservas.

Capacidades esperadas:
- Página de inicio con branding del negocio.
- Secciones informativas:
  - quiénes somos / about,
  - servicios y precios,
  - ubicación y contacto,
  - opiniones/reseñas (si el tenant lo tiene habilitado),
  - galería (si habilitado),
  - FAQ.
- Páginas legales (aviso legal, privacidad).

### 5.2 Reservas online (core)
**Objetivo:** permitir a un cliente reservar una cita.

Capacidades esperadas:
- Visualización de disponibilidad por fecha y hora.
- Selección de servicio (con duración/precio si aplica).
- Confirmación de la reserva.
- Validaciones clave:
  - no permitir reservar en horarios cerrados,
  - no permitir solapamientos,
  - respetar bloqueos/excepciones de calendario,
  - manejar concurrencia básica (dos usuarios intentando reservar el mismo hueco).

> Nota: existen estrategias de reserva (p.ej. global vs por barbero) como concepto del negocio.

### 5.3 Panel de administración (owner)
**Objetivo:** gestionar la operación del negocio.

Capacidades esperadas:
- Autenticación (acceso a `/admin`).
- Gestión de citas:
  - listar por fecha/rango,
  - crear/editar/cancelar,
  - ver detalles.
- Gestión de servicios:
  - CRUD de servicios (nombre, duración, precio).
- Gestión de equipo/barberos (si aplica):
  - alta/baja/edición,
  - disponibilidad por barbero o reglas globales.
- Gestión de horarios y excepciones:
  - horarios base,
  - días cerrados / excepciones,
  - bloqueos de agenda.
- Gestión de contenido:
  - galería (si habilitado),
  - datos del negocio (contacto, redes, etc.).

### 5.4 Feature flags (por tenant)
**Objetivo:** activar/desactivar módulos según configuración del tenant.

Capacidades:
- Activar/desactivar reserva online.
- Activar/desactivar reseñas.
- Activar/desactivar galería.
- Modo mantenimiento.
- Activar/desactivar SMS.

> Esto es la base sobre la que se construirá el sistema de planes.

### 5.5 Notificaciones (SMS)
**Objetivo:** comunicación con el cliente sobre su cita.

Capacidades esperadas:
- Envío de SMS en eventos clave (por ejemplo, cancelación).
- Control de habilitación por tenant.

---

## 6) Requisitos no funcionales (calidad del producto)

### 6.1 Rendimiento y experiencia
- La web debe cargar rápido y ser usable en móvil.
- Evitar pantallas “pesadas” en el panel admin.

### 6.2 Seguridad y aislamiento
- Aislamiento estricto por tenant.
- Autenticación para el panel admin.
- No exponer datos sensibles públicamente.

### 6.3 RGPD y datos personales
- Minimizar PII (teléfono/nombre) cuando no sea imprescindible.
- Tener cuidado con exportaciones y analíticas: no enviar PII a herramientas de tráfico.

### 6.4 Operación y resiliencia
- Backups operacionales de base de datos (plataforma).
- Observabilidad básica (logs/errores) para soporte.

---

## 7) Roadmap funcional (épicas planificadas)

### 7.1 Export Center (owner)
- Exportar datos del tenant (MVP: citas) a CSV desde el panel admin.
- Motivo: reporting, contabilidad y portabilidad.

### 7.2 Backups operacionales (plataforma)
- Backups automáticos de base de datos con retención y runbook de restauración.
- Motivo: recuperación ante desastre y fiabilidad de plataforma.

### 7.3 Analíticas
- Analítica de negocio (owner): KPIs de citas, franjas horarias, cancelaciones, etc.
- Analítica de tráfico (admins internos): visitas, embudo de reserva, conversiones.

### 7.4 Sistema de planes (membresías)
- Definir planes y “entitlements” (qué incluye cada plan) sin acoplarse a la UI.
- Activar/desactivar capacidades y límites (por ejemplo, SMS por cuota mensual).

---

## 8) Suposiciones y decisiones abiertas

- Se prevén más roles (staff) y el panel admin deberá soportar visibilidad/permiso por sección.
- Export Center será inicialmente síncrono (descarga directa) y podría evolucionar a exportación asíncrona si hay volumen.
- Las analíticas de negocio deben evitar cálculos costosos en cliente y tender a agregados.
- Los backups operacionales son responsabilidad de la plataforma (no un “export del dueño”).

---

## 9) Glosario
- **Tenant:** peluquería/barbería cliente del SaaS.
- **Owner:** dueño del tenant.
- **Staff:** empleado del tenant (futuro).
- **Cita (appointment):** reserva de un cliente en un slot horario.
- **Feature flag:** interruptor para activar/desactivar un módulo por tenant.
- **Entitlement:** derecho efectivo a una funcionalidad según plan y estado de suscripción.
