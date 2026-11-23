# Cambios de API: solicitudes de compra

Bitácora de los cambios de contrato que el frontend tiene que conocer. Cada entrada explica **qué cambió**, **por qué** y **qué tiene que hacer el front**.

- **Rama:** `feat/purchase-requests-flujo-lideres` en `sigmas-api`.
- **Reglas de negocio** (roles, flujo, quién ve qué): [`BUSINESS_RULES.md`](BUSINESS_RULES.md). Léelo primero: todos los cambios de aquí salen de esas reglas.
- **Leyenda:** ✅ ya está en la rama · 🔜 planeado, el contrato puede cambiar

---

## Resumen para el front

| Endpoint | Estado | Cambio |
|---|---|---|
| `POST /api/v1/purchase-requests` | ✅ | El body ya **no lleva `requestedBy`**. Solo puede crear quien tiene el rol `solicitante`. Errores nuevos |
| `GET /api/v1/purchase-requests` y `/:id` | ✅ | **Eliminados.** También se fueron `scope` e `isRequester` |
| `GET /api/v1/purchase-requests/{mine,leader,sufficiency,resources}` y `/:id` | ✅ | Rutas nuevas, una por sección. La respuesta trae nombres y claves |
| `POST .../leader/:id/rows/:rowId/decision` | ✅ | Nuevo. El líder aprueba o rechaza una fila |
| `POST .../sufficiency/:id/decision` | ✅ | Nuevo. Suficiencia autoriza o rechaza (primera revisión) |
| `productItems` en todas las respuestas | ✅ | Ahora salen **en el orden en que se capturaron** |
| Catálogo de estados | ✅ | Se quitó `RECHAZA_RECURSOS` y hay 7 estados nuevos |

---

## Conceptos que cambian cómo funciona el front

### El backend decide qué ve cada usuario

- El usuario **siempre** sale del token de Clerk. El front **nunca** manda `userId`, `requestedBy`, `scope` ni banderas que amplíen lo que un usuario puede ver.
- **Los roles se validan contra la base de datos**, no contra la metadata del token.
  - El front puede seguir usando la metadata para decidir qué secciones mostrar.
  - Pero si la metadata y la base de datos no coinciden, el backend responde 403. Es deuda técnica conocida: hoy no se sincroniza la metadata cuando el admin cambia roles.
- **Una sección del front = una ruta del backend = un rol.** No se combinan. Si un usuario tiene dos roles, ve dos secciones.
- Todas las rutas de `/purchase-requests` exigen que el usuario exista en la base de datos y esté activo. Si no, responden 403.

### Respuestas de error

Los errores de negocio tienen este formato:

```json
{ "statusCode": 422, "error": "ActivityWithoutLeaderError", "message": "La actividad 2 no tiene un líder activo asignado; no se puede incluir en la solicitud." }
```

- Usa **`error`** para decidir qué hacer en el front: es el nombre del error, y es estable.
- `message` viene en español y está pensado para mostrarse al usuario.

Hay otros dos formatos que no vienen de los errores de negocio:

| Origen | Formato | Ejemplo |
|---|---|---|
| Validación del body o del query (`ValidationPipe`) | `message` es un **arreglo** de textos | `{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }` |
| Guards (sin rol, usuario no registrado) | `error` es `"Forbidden"` | `{ "statusCode": 403, "message": "...", "error": "Forbidden" }` |

---

## ✅ Fase 0: Esquema de base de datos

`11930e7`

**Qué cambió**

- El catálogo de estados de una solicitud queda así (ver `BUSINESS_RULES.md`, sección 5):
  - Se **quitó** `RECHAZA_RECURSOS`, porque recursos materiales no rechaza.
  - Hay **7 estados nuevos**: `RECHAZA_SUFICIENCIA_FINAL`, `APRUEBA_REVISION`, `RECHAZA_REVISION`, `AUTORIZA_DIRECCION`, `RECHAZA_DIRECCION`, `APRUEBA_FISCAL` (fin exitoso) y `RECHAZA_FISCAL`.
