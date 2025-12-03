# Arquitectura del proyecto

## Visión general

- Proyecto **Angular standalone** (sin `AppModule`), configurado vía `app.config.ts` y `app.routes.ts`.
- Renderizado **SSR** con `@angular-devkit/build-angular:application` y entrada `src/server.ts`.
- Backend de datos en **Firebase** (Auth, Firestore, Storage) usando `@angular/fire`.
- Arquitectura **en capas / Clean Architecture** dentro de `src/app`:
	- `domain/` – modelo de dominio y tipos.
	- `application/` – casos de uso y puertos (repositorios).
	- `infrastructure/` – implementaciones concretas (Firebase, etc.).
	- `presentation/` – componentes de UI por feature.
	- `shared/` – servicios Angular y utilidades transversales.
    - `services/` – carpeta en desuso, en proceso de transición.

## Bootstrapping y configuración

- Entrada principal: `src/main.ts`.
- Configuración de la app: `src/app/app.config.ts`:
	- `provideRouter(routes)` con rutas definidas en `app.routes.ts` / `app.routes.server.ts`.
	- `provideZoneChangeDetection({ eventCoalescing: true })`.
	- `provideClientHydration()` para SSR + hidratación.
	- Configuración de Firebase:
		- `provideFirebaseApp(() => initializeApp({...}))`
		- `provideAuth(() => getAuth())`
		- `provideFirestore(() => getFirestore())`
		- `provideStorage(() => getStorage())`
	- Inyección de repositorios de dominio:
		- `AppointmentRepository` → `FirebaseAppointmentRepository`
		- `BusinessInfoRepository` → `FirebaseBusinessInfoRepository`
		- `ServiceRepository` → `FirebaseServiceRepository`
		- `GalleryRepository` → `FirebaseGalleryRepository`

## Capas de la arquitectura (`src/app`)

### 1. `domain/` (Dominio)

- Contiene **entidades, value objects, tipos y contratos de dominio**.
- Subcarpetas por subdominio:
	- `appointments/` – entidad de cita, tipos (`appointment.entity.ts`, `appointment.types.ts`).
	- `business-info/` – datos del negocio (horarios, datos de contacto, etc.).
	- `gallery/` – fotos y metadatos.
	- `services/` – servicios de peluquería (cortes, arreglos, etc.).
	- `shared/` – tipos y utilidades comunes de dominio.
- No depende de Angular ni de Firebase: aquí van las **reglas de negocio puras**.

### 2. `application/` (Casos de uso)

- Implementa **use cases** y **puertos (interfaces de repositorio)**.
- Estructura por subdominio:
	- `appointments/`
		- Use cases como:
			- `add-appointment.use-case.ts`
			- `delete-appointment.use-case.ts`
			- `get-appointment-by-date-range.use-case.ts`
			- `get-appointment-by-id.use-case.ts`
			- `get-appointments-by-date.use-case.ts`
			- `get-appointments.use-case.ts`
			- `update-appointment.use-case.ts`
		- `appointment.repository.interface.ts` define el puerto que deben implementar las infraestructuras.
	- `business/`
		- Información del negocio (`business-info/`) y horarios (`schedule/`).
		- Repositorios y casos de uso relacionados con la configuración del negocio.
	- `gallery/`
		- `get-photos.use-case.ts`, `upload-photo.use-case.ts`, `delete-photo.use-case.ts`.
		- `gallery.repository.interface.ts`.
	- `services/`
		- `create-service.use-case.ts`
		- `delete-service.use-case.ts`
		- `get-services.use-case.ts`
		- `update-service.use-case.ts`
		- `service.repository.interface.ts`.
- Puede depender de `domain/`, pero no de `presentation/` ni de Firebase.
- Se expone un `index.ts` para agrupar exports por subdominio.

### 3. `infrastructure/` (Infraestructura)

- `infrastructure/firebase/` contiene las **implementaciones concretas de los repositorios** usando Firebase.
- Ejemplo: `FirebaseAppointmentRepository` implementa `AppointmentRepository` y se registra en `app.config.ts`.
- Capa encargada de:
	- Acceso a Firestore (CRUD de citas, servicios, etc.).
	- Acceso a Storage para fotos de la galería.
	- Adaptación de modelos de dominio ↔ modelos de persistencia.

### 4. `presentation/` (Capa de UI)

