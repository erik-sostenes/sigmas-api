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
| `GET /api/v1/purchase-requests` y `/:id` | ✅ | Cada componente trae `leaderStatus` |
| `GET /api/v1/purchase-requests` y `/:id` | 🔜 | **Se eliminan.** Se reemplazan por una ruta por sección |
| `GET /api/v1/purchase-requests/{mine,leader,sufficiency,resources}` | 🔜 | Rutas nuevas, una por sección |
| `POST .../leader/:id/rows/:rowId/decision` | 🔜 | Nuevo. El líder aprueba o rechaza una fila |
| `POST .../sufficiency/:id/decision` | 🔜 | Nuevo. Suficiencia autoriza o rechaza |
| Catálogo de estados | ✅ | Se quitó `RECHAZA_RECURSOS` y hay 7 estados nuevos |

---

## Conceptos que cambian cómo funciona el front

### El backend decide qué ve cada usuario

- El usuario **siempre** sale del token de Clerk. El front **nunca** manda `userId`, `requestedBy`, `scope` ni banderas que amplíen lo que un usuario puede ver.
- **Los roles se validan contra la base de datos**, no contra la metadata del token.
  - El front puede seguir usando la metadata para decidir qué secciones mostrar.
  - Pero si la metadata y la base de datos no coinciden, el backend responde 403. Es deuda técnica conocida: hoy no se sincroniza la metadata cuando el admin cambia roles.
- **Una sección del front = una ruta del backend = un rol.** No se combinan. Si un usuario tiene dos roles, ve dos secciones. 🔜 Las rutas por sección llegan en la fase 3.

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

## 🔜 Fase 3: Bandejas, una ruta por sección

El contrato es preliminar y se va a actualizar aquí cuando se implemente.

| Ruta | Rol | Qué solicitudes trae | Qué trae de cada una |
|---|---|---|---|
| `GET /api/v1/purchase-requests/mine` y `/mine/:id` | `solicitante` | Las que creó el usuario | Todo |
| `GET /api/v1/purchase-requests/leader` y `/leader/:id` | `lider_actividad` | Las que tienen al menos una fila suya | Cabecera, **solo sus filas** y todos los productos |
| `GET /api/v1/purchase-requests/sufficiency` y `/sufficiency/:id` | `suficiencia_presupuestal` | Desde `APRUEBA_LIDER` en adelante | Todo |
| `GET /api/v1/purchase-requests/resources` y `/resources/:id` | `recursos_materiales` | Desde `AUTORIZA_SUFICIENCIA` en adelante | Todo |

- Se eliminan `GET /api/v1/purchase-requests` y `/:id`, el query param `scope` y el campo `isRequester`.
- Filtros: `page`, `limit`, `status` y `search` (por folio). La ruta del líder agrega `leaderStatus=PENDIENTE` para ver lo que le falta decidir.
- Las respuestas van a traer **nombres y claves** (componente, actividad, unidad administrativa, fuente de financiamiento, partida, unidad de medida, área solicitante), no solo IDs.
- `/:id` responde **404** si la solicitud no existe o si no es de esa sección. No se distingue entre los dos casos.

## 🔜 Fase 4: Decisiones

- `POST /api/v1/purchase-requests/leader/:id/rows/:rowId/decision`, con body `{ "decision": "APROBADO" | "RECHAZADO", "justification"?: string }`. Errores previstos:
  - 404: la fila no existe o no es tuya.
  - 409: la fila ya se decidió, o la solicitud ya no espera a los líderes.
  - 400: rechazo sin justificación.
- `POST /api/v1/purchase-requests/sufficiency/:id/decision`, con body `{ "decision": "AUTORIZA" | "RECHAZA", "justification"?: string }`. La solicitud tiene que estar en `APRUEBA_LIDER`.
- **Todo rechazo exige justificación.**