- Una misma actividad ahora puede aparecer en varias filas, siempre que cada fila tenga una **fuente de financiamiento distinta**.
- Cada fila guarda a su líder y su decisión (`leader_status`).

**Qué hacer en el front**

- Si el front tiene una lista de estados para mostrar o filtrar, quitar `RECHAZA_RECURSOS` y agregar los nuevos.
- En el formulario de crear solicitud, permitir que la misma actividad se repita **con otra fuente de financiamiento**.
- Hay que recrear la base de datos local. Eso borra `users`: hay que volver a dar de alta a los usuarios de prueba.

## ✅ Fase 1: Roles y modelo de dominio

`cd4048d`

**Qué cambió**

- En las respuestas de `GET /api/v1/purchase-requests` y `/:id`, cada elemento de `components` trae un campo nuevo:

  ```json
  { "id": "…", "componentId": 1, "activityId": 1, "fundingSourceId": 1,
    "estimatedAmount": 500, "finalAmount": 0, "leaderStatus": "PENDIENTE" }
  ```

  `leaderStatus` puede valer `PENDIENTE`, `APROBADO` o `RECHAZADO`: es la decisión del líder **sobre esa fila**.

**Por qué**

- El líder aprueba fila por fila.
- Si **una** fila se rechaza, la solicitud completa pasa a `RECHAZA_LIDER`.
- Cuando **todas** las filas quedan aprobadas, pasa a `APRUEBA_LIDER`.

**Qué hacer en el front:** nada obligatorio, es un campo extra. Sirve para mostrar el avance de la aprobación por fila.

> En la fase 3 se eliminaron esas rutas y la forma de `components` cambió. Usa el contrato de la fase 3.

## ✅ Fase 2: Crear solicitud

`POST /api/v1/purchase-requests`

**Qué cambió**

- **El body ya no lleva `requestedBy`.** Si se manda, el backend responde 400, porque no acepta campos que no conoce. El solicitante es el usuario del token.
- Solo pueden crear usuarios con el rol **`solicitante`** en la base de datos. Cualquier otro usuario recibe 403.
- Cada fila de distribución queda ligada al **líder actual de su actividad**. Ese líder es el que la va a aprobar, aunque después se reasigne la actividad.

**Body**

```json
{
  "justification": "…",
  "isoIds": [1, 2],
  "requestComponents": [
    { "componentId": 5, "activityId": 12, "fundingSourceId": 1, "estimatedAmount": 500 },
    { "componentId": 4, "activityId": 3,  "fundingSourceId": 1, "estimatedAmount": 200 }
  ],
  "productItems": [
    { "budgetItemId": 7, "measurementUnitId": 1, "quantity": 5, "description": "…", "estimatedAmount": 700 }
  ]
}
```

- `estimatedAmount` de un producto es el **importe total de la línea, con impuestos incluidos**. No es un precio unitario.
- La suma de `requestComponents[].estimatedAmount` tiene que ser igual a la suma de `productItems[].estimatedAmount`, con tolerancia de $0.01.

**Respuesta:** `201 { "id": "<uuid>" }`

**Errores**

| HTTP | `error` | Cuándo | Qué mostrar o hacer |
|---|---|---|---|
| 400 | `Bad Request` (arreglo en `message`) | Body inválido, o trae `requestedBy` | Errores de cada campo |
| 400 | `ComponentsAmountMismatchError` | La suma de las filas no coincide con la de los productos | Pedir que se ajuste el reparto |
| 400 | `DuplicatedRequestComponentError` | Se repite componente + actividad + fuente | Avisar que esa combinación ya está |
| 400 | `MissingRequestComponentsError` / `MissingProductItemsError` | Falta al menos una fila o un producto | — |
| 403 | `Forbidden` | El usuario no tiene el rol `solicitante`, o no está registrado o está inactivo | — |
| 422 | `ActivityWithoutLeaderError` | La actividad **no tiene un líder activo** | La solicitud no se puede crear con esa actividad |
| 422 | `ActivityNotInComponentError` | La actividad no pertenece al componente elegido, o no existe | Revisar los selects de componente y actividad |
| 422 | `ComponentReferenceNotFoundError` | El componente o la fuente de financiamiento no existe | — |
| 422 | `ProductReferenceNotFoundError` | La partida o la unidad de medida no existe | — |
| 422 | `PurchaseRequestIsosNotFoundError` | Alguna norma ISO no existe | — |

