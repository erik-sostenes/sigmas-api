# Reglas de negocio: solicitudes de compra (SIGMAS)

Última actualización: 22 de noviembre de 2026

Este documento es la **fuente de verdad** de las reglas de negocio. Si algo del código o de otro documento lo contradice, gana este archivo.

Lo marcado como **🔜 Por definir** todavía no está decidido. No se implementa hasta que se decida y se actualice aquí.

---

## 1. Actores y roles

Los roles viven en la tabla `roles`. El `code` de cada rol es un identificador fijo: **nunca se cambia en la base de datos**. El `name` sí puede cambiar.

| Rol (`code`) | Quién es | ¿Cuántos usuarios? | ¿Usa el sistema? |
|---|---|---|---|
| `solicitante` | Quien crea la solicitud | Sin límite | Sí |
| `lider_actividad` | Responsable de una o varias actividades | Tantos como actividades sin líder | Sí |
| `lider_componente` | Responsable de un componente | Tantos como componentes sin líder | Sí, pero **solo para tracking**: no ve ni decide solicitudes |
| `suficiencia_presupuestal` | Director de Planeación y Vinculación | **Solo 1** | Sí |
| `recursos_materiales` | Área que hace el estudio de mercado | Varios | Sí |
| `servicios_administrativos` | "Revisa". Subdirectora de Servicios Administrativos | **Solo 1** | Sí |
| `super_admin` | Administra usuarios y catálogos | — | Sí, pero **no ve solicitudes** |
| — | "Autoriza". Director General | — | **No**. Lo captura `servicios_administrativos` |
| — | "Revisa requisitos fiscales". Recursos Financieros | — | **No**. Lo captura `servicios_administrativos` |

Reglas:

- Un usuario puede tener varios roles. Por ejemplo, la misma persona puede ser líder de actividad y "revisa".
- **La fuente de verdad de los roles es la base de datos** (`user_roles`). La metadata de roles en el JWT de Clerk solo la usa el front para mostrar secciones.
  - Deuda técnica: cuando el admin cambie roles, hay que sincronizar la metadata en Clerk.
- En el backend, los `code` de los roles se definen como constantes **en un solo archivo**. No se reparten `Set` de roles por el código.
- Que solo haya 1 usuario de suficiencia y 1 de "revisa" lo controla el backend al dar de alta usuarios. No se usa una columna `max_users`.

## 2. Liderazgo

- Una actividad tiene **máximo 1 líder** (`user_activities`).
- Un componente tiene **máximo 1 líder** (`users.component_id`).
- Un usuario puede liderar **varias actividades**, pero **solo 1 componente**.
- El líder de una actividad no depende del líder de su componente. Son asignaciones independientes.
- Para el flujo de solicitudes solo importa el **líder de actividad**.

Garantías en la base de datos:

- `UNIQUE (activity_id)` en `user_activities`.
- `UNIQUE (component_id)` en `users`. Varios `NULL` no chocan.

## 3. Estructura de una solicitud

**Cabecera**

- Folio (`request_number`), fecha y área solicitante (el departamento del solicitante).
- Justificación y normas ISO (una o varias).
- `purchase_type` va en `NULL` al crear. Lo define recursos materiales en el estudio de mercado.

**Filas de distribución** (`request_components`)

Cada fila tiene componente, actividad, fuente de financiamiento ("presupuesto a afectar") e importe estimado.

- La unidad administrativa se obtiene del componente.
- La actividad **tiene que pertenecer** al componente de su fila. Lo garantiza una FK compuesta `(activity_id, component_id) → activities(id, component_id)`.
- Una solicitud puede tener varias actividades, de componentes distintos.
- Se puede repetir componente con otra actividad.
- Se puede repetir la misma actividad con otra fuente de financiamiento.
  - Ejemplo: la actividad 0401 con una fila Estatal y otra Federal.
  - `UNIQUE (purchase_request_id, component_id, activity_id, funding_source_id)`.
