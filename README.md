## MedNow
MedNow es una plataforma web diseñada para facilitar la gestión médica de pacientes. Permite solicitar turnos, acceder a información sobre guardias y farmacias en caso de emergencia, y realizar consultas médicas mediante un sistema de triage asistido por inteligencia artificial.

El sistema integra un chatbot que analiza las consultas del paciente y, en caso de ser necesario, deriva la conversación a un profesional médico, quien continúa la atención en tiempo real.

---

## Features

- Gestión de turnos médicos
- Búsqueda de profesionales por:
  - Nombre
  - Especialidad
- Acceso a mapa de:
  - Guardias médicas
  - Farmacias 24h
  - Rutas para llegar
- Chatbot de IA para triage médico con escalamiento automático a médico
- Historial clínico del paciente

---

## Tipos de usuario

### Paciente

- Registro con datos personales
- Acceso a historial clínico (enfermedades, alergias, etc.)
- Reserva y cancelación de turnos
- Uso del chatbot de triage
- Acceso a mapa de emergencias

---

### Médico

- Registro profesional
- Configuración de especialidades
- Gestión de sedes donde atiende
- Visualización y gestión de turnos
- Atención de pacientes vía chat
- Intervención en consultas derivadas por IA

---

## Arquitectura

- Chatbot IA → primer nivel de atención (triage)
- Backend → gestión de datos
- Base de datos → almacenamiento de usuarios, turnos e historial clínico
- Frontend → interfaz para pacientes y médicos

---

## Tecnologías

- Frontend: React + TypeScript  
- Backend: Node.js / Express  
- Base de datos: MongoDB