**Qué hacer en el front**

- Quitar `requestedBy` del body.
- En el selector de actividad, mostrar solo las actividades del componente elegido.
- 🔜 Lo ideal es ofrecer **solo actividades que ya tengan líder**. Para eso hace falta un endpoint de catálogo que todavía no existe (pendiente del lado del admin). Mientras tanto, mostrar el mensaje de `ActivityWithoutLeaderError`.

---

## ✅ Fase 3: Bandejas, una ruta por sección

**Qué cambió**

Se eliminaron `GET /api/v1/purchase-requests` y `GET /api/v1/purchase-requests/:id`, el query param `scope` y el campo `isRequester`. En su lugar hay una ruta por sección:

| Ruta | Rol requerido | Qué solicitudes trae | Qué filas de distribución trae |
|---|---|---|---|
| `GET /api/v1/purchase-requests/mine` | `solicitante` | Las que creó el usuario, en cualquier estado | Todas |
| `GET /api/v1/purchase-requests/leader` | `lider_actividad` | Las que tienen al menos una fila de la que él es líder, en cualquier estado | **Solo las suyas** |
| `GET /api/v1/purchase-requests/sufficiency` | `suficiencia_presupuestal` | Desde `APRUEBA_LIDER` en adelante (no ve `SOLICITADO` ni `RECHAZA_LIDER`) | Todas |
| `GET /api/v1/purchase-requests/resources` | `recursos_materiales` | Desde `AUTORIZA_SUFICIENCIA` en adelante (no ve `RECHAZA_SUFICIENCIA`, pero sí `RECHAZA_SUFICIENCIA_FINAL`) | Todas |

- Cada ruta tiene su detalle: `/mine/:id`, `/leader/:id`, `/sufficiency/:id` y `/resources/:id`.
- **Los productos siempre vienen completos**, también para el líder.

**Por qué**

- Cada sección del front corresponde a un rol. El backend valida ese rol en la base de datos y filtra por el usuario del token.
- Con `scope`, el cliente elegía qué ver. Ahora el cliente solo elige la sección, y entrar a una sección exige tener su rol.
- El líder solo recibe sus filas porque **un líder no puede ver cuánto se le pide a otro**.

**Query params** (todos opcionales; solo reducen lo que la sección ya permite ver)

| Param | Rutas | Descripción |
|---|---|---|
| `page` | todas | Por defecto 1 |
| `limit` | todas | Por defecto 10, máximo 100 |
| `status` | todas | Estado de la solicitud |
| `search` | todas | Busca por folio (`requestNumber`). Máximo 20 caracteres |
| `leaderStatus` | solo `/leader` | `PENDIENTE`, `APROBADO` o `RECHAZADO`: estado **de las filas del líder** |

Para la bandeja de **"pendientes por decidir"** del líder, usa `GET /leader?status=SOLICITADO&leaderStatus=PENDIENTE`. Hay que mandar los dos filtros: con `leaderStatus=PENDIENTE` solo, también salen solicitudes que otro líder ya rechazó, porque ahí su fila se queda en `PENDIENTE`.

**Respuesta de un listado**

```json
{
  "data": [ /* PurchaseRequestView[] */ ],
  "meta": { "page": 1, "limit": 10, "total": 6, "totalPages": 1 }
}
```

**Respuesta de un detalle** (`PurchaseRequestView`; cada elemento de `data` tiene la misma forma)

