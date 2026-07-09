## MedNow

MedNow es una plataforma web para la gestión médica de pacientes. Permite solicitar turnos, acceder a un mapa de guardias y farmacias en caso de emergencia, y realizar consultas médicas mediante un sistema de triage asistido por inteligencia artificial.

El sistema integra un chatbot de IA (**AlivIA**) que analiza las consultas del paciente y, cuando el caso lo amerita o el paciente lo solicita, **deriva la conversación a un profesional médico**, que continúa la atención en un chat en tiempo real.

---

## Features

- Gestión de turnos médicos (reserva, cancelación e historial)
- Cálculo de horarios disponibles reales según la disponibilidad y sede del médico
- Búsqueda de profesionales por nombre, especialidad, sede y obra social
- Mapa interactivo de guardias médicas y farmacias, con rutas para llegar
- Chatbot de IA para triage médico con **escalamiento automático a médico humano**
- Chat en tiempo real entre paciente y médico (con envío de imágenes)
- Ficha clínica del paciente con bitácora de modificaciones (historial de cambios)
- Recordatorios de turno por email (24 h antes)
- Foto de perfil y perfiles diferenciados por rol

---

## Tipos de usuario

### Paciente

- Registro con datos personales y perfil extendido (género, fecha de nacimiento, email, número de afiliado)
- Ficha clínica (enfermedades, alergias, antecedentes, etc.)
- Reserva y cancelación de turnos
- Uso del chatbot de triage y chat con médicos derivados
- Acceso al mapa de emergencias

### Médico

- Registro profesional
- Configuración de especialidades, sedes y obras sociales que atiende
- Configuración de disponibilidad horaria por sede
- Visualización y gestión de turnos
- Atención de pacientes vía chat, incluidas las consultas derivadas por la IA

> El acceso a acciones sensibles (reservar turno, publicar disponibilidad) exige tener el **perfil completo**.

---

## Arquitectura

Aplicación web de **tres capas** desacopladas:

- **Frontend (SPA)** → interfaz para pacientes y médicos.
- **Backend (API REST)** → lógica de negocio, autenticación y orquestación de la IA. Organizado en capas: `routes → controllers → services → middleware → config`.
- **Base de datos (PostgreSQL / Supabase)** → almacenamiento de usuarios, turnos, ficha clínica, chats y centros de emergencia.

Flujo de triage con IA:

```
Paciente → Chatbot AlivIA (Gemini)
                │
                ├─ Consulta liviana → responde y orienta
                │
                └─ Caso que amerita atención / pedido explícito
                        → marcador [DERIVAR] + resumen
                        → se crea una derivación pendiente
                        → un médico la acepta
                        → se abre un chat en tiempo real médico–paciente
```

Servicios de apoyo del backend:

- Integración con **Google Gemini** vía API REST para el triage (con capacidad de análisis de imágenes).
- **Supabase Storage** para las imágenes del chat.
- Tarea programada (cron interno) que envía **recordatorios de turno por email**.

---

## Tecnologías

**Frontend**
- React 19 + TypeScript
- Vite
- React Router
- Leaflet / react-leaflet (mapa de emergencias)
- Cliente Supabase JS (login con Google/OAuth, chat en tiempo real vía Supabase Realtime y Storage)

**Backend**
- Node.js + Express 5
- Prisma ORM 7 (adaptador `@prisma/adapter-pg`) y cliente Supabase JS
- Autenticación propia con **JWT** (`jsonwebtoken`) + **bcryptjs** para el hasheo de contraseñas
- Helmet y CORS para seguridad HTTP
- Nodemailer para el envío de emails
- Integración con la API de Google Gemini (`gemini-2.5-flash-lite`)

**Base de datos**
- PostgreSQL, gestionado con Supabase

**IA**
- Google Gemini (modelo `gemini-2.5-flash-lite`), con soporte de texto e imágenes

---

## Seguridad

- Contraseñas hasheadas con bcrypt.
- Autenticación por token **JWT** (expira a las 8 h) verificado en cada request protegido.
- Middlewares de autorización por **rol** y de **propiedad del recurso** (un paciente no puede operar sobre datos de otro, etc.).
- Cabeceras de seguridad con Helmet y CORS restringido por lista de orígenes permitidos.

---

## Modelo de datos (principales tablas)

`profiles`, `medicos`, `pacientes`, `paciente_perfil`, `medico_obras_sociales`, `turnos`, `disponibilidad`, `centros_emergencia`, `chat_rooms`, `mensajes`, `derivaciones_pendientes`, `ficha_medica_historial`.

El esquema completo está definido en `backend/prisma/schema.prisma`.

---

## Variables de entorno (backend)

Crear un archivo `backend/.env` con:

```env
# Servidor
PORT=3000

# Autenticación
JWT_SECRET=tu_secreto

# Supabase (proyecto principal)
SUPABASE_URL=...
SUPABASE_KEY=...

# Supabase (proyecto de sedes/perfiles) — si no se define, usa el principal
SUPABASE_SEDES_URL=...
SUPABASE_SEDES_KEY=...

# Prisma (conexión directa a PostgreSQL)
DATABASE_URL=postgresql://...

# IA
GEMINI_API_KEY=...

# Email (recordatorios de turno)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

El frontend requiere `frontend/.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Correr el proyecto

### Backend
```bash
cd backend
npm install
npm run dev
```
Corre en: http://localhost:3000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Corre en: http://localhost:5173