- Organización **por feature / página**:
	- `home/`, `about-us/`, `barbers-info/`, `services-info/`
	- `appointment/` (flujo de reserva de cita)
	- `admin-panel/` (gestión interna)
	- `location-and-contact/`, `opinions/`, `photo-of-the-day/`, etc.
	- `header/`, `footer/`, `legal/`, `login/`, `faq/`…
- Cada carpeta de feature suele contener:
	- Componentes standalone con sus HTML/SCSS.
	- Lógica de presentación específica (formularios, eventos de usuario, etc.).
- La UI consume los casos de uso de `application/` a través de servicios Angular o directamente vía inyección de repositorios/use cases, según la necesidad.

### 5. `services/` (Servicios Angular de aplicación)

- En esta carpeta se encuentra la antigua arquitectura, donde estaban todos los servicios juntos, ahora repartidos en la lógica de dominio.

### 6. `shared/` (Recursos compartidos de presentación)

- Servicios y utilidades de uso transversal:
	- `authentication.service.ts` – gestión de autenticación (envolviendo Firebase Auth y lógica propia).
	- `booking-preselection.service.ts` – estado temporal de la reserva (peluquero, fecha, servicio).
- Componentes y otros recursos compartidos:
	- `alert/` – componentes de alerta / feedback visual reutilizable.
	- `pipes/` – pipes personalizados reutilizados en varias vistas.
- Todo lo que es **presentación reusable** (no dominio puro) vive aquí.

## Rutas y navegación

- Definidas en `app.routes.ts` (cliente) y `app.routes.server.ts` (SSR).
- Uso de **Angular Router** con componentes standalone por página/feature.
- Posible lazy loading por features (según cómo estén declaradas las rutas):
	- Cada carpeta de `presentation/` puede mapearse a una ruta (`/`, `/cita`, `/servicios`, `/admin`, etc.).
- La capa de routing no accede directamente a infraestructura: solamente a componentes y servicios.

## Estilos y assets

- Estilos globales en `src/styles.scss`.
- SCSS con variables y mixins en `src/assets/styles/_variables.scss` y `_mixins.scss`.
- Assets estáticos en `src/assets/` (por ejemplo, imágenes de pelo en `hair-length/`).
- Documentación legal duplicada:
	- Markdown en `docs/legal/`
	- HTML servible en `src/assets/legal/`.

## Firebase e integración externa

- Configuración directa en `app.config.ts` con `initializeApp`.
- Módulos utilizados:
	- Auth (`getAuth` + `provideAuth`) – autenticación de usuarios (login, panel admin, etc.).
	- Firestore (`getFirestore` + `provideFirestore`) – almacenamiento de citas, servicios, información del negocio, etc.
	- Storage (`getStorage` + `provideStorage`) – subida de fotos (galería, foto del día…).
- Los repositorios de `infrastructure/firebase/` traducen las llamadas de `application/` a operaciones concretas de Firebase.

## Patrones clave y cómo usarlos en nuevos desarrollos

- **Nuevo caso de uso**:
	1. Define entidad / tipos en `domain/<subdominio>/`.
	2. Crea o amplía la interfaz de repositorio en `application/<subdominio>/<...>.repository.interface.ts`.
	3. Implementa el caso de uso en `application/<subdominio>/*.use-case.ts`.
	4. Añade la implementación en `infrastructure/firebase/...` (o la que toque).
	5. Registra la implementación en `app.config.ts` con `provide: XRepository, useClass: FirebaseXRepository`.
	6. Consume el caso de uso desde `presentation/` vía servicio Angular o inyección directa.

- **Nueva pantalla / feature de UI**:
	1. Crea carpeta en `presentation/<feature>/`.
	2. Crea componente(s) standalone con su HTML/SCSS.
	3. Añade la ruta correspondiente en `app.routes.ts`.
	4. Usa servicios de `services/` o casos de uso de `application/` para obtener datos.

- **Refactorización de lógica antigua**:
    1. Comparar lógica actual (antigua) con lógica ya existente en `domain/` y casos de uso en `application/`.
    2. Si existe ya dicha lógica en las carpetas, borrar la actual y utilizar la correcta.
    3. Si no existe, seguir los pasos de un nuevo caso de uso (o añadir lógica de dominio si solo se necesita eso). 

- **Reglas generales**
    1. Usar siempre buenas prácticas de TS, HTML y CSS (o SCSS).
    2. Optimizar la lógica todo lo posible, hacerla lo más compacta y a su vez eficiente.
    3. Usar sintaxis y buenas prácticas de Angular 19.
    4. Seguir los principios del buen programador.