# Documentación Técnica: Implementación de Sistema Multi-Barbero

> **Módulo:** Citas y Reservas  
> **Patrón Principal:** Strategy Pattern  
> **Fecha de implementación:** Enero 2026

---

## 1. Introducción y Problema a Resolver

Originalmente, el sistema SaaS funcionaba bajo un modelo **"Global"**:
- Si una hora (ej: 10:00) tenía una reserva, esa hora se bloqueaba para **todo el negocio**.
- No importaba cuántos peluqueros hubiera; la capacidad del negocio era siempre 1.
- El "Peluquero" era solo un campo de texto administrativo, sin lógica propia.

**El objetivo:** Permitir que múltiples peluqueros atiendan simultáneamente. Si hay 3 peluqueros disponibles a las 10:00, el sistema debe permitir 3 reservas antes de bloquear la hora.

---

## 2. Arquitectura de la Solución: Patrón Strategy

Para introducir esta complejidad sin romper el sistema existente, migramos la lógica de creación de citas a un **Patrón Strategy**. Esto nos permite cambiar el comportamiento del sistema "en caliente" basándonos en la configuración del Tenant (`barberSelection: true/false`).

### Estructura
El caso de uso `AddAppointmentUseCase`, que antes contenía toda la lógica de validación y reserva, ahora actúa como un orquestador que delega en una estrategia:

1.  **`BookingStrategyFactory`**: Lee la configuración.
    *   Si `barberSelection = false` → Instancia **`GlobalBookingStrategy`**.
    *   Si `barberSelection = true` → Instancia **`BarberBookingStrategy`**.
2.  **`BarberBookingStrategy`**: Contiene la nueva lógica compleja (validar disponibilidad del barbero específico, gestionar concurrencia).

---

## 3. Transformación del Modelo de Datos (Domain)

Para soportar esta nueva realidad, las entidades principales tuvieron que evolucionar. Los cambios no rompen la compatibilidad hacia atrás (backward compatibility).

### 3.1 Entidad `Barber` (Peluquero)
Antes era un simple objeto visual. Ahora es una entidad con autoridad sobre la disponibilidad.
- **`id`**: Identificador único (antes se usaba el nombre).
- **`isAvailable`**: Flag maestro para activar/desactivar un peluquero.
- **`schedule`**: (Opcional) Horario específico. **Lógica de Herencia:** Si un barbero no tiene horario definido, hereda automáticamente el horario global del negocio.

### 3.2 Entidad `ReservedSlot` (El "Hueco" Ocupado)
Aquí reside la clave de la concurrencia.
- **Nuevo campo `barberId`**:
    *   `null`: Indica un bloqueo global (comportamiento antiguo). Bloquea la hora para todos.
    *   `"uuid-barbero"`: Indica que *ese* barbero está ocupado, pero los demás siguen libres.

### 3.3 Entidad `Appointment` (La Cita)
- Se estandarizó el uso de `barberId` como referencia fuerte, manteniendo `barberName` solo para visualización histórica (denormalización).

---

## 4. Lógica de Negocio y Disponibilidad

¿Cómo calcula el sistema si se puede reservar un Martes a las 11:00?

### 4.1 Jerarquía de Disponibilidad
El cálculo de disponibilidad (`AvailabilityHandler`) ahora evalúa dos niveles:

1.  **Nivel Negocio:** ¿La tienda abre hoy?
2.  **Nivel Recurso Humano (Nuevo):** ¿Hay *alguien* trabajando hoy?

> **Regla Crítica:** Si la tienda está abierta, pero TODOS los barberos activos tienen el día bloqueado o están de baja, el día se marca como **No Disponible** en el calendario.

### 4.2 Cálculo de Capacidad (Slots)
En el servicio `BusinessStateService`, la capacidad de una hora ya no es binaria (libre/ocupada).
- **Algoritmo:**
    1. Obtener todos los barberos activos.
    2. Para cada barbero, calcular su horario (propio o heredado).
    3. Restar los `ReservedSlot` que tengan su `barberId`.
    4. **Resultado:** Un "pool" de horas disponibles combinadas. Si un slot tiene capacidad > 1 (ej: Juan y Ana libres), visualmente se destaca.

---

## 5. Cambios en la Capa de Presentación (UI)

La interfaz se adapta dinámicamente según la información del dominio.

### 5.1 Selector de Hora (`HourSelector`)
- **Badge de Capacidad:** Si hay más de un hueco disponible a una hora, se muestra una etiqueta ("3 huecos").
- **Filtrado Inteligente:** Si el usuario selecciona un barbero específico primero, solo ve las horas de ese barbero.

### 5.2 Panel de Administración
- **Visualización Matricial (Grid):** En el calendario del admin, si a las 10:00 hay citas para Juan y Ana, se muestran ambas en paralelo, en lugar de apilarse o solaparse incorrectamente.
- **Gestión de Horarios:** Ahora el admin puede editar el horario "General" o entrar al detalle de un barbero específico. El frontend usa un patrón Strategy homólogo (`ScheduleEditorStrategy`) para reutilizar el mismo componente de edición para ambos casos.

---

## 6. Decisiones de Diseño y Compromisos

1.  **Filtrado en Memoria:**
    *   *Decisión:* `FirebaseScheduleRepository` descarga todos los slots del rango de fechas y el filtrado por barbero se hace en JavaScript.
    *   *Por qué:* Simplifica las consultas a Firestore y reduce costes de lectura (una sola lectura masiva es mejor que N lecturas pequeñas por barbero). Dado el volumen de citas de una peluquería, el impacto en memoria es despreciable.

2.  **Migración Implícita:**
    *   *Decisión:* No se ejecutó un script masivo para actualizar citas antiguas.
    *   *Por qué:* El código trata cualquier slot con `barberId: null` como "Global". Las citas antiguas simplemente siguen bloqueando el horario globalmente, lo cual es el comportamiento seguro y deseado hasta que caduquen.

---
