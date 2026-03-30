# Documentación Técnica: Arquitectura de Base de Datos (MedNow)

**Proyecto:** MedNow  
**Versión:** 1.0.0  
**Tecnología:** PostgreSQL / Supabase  
**Estado:** Implementación de Autenticación y Perfiles

## 1. Resumen Ejecutivo
La persistencia de datos de MedNow se basa en un modelo relacional gestionado a través de Supabase. El sistema utiliza el esquema de autenticación nativo para la gestión de credenciales y un esquema público para la lógica de negocio, vinculados mediante el identificador único universal (UUID) del usuario.

## 2. Modelo de Datos (Esquema Público)

### 2.1 Tabla: `profiles`
Repositorio central de información de identidad para todos los usuarios.
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, FK (auth.users) | Identificador único del sistema de auth. |
| `nombre_apellido` | TEXT | NOT NULL | Nombre legal completo. |
| `dni` | TEXT | UNIQUE, NOT NULL | Documento Nacional de Identidad. |
| `tipo_usuario` | TEXT | CHECK ('medico', 'paciente') | Rol asignado al usuario. |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Marca de tiempo de registro. |

### 2.2 Tabla: `medicos`
Entidad de especialización para el rol profesional.
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, FK (profiles.id) | Referencia al perfil base. |
| `especialidades` | TEXT[] | - | Listado de competencias médicas. |
| `sedes` | TEXT[] | - | Centros de atención habilitados. |
| `recibir_turnos` | BOOLEAN | DEFAULT TRUE | Estado de disponibilidad en el sistema. |

### 2.3 Tabla: `pacientes`
Entidad de especialización para el rol de usuario final.
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, FK (profiles.id) | Referencia al perfil base. |
| `obra_social` | TEXT | - | Entidad de cobertura médica. |
| `ficha_medica` | JSONB | - | Datos clínicos (alergias, antecedentes, etc). |

### 2.4 Tabla: `turnos`
Gestión de citas y trazabilidad de consultas.
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | PRIMARY KEY | Identificador incremental. |
| `paciente_id` | UUID | FK (pacientes.id) | Usuario que solicita el turno. |
| `medico_id` | UUID | FK (medicos.id) | Profesional asignado. |
| `fecha_hora` | TIMESTAMPTZ | NOT NULL | Cronograma de la cita. |
| `estado` | TEXT | CHECK ('pendiente', 'completado', 'cancelado') | Situación actual del turno. |
| `notas_triage` | TEXT | - | Reporte generado por el chatbot de IA. |

## 3. Lógica de Servidor y Automatización

Para optimizar el flujo de registro, se ha implementado un disparador (Trigger) a nivel de base de datos.

**Función:** `handle_new_user()`  
**Disparador:** `on_auth_user_created`  

Este mecanismo intercepta la creación de un registro en `auth.users`, extrae los metadatos enviados desde el cliente e inserta de forma atómica la información en `profiles` y en la tabla de rol correspondiente (`medicos` o `pacientes`).

## 4. Protocolo de Integración (Frontend)

El cliente de la aplicación debe suministrar obligatoriamente los metadatos en el objeto `data` durante el proceso de registro (`signUp`) para asegurar la integridad de las relaciones.

### Ejemplo: Registro de Paciente
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@proveedor.com',
  password: 'password_segura',
  options: {
    data: {
      nombre_apellido: 'Juan Pérez',
      dni: '20123456',
      tipo_usuario: 'paciente',
      obra_social: 'OSDE'
    }
  }
});
