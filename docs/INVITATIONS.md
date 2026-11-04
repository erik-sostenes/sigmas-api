# Flujo de Invitación de Usuarios, Roles y Actividades (Clerk + MariaDB)

Este documento describe el contrato entre el frontend (`sigmas`) y el backend (`sigmas-api`) para consultar los catálogos de asignación, enviar invitaciones de usuario desde el panel de Administración y sincronizar el alta en MariaDB mediante el webhook de Clerk.

---

## 1. Reglas de negocio y fuente de verdad

1. **Fuente de verdad de roles**: la tabla `roles` en MariaDB define los códigos estables (`code`) y las etiquetas visibles (`name`):
   | `code` | `name` (etiqueta) | `requiresActivities` |
   |---|---|---|
   | `solicitante` | Solicitante | `false` |
   | `lider_actividad` | Líder de actividad | `true` |
   | `suficiencia_presupuestal` | Suficiencia presupuestal | `false` |
   | `recursos_materiales` | Recursos materiales y servicios | `false` |
   | `servicios_administrativos` | Servicios administrativos | `false` |
   | `admin` | Administrador | `false` |
2. **Múltiples roles por usuario**: un usuario puede tener uno o más roles en `user_roles` (por ejemplo, `["solicitante"]` para un solicitante que no es líder, o `["solicitante", "lider_actividad"]` para un solicitante que además es líder de actividad).
3. **Asignación de actividades**:
   - Una actividad (`activities`) **solo puede tener un líder** (`leader_id`), pero un mismo líder puede ser responsable de varias actividades.
   - **Solo** se permite enviar `activityCodes` cuando `roleCodes` incluye `"lider_actividad"`.
   - Si `roleCodes` incluye `"lider_actividad"`, es obligatorio seleccionar **al menos una** actividad (`activityCodes.length >= 1`).
   - Si `roleCodes` **no** incluye `"lider_actividad"` (p. ej. un solicitante normal), `activityCodes` debe omitirse o enviarse vacío (`[]`).
4. **Protección contra sobrescritura de líderes**: ni el endpoint de invitación ni el webhook de Clerk reasignan silenciosamente una actividad que ya pertenece a otro líder. Si una actividad ya tiene líder, el backend responde `409 Conflict`.

---

## 2. Contrato de Endpoints

### 2.1 Obtener catálogos para el formulario de administración

- **Método y ruta**: `GET /api/v1/admin/user-assignment-options`
- **Autenticación y autorización**: `Authorization: Bearer <clerk_session_token>`. Requiere que el usuario autenticado esté activo y tenga el rol `admin` en MariaDB (o a través de `ADMIN_CLERK_METADATA_FALLBACK=true` durante la transición inicial).

