# Plan: Patrón Strategy para Sistema de Citas Multi-Barbero

> **Fecha de inicio:** 3 de enero de 2026  
> **Estado:** � Completado  
> **Última actualización:** 3 de enero de 2026

---

## 📋 Resumen Ejecutivo

Implementar un **patrón Strategy** en el sistema de citas que permita dos modos de reserva:

| Modo | Condición | Comportamiento |
|------|-----------|----------------|
| **Global** | `barberSelection = false` | Sistema actual: un slot reservado bloquea la hora para todo el negocio |
| **Multi-Barbero** | `barberSelection = true` | Nuevo: cada barbero tiene su propia disponibilidad, permitiendo N citas simultáneas (N = barberos disponibles) |

---

## 🏗️ Contexto Técnico

### Arquitectura del Proyecto
- **Framework:** Angular 19+ (Standalone, Signals, SSR)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Arquitectura:** Clean Architecture (Domain → Application → Infrastructure → Presentation)
- **Multi-tenancy:** Datos segregados en `/hairdressers/{tenantId}/...`

### Archivos Clave

| Capa | Archivo | Propósito |
|------|---------|-----------|
| Domain | `src/app/domain/business-info/barber/barber.entity.ts` | Entidad Barber |
| Domain | `src/app/domain/appointments/reserved-slot.entity.ts` | Entidad ReservedSlot |
| Domain | `src/app/domain/appointments/appointment.entity.ts` | Entidad Appointment |
| Application | `src/app/application/appointments/add-appointment.use-case.ts` | Caso de uso principal |
| Application | `src/app/application/appointments/appointment.repository.interface.ts` | Interfaz del repositorio |
| Infrastructure | `src/app/infrastructure/firebase/firebase-schedule.repository.ts` | Implementación slots |
| Presentation | `src/app/presentation/shared/services/availability.service.ts` | Cálculo disponibilidad |
| Presentation | `src/app/presentation/shared/services/business-state.service.ts` | Estado global |
| Presentation | `src/app/presentation/appointment/components/booking-form/` | UI de reserva |

### Estado Actual del Sistema

**Limitaciones identificadas:**
- `ReservedSlot` NO tiene `barberId` → slots son globales
- `Appointment.barber` es un `string` (nombre) → no hay ID de referencia
- `Barber` no tiene horario individual ni estado activo/inactivo
- `AvailabilityService` no considera barberos al calcular disponibilidad

---

## ✅ Pasos del Plan

### Fase 1: Preparación del Modelo de Datos

- [ ] **1.1 Extender entidad `Barber`**
  - Archivo: `src/app/domain/business-info/barber/barber.entity.ts`
  - Cambios:
    - `id: string` → obligatorio (usar ID de Firestore)
    - `schedule?: ScheduleDay[]` → horario individual (opcional, hereda del negocio si es null)
    - `isAvailable: boolean` → estado activo/inactivo
  - Actualizar DTO correspondiente

- [ ] **1.2 Añadir `barberId` a `ReservedSlot`**
  - Archivo: `src/app/domain/appointments/reserved-slot.entity.ts`
  - Cambios:
    - `barberId: string | null` → null = slot global (legacy/modo global)
  - Actualizar DTO correspondiente

- [ ] **1.3 Actualizar `Appointment.barber`**
  - Archivo: `src/app/domain/appointments/appointment.entity.ts`
  - Cambios:
    - Cambiar de `barber?: string` a `barberId?: string | null`
    - Mantener `barberName?: string` para display (opcional, denormalizado)

### Fase 2: Implementación del Patrón Strategy

- [ ] **2.1 Crear interfaz `BookingStrategy`**
  - Archivo nuevo: `src/app/application/appointments/strategies/booking.strategy.ts`
  - Método: `execute(appointment: Appointment, context: BookingContext): Promise<BookingResult>`

- [ ] **2.2 Implementar `GlobalBookingStrategy`**
  - Archivo nuevo: `src/app/application/appointments/strategies/global-booking.strategy.ts`
  - Lógica: Extraer la lógica actual de `AddAppointmentUseCase`

- [ ] **2.3 Implementar `BarberBookingStrategy`**
  - Archivo nuevo: `src/app/application/appointments/strategies/barber-booking.strategy.ts`
  - Lógica:
    - Validar que el barbero esté disponible en el slot
    - Crear `ReservedSlot` con `barberId`
    - Permitir múltiples citas en el mismo horario si hay barberos libres

- [ ] **2.4 Crear `BookingStrategyFactory`**
  - Archivo nuevo: `src/app/application/appointments/strategies/booking-strategy.factory.ts`
  - Lógica: Recibe `barberSelection: boolean`, devuelve la estrategia correcta