```json
{
  "id": "uuid",
  "requestNumber": 2,
  "status": "APRUEBA_LIDER",
  "purchaseType": null,
  "justification": "…",
  "totalAmountEstimated": 100,
  "totalAmountFinal": 0,
  "requester": {
    "id": "uuid", "title": "Ing.", "firstName": "…", "lastName": "…", "email": "…",
    "department": { "id": 21, "name": "ARQUITECTURA" }
  },
  "isos": [ { "id": 1, "name": "ISO 9001:2015 Gestión de la Calidad" } ],
  "components": [
    {
      "id": "uuid de la fila",
      "component":          { "id": 1, "code": "01",   "name": "…" },
      "activity":           { "id": 1, "code": "01",   "name": "…" },
      "administrativeUnit": { "id": 1, "code": "1000", "name": "Dirección Académica" },
      "fundingSource":      { "id": 1, "code": "11",   "name": "Recurso Fiscal" },
      "estimatedAmount": 100,
      "finalAmount": 0,
      "leader": { "id": "uuid", "title": "L.C.", "firstName": "…", "lastName": "…" },
      "leaderStatus": "APROBADO",
      "leaderDecidedAt": "2026-11-23T08:01:06.000Z"
    }
  ],
  "productItems": [
    {
      "id": "uuid",
      "budgetItem": { "id": 1, "code": "200000", "name": "MATERIALES Y SUMINISTROS" },
      "measurementUnit": { "id": 1, "name": "Bulto" },
      "quantity": 2,
      "description": "…",
      "estimatedAmount": 100,
      "finalAmount": 0
    }
  ],
  "createdAt": "…",
  "updatedAt": "…"
}
```

Cambios respecto a la respuesta anterior:

- Se quitaron `requestedBy` (ahora es `requester.id`), `isoIds` (ahora es `isos`) e `isRequester`.
- `requester.departmentName` pasó a ser `requester.department.name`.
- En cada fila, `componentId`, `activityId` y `fundingSourceId` pasaron a ser objetos `{ id, code, name }`. Se agregaron `administrativeUnit`, `leader` y `leaderDecidedAt`.
- En cada producto, `budgetItemId` y `measurementUnitId` pasaron a ser objetos.
- Las filas vienen ordenadas por clave de componente, después de actividad y después de fuente.

**Errores**

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `Bad Request` | Query param inválido, o un `:id` que no es un UUID |
| 403 | `Forbidden` | El usuario no tiene el rol de esa sección, o no está registrado o está inactivo |
| 404 | `PurchaseRequestNotFoundError` | La solicitud no existe **o no entra en esa sección**. No se distinguen, para no revelar qué solicitudes existen |

**Qué hacer en el front**

- Cambiar cada pantalla a la ruta de su sección. Por ejemplo: "Mis solicitudes" usa `/mine`, la bandeja del líder usa `/leader` y la de suficiencia usa `/sufficiency`.
- Usar los nombres y claves que ya vienen en la respuesta. Ya no hace falta cruzar contra los catálogos.
- Para la cabecera del formato del líder (componente, actividad, unidad administrativa y presupuesto a afectar), usar sus filas en `components`.
- El área solicitante es `requester.department.name`.

## ✅ Fase 4: Decisiones de líderes y de suficiencia

### Decisión del líder sobre una fila

`POST /api/v1/purchase-requests/leader/:id/rows/:rowId/decision` (rol `lider_actividad`)

- `:id` es el id de la solicitud.
- `:rowId` es el `id` de la fila, el mismo que viene en `components[].id` de `GET /leader/:id`.

```json
{ "decision": "APROBADO" }
{ "decision": "RECHAZADO", "justification": "No hay presupuesto en mi actividad" }
```

**Reglas** (ver `BUSINESS_RULES.md`, sección 5.1)

- El líder decide **fila por fila**, y solo las filas donde él es el líder.
- Si **una** fila se rechaza, la solicitud completa pasa a `RECHAZA_LIDER`. Desde ese momento **ningún líder puede decidir**, aunque tenga filas pendientes.
- Cuando **todas** las filas están aprobadas, la solicitud pasa a `APRUEBA_LIDER` y le llega a suficiencia.
- Una fila decidida no se puede cambiar.
- Si dos líderes deciden al mismo tiempo, el backend procesa una decisión a la vez, así que el resultado siempre es consistente.