#### Ejemplo de petición
```http
GET /api/v1/admin/user-assignment-options HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

#### Respuesta exitosa (`200 OK`)
```json
{
  "departments": [
    {
      "id": 1,
      "name": "DIRECCIÓN GENERAL"
    },
    {
      "id": 3,
      "name": "INVESTIGACIÓN Y POSGRADO"
    },
    {
      "id": 23,
      "name": "SOPORTE TÉCNICO"
    }
  ],
  "roles": [
    {
      "id": 1,
      "code": "solicitante",
      "name": "Solicitante",
      "requiresActivities": false
    },
    {
      "id": 2,
      "code": "lider_actividad",
      "name": "Líder de actividad",
      "requiresActivities": true
    },
    {
      "id": 3,
      "code": "suficiencia_presupuestal",
      "name": "Suficiencia presupuestal",
      "requiresActivities": false
    },
    {
      "id": 4,
      "code": "recursos_materiales",
      "name": "Recursos materiales y servicios",
      "requiresActivities": false
    },
    {
      "id": 5,
      "code": "servicios_administrativos",
      "name": "Servicios administrativos",
      "requiresActivities": false
    },
    {
      "id": 6,
      "code": "admin",
      "name": "Administrador",
      "requiresActivities": false
    }
  ],
  "components": [
    {
      "id": 1,
      "code": "C1",
      "name": "ESTUDIANTES DEL NIVEL SUPERIOR DE EDUCACIÓN EN INSTITUCIONES PÚBLICAS FORMADOS",
      "activities": [
        {
          "id": 1,
          "code": "C1A1",
          "name": "SEGUIMIENTO AL PROCESO DE SERVICIO SOCIAL, RESIDENCIAS O ESTADÍAS PROFESIONALES E INTERNADO DE PREGRADO DEL ESTUDIANTADO",
          "currentLeader": null
        },
        {
          "id": 2,
          "code": "C1A2",
          "name": "ELABORACIÓN DE ESTUDIOS DE PERTINENCIA Y FACTIBILIDAD DE LA OFERTA EDUCATIVA DE EDUCACIÓN SUPERIOR",
          "currentLeader": {
            "id": "6f9a0e40-8b2d-11ef-9a1c-0242ac120002",
            "title": "Mtro.",
            "email": "alopez@placeholder.edu.mx"
          }
        }
      ]
    }
  ]
}
```
> **Recomendación para el Frontend**:
> - Mostrar `departments` en un `<Select>` enviando `department.id` como `departmentId`.
> - Mostrar `roles` como lista de checkboxes enviando `role.code` dentro de `roleCodes`.
> - Mostrar el selector de actividades agrupado por `components` **solo cuando** el checkbox con `code === "lider_actividad"` (`requiresActivities: true`) esté marcado.
> - Deshabilitar en la UI las actividades donde `currentLeader !== null` mostrando qué líder las tiene asignadas (`currentLeader.email`).

---

### 2.2 Crear y enviar invitación

- **Método y ruta**: `POST /api/v1/invitations`
- **Autenticación y autorización**: `Authorization: Bearer <clerk_session_token>` (solo rol `admin`).

#### Ejemplo A: Invitar a un solicitante que NO es líder de actividad
```json
{
  "email": "ana.torres@itsoeh.edu.mx",
  "departmentId": 3,
  "title": "Mtra.",
  "roleCodes": ["solicitante"]
}
```

#### Ejemplo B: Invitar a un solicitante que también es líder de actividad
```json
{
  "email": "bernardo.angeles@itsoeh.edu.mx",
  "departmentId": 11,
  "title": "Ing.",
  "roleCodes": ["solicitante", "lider_actividad"],
  "activityCodes": ["C1A1", "C4A1"]
}
```

#### Respuesta exitosa (`201 Created`)
```json
{
  "message": "Invitación enviada correctamente"
}
```

#### Códigos de error posibles en `POST /api/v1/invitations`
| Código HTTP | `error` | Cuándo ocurre |
|---|---|---|
| `400 Bad Request` | `BadRequestException` / `InvalidInvitationError` | Formato inválido en correo, `departmentId`, `title`, arreglos vacíos o códigos duplicados. |
| `401 Unauthorized` | `UnauthorizedException` | Falta token Bearer o el token de Clerk expiró / no es válido. |
| `403 Forbidden` | `ForbiddenException` | El usuario autenticado no tiene el rol `admin`. |
| `409 Conflict` | `InvitationUserAlreadyExistsError` | Ya existe un usuario en MariaDB con ese `email`. |
| `409 Conflict` | `InvitationActivityAlreadyHasLeaderError` | Alguna actividad en `activityCodes` ya tiene un líder asignado. |
| `422 Unprocessable Entity` | `InvalidInvitationActivitiesRoleError` | Se enviaron `activityCodes` sin incluir `"lider_actividad"` en `roleCodes`. |
| `422 Unprocessable Entity` | `LeaderInvitationRequiresActivitiesError` | Se incluyó `"lider_actividad"` pero `activityCodes` está vacío. |
| `422 Unprocessable Entity` | `InvitationDepartmentNotFoundError` | `departmentId` no existe o está inactivo. |
| `422 Unprocessable Entity` | `InvitationRolesNotFoundError` | Algún código en `roleCodes` no existe en la tabla `roles`. |
| `422 Unprocessable Entity` | `InvitationActivitiesNotFoundError` | Algún código en `activityCodes` no existe en la tabla `activities`. |
| `502 Bad Gateway` | `ClerkInvitationError` | Clerk rechazó o falló al crear la invitación. |

---

### 2.3 Webhook de Clerk (`POST /api/v1/user/webhook/clerk`)

- **Evento procesado**: `user.created` (otros tipos de evento devuelven `200 OK` con `{ "success": true, "ignored": true }`).
- **Cabeceras requeridas**: `svix-id`, `svix-timestamp`, `svix-signature`.
- **Metadatos esperados en `data.public_metadata`**:
  ```json
  {
    "departmentId": 11,
    "title": "Ing.",
    "roleCodes": ["solicitante", "lider_actividad"],
    "activityCodes": ["C1A1", "C4A1"]
  }
  ```
- **Comportamiento transaccional e idempotencia**:
  - Todo ocurre dentro de una transacción con bloqueo de filas (`FOR UPDATE`).
  - Si Clerk reintenta el mismo evento `user.created` para el mismo `clerk_id`, el backend actualiza los datos básicos del usuario, mantiene sus roles en `user_roles` (`INSERT IGNORE` aditivo, sin borrar otros roles previos) y conserva sus actividades sin arrojar conflicto consigo mismo.
  - Si entre el envío de la invitación y la aceptación otra persona fue asignada como líder de una de las actividades, la transacción hace `rollback` completo y responde `409 Conflict` (`ActivityAlreadyHasLeaderError`).

#### Cómo resolver una invitación que entra en conflicto (`409 Conflict`)
1. Si la actividad sigue ocupada por un usuario `placeholder_%` de pruebas, en desarrollo puedes liberar los líderes placeholder con `db/dev/release-placeholder-leaders.sql` o liberar la actividad específica:
   ```sql
   UPDATE activities SET leader_id = NULL WHERE code = 'C1A1';
   ```
2. Una vez liberada la actividad en MariaDB, ve al **Clerk Dashboard -> Webhooks -> Endpoints -> tu endpoint**, localiza el evento `user.created` fallido y haz clic en **Replay** (o espera el siguiente reintento automático de Svix).

---

## 3. Transición de Administradores (Clerk -> MariaDB)

Para evitar bloquear a los administradores actuales que solo tienen `{"role": "admin"}` en Clerk y aún no están en la tabla `users` de MariaDB:

1. Durante la transición inicial puedes activar en `.env`:
   ```env
   ADMIN_CLERK_METADATA_FALLBACK=true
   ```
2. Registra tu usuario administrador en MariaDB (reemplazando `user_2abc...` por tu `User ID` real de Clerk y tu correo):
   ```sql
   INSERT INTO users (clerk_id, department_id, title, email, is_active)
   VALUES (
     'user_2abcTU_CLERK_ID_REAL',
     (SELECT id FROM departments WHERE name = 'DIRECCIÓN GENERAL' LIMIT 1),
     'Ing.',
     'tu.correo@itsoeh.edu.mx',
     TRUE
   );

   INSERT IGNORE INTO user_roles (user_id, role_id)
   VALUES (
     (SELECT id FROM users WHERE clerk_id = 'user_2abcTU_CLERK_ID_REAL'),
     (SELECT id FROM roles WHERE code = 'admin')
   );
   ```
3. Cambia `ADMIN_CLERK_METADATA_FALLBACK=false` en `.env`.