- [ ] **2.5 Refactorizar `AddAppointmentUseCase`**
  - Archivo: `src/app/application/appointments/add-appointment.use-case.ts`
  - Cambios:
    - Inyectar `BookingStrategyFactory`
    - Delegar lógica de reserva a la estrategia
    - Mantener validaciones comunes (fecha no pasada, servicio válido, etc.)

### Fase 3: Actualización de Infraestructura

- [ ] **3.1 Actualizar `FirebaseScheduleRepository`**
  - Archivo: `src/app/infrastructure/firebase/firebase-schedule.repository.ts`
  - Cambios:
    - `getSlotsByBarber(barberId: string): Observable<ReservedSlot[]>`
    - `addSlot(slot: ReservedSlot)` → persistir `barberId`

- [ ] **3.2 Actualizar `FirebaseBarberRepository`**
  - Archivo: `src/app/infrastructure/firebase/firebase-barber.repository.ts`
  - Cambios:
    - Asegurar que `id` se persiste/recupera correctamente
    - Añadir `updateBarberAvailability(id, isAvailable)`

### Fase 4: Actualización de Servicios de Presentación

- [ ] **4.1 Extender `AvailabilityService`**
  - Archivo: `src/app/presentation/shared/services/availability.service.ts`
  - Cambios:
    - `getAvailableSlots(date)` → modo global (actual)
    - `getAvailableSlotsForBarber(date, barberId)` → modo multi-barbero
    - `getAvailableBarbersForSlot(date, time)` → barberos libres en un slot

- [ ] **4.2 Actualizar `BusinessStateService`**
  - Archivo: `src/app/presentation/shared/services/business-state.service.ts`
  - Cambios:
    - Signal `availableBarbers` computado según slots reservados

### Fase 5: Actualización de UI

- [ ] **5.1 Modificar `BookingFormComponent`**
  - Archivo: `src/app/presentation/appointment/components/booking-form/`
  - Cambios:
    - Si `barberSelection=true`:
      - Campo `barber` obligatorio
      - Filtrar barberos disponibles en el slot seleccionado
      - Mostrar indicador de disponibilidad por barbero
    - Si `barberSelection=false`:
      - Comportamiento actual (barbero opcional u oculto)

- [ ] **5.2 Actualizar `HourSelectorComponent`** (si aplica)
  - Mostrar disponibilidad visual por barbero cuando `barberSelection=true`

### Fase 6: Migración y Testing

- [ ] **6.1 Script de migración de datos**
  - Migrar `ReservedSlot` existentes: asignar `barberId` desde la cita asociada o marcar como `null`

- [ ] **6.2 Tests unitarios**
  - Testear ambas estrategias
  - Testear factory
  - Testear casos límite (todos los barberos ocupados, barbero inactivo, etc.)

---

## 🤔 Decisiones Pendientes

| # | Pregunta | Opciones | Decisión |
|---|----------|----------|----------|
| 1 | ¿Horario individual del barbero hereda del negocio? | A) Siempre hereda / B) Si es null hereda / C) Obligatorio definirlo | **Pendiente** |
| 2 | ¿Migración de datos existentes? | A) Marcar como null (legacy) / B) Asignar barberId desde la cita | **Pendiente** |
| 3 | ¿Transaccionalidad en Firebase? | A) Sí, usar runTransaction / B) No, mantener actual | **Pendiente** |

---

## 💡 Ideas Adicionales

> _Espacio para registrar nuevas ideas del usuario_

1. ...
2. ...
3. ...

---

## 📝 Notas para Otra IA

### Cómo usar este documento

1. **Lee primero** la sección "Contexto Técnico" para entender la arquitectura
2. **Revisa** los archivos clave listados antes de modificar
3. **Sigue el orden** de las fases (el modelo de datos DEBE estar listo antes del Strategy)
4. **Marca los checkboxes** conforme completes cada paso
5. **Documenta decisiones** en la tabla de "Decisiones Pendientes"

### Reglas del proyecto (de `.github/copilot-instructions.md`)

- **Clean Architecture:** Presentation NUNCA habla con Infrastructure directamente
- **Angular 19:** Usa Signals, `@if/@for`, standalone components
- **Multi-tenancy:** SIEMPRE incluir `tenantId` en queries de Firestore
- **Tipado estricto:** `any` está PROHIBIDO
- **Inyección de dependencias:** Inyectar interfaces, no implementaciones

### Comandos útiles

```bash
# Arrancar el proyecto
ng serve

# Build de producción
ng build --configuration production

# Ver estructura de carpetas
tree src/app -L 3