**Respuesta:** `200` con la solicitud **tal como la ve el líder después de decidir**. Es el mismo `PurchaseRequestView` de `GET /leader/:id`, con `status` y `components[].leaderStatus` ya actualizados. Sirve para refrescar la pantalla sin otra llamada.

### Decisión de suficiencia (primera revisión, con el monto estimado)

`POST /api/v1/purchase-requests/sufficiency/:id/decision` (rol `suficiencia_presupuestal`)

```json
{ "decision": "AUTORIZA" }
{ "decision": "RECHAZA", "justification": "El estimado excede el presupuesto disponible" }
```

- Solo aplica cuando la solicitud está en `APRUEBA_LIDER`.
- `AUTORIZA` → `AUTORIZA_SUFICIENCIA`. Desde ahí la solicitud aparece en la bandeja de recursos materiales.
- `RECHAZA` → `RECHAZA_SUFICIENCIA`. Es terminal.

**Respuesta:** `200` con la solicitud como la ve suficiencia (el mismo `PurchaseRequestView` de `GET /sufficiency/:id`).

### Reglas comunes

- **Todo rechazo exige `justification`.** Si llega vacía o solo con espacios, responde 400. Máximo 2000 caracteres.
- `justification` también se acepta al aprobar. Es opcional y se guarda.
- Cada decisión queda en un historial (`purchase_request_history`): quién, cuándo, la justificación, y el estado antes y después. 🔜 Todavía no hay un endpoint para consultarlo.

### Errores

| HTTP | `error` | Cuándo | Qué hacer en el front |
|---|---|---|---|
| 400 | `Bad Request` | `decision` inválida, `justification` muy larga, o un id que no es UUID | — |
| 400 | `RejectionJustificationRequiredError` | Rechazo sin justificación | Pedir la justificación |
| 403 | `Forbidden` | El usuario no tiene el rol | — |
| 404 | `PurchaseRequestNotFoundError` | La solicitud no existe, o suficiencia todavía no la ve | Regresar a la bandeja |
| 404 | `RequestComponentNotFoundError` | La fila no existe o no es del líder | Regresar a la bandeja |
| 409 | `LeaderRowAlreadyDecidedError` | Esa fila ya se había decidido | Refrescar el detalle |
| 409 | `RequestNotAwaitingLeadersError` | Otro líder ya rechazó, o la solicitud ya pasó de etapa | Refrescar y mostrar el estado actual |
| 409 | `InvalidStatusTransitionError` | Suficiencia ya decidió, o la solicitud no está en `APRUEBA_LIDER` | Refrescar y mostrar el estado actual |

Los **409** significan "esto ya cambió mientras lo veías". Lo correcto es refrescar el detalle y mostrar el estado nuevo, no mostrar un error genérico.

### Qué hacer en el front

- **Bandeja del líder:**
  - Usar `GET /leader?status=SOLICITADO&leaderStatus=PENDIENTE` para listar lo que le falta decidir.
  - En el detalle, mostrar los botones de aprobar y rechazar **por fila**, solo si `status === 'SOLICITADO'` y `leaderStatus === 'PENDIENTE'`.
- **Bandeja de suficiencia:**
  - Usar `GET /sufficiency?status=APRUEBA_LIDER` para listar lo que le falta decidir.
  - Mostrar los botones de autorizar y rechazar solo si `status === 'APRUEBA_LIDER'`.
- Al rechazar, pedir la justificación antes de enviar. Es obligatoria.

## ✅ Orden de los productos

- `productItems` ahora sale **siempre en el orden en que el solicitante lo capturó**, en todas las respuestas.
- El orden se toma del arreglo `productItems` del `POST`.
- Antes el orden no estaba garantizado, y eso importa porque el formato se imprime y se firma.

**Qué hacer en el front:** mandar `productItems` en el orden en que el usuario los ve, y no reordenarlos al mostrarlos.