- Cada fila guarda **fijo** a su líder (`leader_id`) en el momento de crear la solicitud. Ver [sección 5](#5-aprobación-de-líderes).
- El solicitante reparte el total entre las filas. Ejemplo: actividad A $500, actividad B $200, actividad C el resto.

**Productos** (`product_items`)

- Lista general de la solicitud. **No están ligados a ninguna fila ni actividad.**
- Cada producto tiene partida presupuestal, cantidad, unidad de medida, descripción e importe.
- La **partida presupuestal pertenece solo al producto**. No tiene relación con las actividades ni con los líderes.
- El importe es el **total de la línea**, no `cantidad × precio`, y **ya incluye impuestos**. El sistema no calcula IVA ni retenciones.
- Los productos conservan **el orden en que el solicitante los capturó**, porque así se imprimen en el formato.

## 4. Creación

- Solo puede crear quien tenga el rol `solicitante`.
- El solicitante (`requested_by`) **se toma del token**: `clerk_id` → `users.id`. El cliente nunca lo envía.
- Se crea directamente en `SOLICITADO`. **No existe borrador**, y la solicitud no se edita después de enviarla.
- Validaciones:
  - Al menos 1 fila de distribución y al menos 1 producto.
  - Cada actividad tiene que tener un líder asignado. Si alguna no lo tiene, la solicitud no se crea.
  - La actividad pertenece al componente de su fila.
  - Suma de importes de las filas = suma de importes de los productos, con tolerancia de $0.01.
  - `final_amount` es 0 en filas y productos.
- 🔜 A futuro: al crear, solo se ofrecen componentes y actividades que ya tienen líder.

## 5. Flujo y estados

### Estados

| Estado | Significado | ¿Terminal? |
|---|---|---|
| `SOLICITADO` | Creada; esperando a los líderes | |
| `APRUEBA_LIDER` | Todos los líderes aprobaron; esperando a suficiencia | |
| `RECHAZA_LIDER` | Un líder rechazó | ✅ |
| `AUTORIZA_SUFICIENCIA` | Suficiencia autorizó el estimado; esperando a recursos materiales | |
| `RECHAZA_SUFICIENCIA` | Suficiencia rechazó con el monto estimado (primera revisión) | ✅ |
| `EN_REVISION_RECURSOS` | Recursos materiales está haciendo el estudio de mercado | |
| `PENDIENTE_APROBACION_SUFICIENCIA` | Estudio terminado; suficiencia revisa los montos finales | |
| `APRUEBA_SUFICIENCIA` | Suficiencia aprobó los montos finales; pasa a "revisa" | |
| `RECHAZA_SUFICIENCIA_FINAL` | Suficiencia rechazó con los montos finales (segunda revisión) | ✅ |
| `APRUEBA_REVISION` | "Revisa" aprobó; se generan los documentos | |
| `RECHAZA_REVISION` | "Revisa" rechazó | ✅ |
| `AUTORIZA_DIRECCION` | Director General autorizó (capturado por "revisa") | |
| `RECHAZA_DIRECCION` | Director General rechazó | ✅ |
| `APRUEBA_FISCAL` | Recursos Financieros aprobó: **fin exitoso** | ✅ |
| `RECHAZA_FISCAL` | Recursos Financieros rechazó | ✅ |

`RECHAZA_RECURSOS`, que existe hoy en el código, **se elimina**: recursos materiales no rechaza.

### Transiciones

```
SOLICITADO ──(todos los líderes aprueban)──▶ APRUEBA_LIDER
SOLICITADO ──(un líder rechaza)──▶ RECHAZA_LIDER
APRUEBA_LIDER ──(suficiencia autoriza)──▶ AUTORIZA_SUFICIENCIA
APRUEBA_LIDER ──(suficiencia rechaza)──▶ RECHAZA_SUFICIENCIA
AUTORIZA_SUFICIENCIA ──(recursos inicia estudio)──▶ EN_REVISION_RECURSOS
EN_REVISION_RECURSOS ──(recursos termina estudio)──▶ PENDIENTE_APROBACION_SUFICIENCIA
PENDIENTE_APROBACION_SUFICIENCIA ──(suficiencia aprueba)──▶ APRUEBA_SUFICIENCIA
PENDIENTE_APROBACION_SUFICIENCIA ──(suficiencia rechaza)──▶ RECHAZA_SUFICIENCIA_FINAL
APRUEBA_SUFICIENCIA ──(revisa aprueba)──▶ APRUEBA_REVISION
APRUEBA_SUFICIENCIA ──(revisa rechaza)──▶ RECHAZA_REVISION
APRUEBA_REVISION ──(director autoriza)──▶ AUTORIZA_DIRECCION
APRUEBA_REVISION ──(director rechaza)──▶ RECHAZA_DIRECCION
AUTORIZA_DIRECCION ──(fiscal aprueba)──▶ APRUEBA_FISCAL
AUTORIZA_DIRECCION ──(fiscal rechaza)──▶ RECHAZA_FISCAL
```

Cualquier transición que no esté listada se rechaza (`InvalidStatusTransitionError`).

### Alcance actual

**Se implementa ahora:** de `SOLICITADO` hasta `AUTORIZA_SUFICIENCIA` / `RECHAZA_SUFICIENCIA`, es decir, creación, líderes y la primera decisión de suficiencia.

Lo demás queda documentado, pero se construye después.

### Reglas por etapa

**Líderes:** ver [sección 5.1](#51-aprobación-de-líderes).

**Suficiencia, con el monto estimado**

- Autoriza o rechaza.
- Solo rechaza cuando el estimado excede el presupuesto disponible. Es criterio de suficiencia, porque el sistema no conoce el presupuesto.
- Justificación obligatoria al rechazar.

**Recursos materiales (estudio de mercado)** 🔜

- Clasifica el tipo de compra: mostrador, adjudicación directa, licitación o invitación.
- Fija los precios finales de los productos.
- No rechaza.
- Cualquier usuario con el rol ve las solicitudes. A futuro, cada solicitud se asigna a una persona.

**Suficiencia, con los montos finales**

- Aprueba o rechaza (`RECHAZA_SUFICIENCIA_FINAL`), con justificación obligatoria al rechazar.
- Si el monto final excede el estimado, se rechaza.
- 🔜 Alternativa a evaluar: en lugar de rechazar, preguntar a los líderes afectados.
- Al aprobar:
  - La solicitud pasa **automáticamente** a "revisa".
  - Se notifica a recursos materiales (solo aviso).
  - Se generan los documentos. 🔜 Falta definir cuáles.

**Revisa, director y fiscal** 🔜

- "Revisa" aprueba o rechaza.
- Después captura la decisión del Director General y luego la de Recursos Financieros.
- En cada captura se guarda el nombre de quien firmó.

### 5.1 Aprobación de líderes

- Cada fila de distribución tiene `leader_id`, que **se fija al crear la solicitud** con el líder de la actividad en ese momento. Así el histórico no cambia aunque después se reasigne la actividad.
- Cada fila tiene `leader_status`: `PENDIENTE` → `APROBADO` | `RECHAZADO`.
- **El líder aprueba o rechaza fila por fila**, y solo las filas donde él es el `leader_id`.
- Si **cualquier** fila se rechaza:
  - La solicitud pasa a `RECHAZA_LIDER`.
  - Ningún líder puede volver a decidir.
- Cuando **todas** las filas están aprobadas, la solicitud pasa a `APRUEBA_LIDER`.
- Si el solicitante también es líder de una fila, **la aprueba desde su bandeja de líder** como cualquier otro. No hay aprobación automática.
- Técnico: la decisión y el recálculo del estado de la solicitud van en una transacción con bloqueo de filas. Así dos líderes que aprueban al mismo tiempo no dejan un estado inconsistente.

### 5.2 Rechazos

- **Todo rechazo es terminal** y **siempre lleva justificación**.
- El solicitante se entera del rechazo, pero **no puede editar ni reenviar**. Si quiere insistir, crea una solicitud nueva.

## 6. Visibilidad

**Cada sección del front tiene su propia ruta.** El backend:

1. Toma al usuario del token.
2. Valida en la base de datos que el usuario **tiene el rol de esa sección** (si no, responde 403).
3. Filtra por usuario o por estado.

El cliente nunca manda parámetros que amplíen lo que puede ver: no hay `scope`, `userId` ni banderas.

| Sección / rol | Qué solicitudes ve | Qué ve dentro de cada una |
|---|---|---|
| Solicitante | Solo las que creó, en cualquier estado | Todo |
| Líder de actividad | Las que tienen al menos una fila con su `leader_id`, en cualquier estado | Cabecera, **solo sus filas** (componente, actividad, unidad administrativa, fuente de financiamiento con sus claves e importe) y **todos** los productos. No ve las filas de otros líderes |
| Suficiencia presupuestal | Desde `APRUEBA_LIDER` en adelante, incluido su histórico | Todo |
| Recursos materiales | Desde `AUTORIZA_SUFICIENCIA` en adelante, incluido su histórico | Todo |
| Revisa (servicios administrativos) | Desde `APRUEBA_SUFICIENCIA` en adelante, incluido su histórico | Todo |
| Líder de componente | Ninguna | — |
| Super admin | Ninguna (403) | — |

- Las secciones **no se combinan**. Si un usuario tiene dos roles, usa dos secciones. Si le quitan un rol, pierde esa sección y no hay que cambiar nada más.
- Cada área sigue viendo como histórico las solicitudes que ya le llegaron, aunque después se rechacen.
- Por eso hay dos rechazos de suficiencia. Recursos materiales **no** ve `RECHAZA_SUFICIENCIA`, porque nunca le llegó. **Sí** ve `RECHAZA_SUFICIENCIA_FINAL`, porque ya había hecho el estudio de mercado.

## 7. Historial y justificaciones

Hay una tabla de historial con **un registro por cada decisión**:

- solicitud y fila de distribución (la fila es obligatoria en decisiones de líder y `NULL` en las demás)
- estado anterior → estado nuevo
- quién decidió (`user_id`)
- para las capturas físicas: nombre de quien firmó
- justificación, **obligatoria si es rechazo**
- fecha

Los registros del historial **nunca se borran**.

**Quién ve el historial:** **todas las bandejas** ven el historial completo de cada solicitud que les toca. Así todos saben quién aprobó o rechazó y por qué.

- Esto incluye al líder: ve también las decisiones de los otros líderes, con su nombre, su actividad y su justificación.
- Lo que el líder **no** ve son los importes de las filas de otros líderes. El historial no incluye importes.

## 8. Notificaciones

- Por ahora, "notificar" significa que **la solicitud aparece en la bandeja** de quien le toca.
- 🔜 Correo u otro canal: más adelante.

## 9. Evidencia: formatos en papel

Fotos del proceso actual en papel. Sirven como referencia de qué datos maneja cada área. Donde no coinciden con este documento, **gana este documento**.

| Imagen | Qué muestra | Qué ya no aplica |
|---|---|---|
| [Formato actual, una actividad](evidencia/formato-actual-una-actividad.jpeg) | **Lo que ve el líder de actividad.** Cabecera con área solicitante, presupuesto a afectar (fuente de financiamiento), componente, actividad y unidad administrativa, cada uno con su clave. Tabla de productos con partida, cantidad, unidad, descripción e importe con impuestos incluidos | El desglose de impuestos escrito a mano. En el sistema los importes ya incluyen impuestos |
| [Formato anterior, varias actividades](evidencia/formato-anterior-varias-actividades.jpeg) | El formato completo con todas las firmas: solicita, líder de la actividad, suficiencia presupuestal, revisa, autoriza (Director General) y revisa requisitos fiscales (Recursos Financieros) | "VARIOS" en componente, actividad y unidad administrativa: en el sistema cada fila lleva su dato. También el cálculo aparte de IVA y retenciones |
| [Distribución por actividad](evidencia/distribucion-por-actividad.jpeg) | Cómo se reparte el total entre actividades de distintos componentes. Cada bloque lo firma el líder de esa actividad, y cada líder ve **solo su bloque** | La partida de gasto en cada bloque: en el sistema la partida pertenece solo a los productos |
| [Una actividad con varias fuentes](evidencia/distribucion-actividad-varias-fuentes.jpeg) | La misma actividad (0401) repartida entre dos fuentes de financiamiento (Estatal y Federal). Por eso el `UNIQUE` de las filas incluye `funding_source_id` | La columna de partida |

## 10. Pendientes por definir

1. Recursos materiales: cómo se asigna cada solicitud a una persona y si existe un caso "sin proveedor".
   - **Propuesta de pantallas**, rescatada del plan anterior del front (sin validar):

     | Bandeja | Contenido |
     |---|---|
     | Clasificación | `EN_REVISION_RECURSOS` sin `purchase_type` todavía |
     | Compras directas (mostrador) | `EN_REVISION_RECURSOS` + `COMPRA_MOSTRADOR` |
     | Adjudicación directa | `EN_REVISION_RECURSOS` + `COMPRA_ADJ_DIRECTA` |
     | Licitación | `EN_REVISION_RECURSOS` + `COMPRA_LICITACION` |
     | Invitación a 3 personas | `EN_REVISION_RECURSOS` + `COMPRA_INVITACION` |
     | Solicitudes aprobadas | `APRUEBA_SUFICIENCIA`, con búsqueda por folio y por tipo, por separado o juntos |

   - Recorrido propuesto:
     1. Al clasificar, la solicitud sale de Clasificación y entra a la bandeja de su tipo.
     2. Al terminar el estudio, pasa a `PENDIENTE_APROBACION_SUFICIENCIA` y sale de la bandeja de su tipo.
     3. Cuando suficiencia la aprueba, aparece en Aprobadas.
   - Para esto el backend necesitaría:
     - filtros de `purchaseType` y "sin clasificar" en `/resources`,
     - los endpoints de clasificar y terminar el estudio.
2. Quién reparte el monto final entre las filas de distribución después del estudio de mercado.
   - **Solicitudes con varios componentes o actividades.** El backend ya las soporta: filas, un líder por fila, aprobación fila por fila y visibilidad por líder. Pero falta terminar de definir las reglas de negocio de ese caso. Mientras tanto, **el front solo captura una fila** (decisión del 22 de noviembre de 2026).
3. Qué documentos se generan cuando suficiencia aprueba los montos finales.
4. Alternativa al rechazo cuando el monto final excede el estimado: consultar a los líderes.
5. Admin:
   - Ver qué actividades y componentes ya tienen líder, y quién es.
   - Revocar roles.
   - Qué pasa si se reasigna un líder mientras hay solicitudes en curso (por ahora: no se permite).
6. Líder que nunca responde (timeouts).
