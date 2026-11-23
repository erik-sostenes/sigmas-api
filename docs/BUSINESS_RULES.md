# Reglas de negocio: solicitudes de compra (SIGMAS)

Última actualización: 23 de noviembre de 2026

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
- En la creación inicial (`estimated_amount`), el importe es el **total de la línea con impuestos incluidos**, no `cantidad × precio`. El solicitante no desglosa IVA ni retenciones.
- En el estudio de mercado por Adjudicación Directa, `final_amount` de cada producto guarda el costo total de la línea **sin IVA** del proveedor adjudicado (`cantidad × costo unitario`), y el IVA más las retenciones (`RET IVA`, `RET ISR`) se registran aparte en el Cuadro Comparativo para determinar `total_amount_final` de la solicitud (ver [sección 10](#10-cuadro-comparativo-adjudicación-directa)).
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
- Al crear, solo se ofrecen las actividades con un **líder activo**, y los componentes que tienen al menos una. Es la misma condición que valida el backend al guardar.
  - El componente se ofrece por sus actividades, no por su líder de componente, que es solo de seguimiento.
  - El solicitante no ve quién es el líder.

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

**Recursos materiales (estudio de mercado)**

- Clasifica el tipo de compra: `COMPRA_MOSTRADOR`, `COMPRA_ADJ_DIRECTA`, `COMPRA_LICITACION` o `COMPRA_INVITACION`.
- Cuando se clasifica como `COMPRA_ADJ_DIRECTA`, el estudio de mercado se formaliza capturando el **Cuadro Comparativo** (ver [sección 10](#10-cuadro-comparativo-adjudicación-directa)), sin validación de UMAs en el sistema.
- Guardar el Cuadro Comparativo mantiene la solicitud en `EN_REVISION_RECURSOS` y habilita la generación del PDF para firmas físicas; el paso a `PENDIENTE_APROBACION_SUFICIENCIA` ocurre únicamente cuando Recursos Materiales confirma explícitamente el envío a segunda revisión de Suficiencia.
- No rechaza.
- 🔜 Por definir: mecánica del estudio de mercado para `COMPRA_MOSTRADOR`, `COMPRA_LICITACION` y `COMPRA_INVITACION`, así como la asignación individual de cada solicitud a una persona.

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

**Etapas (pestañas de cada bandeja).** Las define el backend **por bandeja**. "Por validar" es **lo que le toca a quien consulta**:

| Bandeja | Por validar ("Por decidir" en el front, salvo para el solicitante) | En proceso |
|---|---|---|
| Solicitante | `SOLICITADO` y **ningún** líder ha decidido | `SOLICITADO` con alguna fila aprobada, más los estados no terminales posteriores |
| Líder de actividad | `SOLICITADO` con una **fila suya pendiente** | `SOLICITADO` donde ya decidió todas sus filas, más los estados no terminales posteriores |
| Suficiencia | `APRUEBA_LIDER` (1ª revisión) y `PENDIENTE_APROBACION_SUFICIENCIA` (2ª revisión) | `AUTORIZA_SUFICIENCIA`, `EN_REVISION_RECURSOS`, `APRUEBA_SUFICIENCIA`, `APRUEBA_REVISION`, `AUTORIZA_DIRECCION` |
| Recursos materiales | `AUTORIZA_SUFICIENCIA` (le llegó) y `EN_REVISION_RECURSOS` (estudio en curso) | `PENDIENTE_APROBACION_SUFICIENCIA`, `APRUEBA_SUFICIENCIA`, `APRUEBA_REVISION`, `AUTORIZA_DIRECCION` |

- En todas las bandejas: **Aprobadas** = `APRUEBA_FISCAL` y **Rechazadas** = cualquier `RECHAZA_*`.
- Cuando se agregue un estado nuevo al flujo, hay que asignarlo a una etapa **en cada bandeja que lo vea**, en `INBOX_STAGES` (`purchase-request.stages.ts`).

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

Referencias adicionales usadas para el Cuadro Comparativo ([sección 10](#10-cuadro-comparativo-adjudicación-directa)):

- **Formato oficial e Instructivo de llenado del Cuadro Comparativo** (ITSOEH / SGI Grupo 4 Multisitios, 24 campos numerados).
- **Instructivo de Adjudicaciones Directas** (10 páginas; clasificación de proveedores en pág. 3, criterios de evaluación y mecánica en págs. 4–5 y secuencia de etapas en págs. 6–8).
- **Formato oficial e Instructivo de Solicitud de Materiales y/o Servicios** (3 páginas; pág. 1 solicitud con campos 1–27, pág. 2 orden de compra/datos bancarios y fiscales con campos 28–30 para fase posterior, pág. 3 instructivo).
- **Ejemplos físicos reales del folio `00267`** (Cuadro Comparativo del `17/07/2026` y Solicitud de Materiales y/o Servicios del `01/07/2026` firmados), que confirman la aritmética: subtotal sin IVA (`$10,101.90`) + IVA (`$1,616.30`) − retenciones (`$0.00`) = Total (`$11,718.20`).

## 10. Cuadro comparativo (Adjudicación directa)

### 10.1 Alcance y relación con el flujo

El **Cuadro Comparativo** es el estudio de mercado formal que captura el Departamento de Recursos Materiales y Servicios durante el estado `EN_REVISION_RECURSOS`, **exclusivamente** cuando clasifica una solicitud con tipo de compra `COMPRA_ADJ_DIRECTA` (Adjudicación directa).

- La captura se realiza en **una sola exhibición** (no existen borradores parciales ni guardado de avances).
- Guardar el Cuadro Comparativo **no** cambia el estado de la solicitud ni inicia flujos digitales nuevos; habilita la descarga del formato oficial en PDF para recabar las 4 firmas físicas en papel.
- La solicitud avanza a `PENDIENTE_APROBACION_SUFICIENCIA` únicamente cuando Recursos Materiales confirma el envío explícito a la segunda revisión de Suficiencia Presupuestal.
- **Fuera del alcance de esta sección** (se documentan aparte más adelante):
  - Alta y administración del catálogo de proveedores (datos generales, bancarios, fiscales y clasificación `Críticos` / `Únicos` / `Menores`).
  - Evaluación trimestral acumulada de proveedores (*Reporte de Evaluación a Proveedores*, rangos 8–10 Confiable / 5–7 No confiable).
  - Estudio de mercado para `COMPRA_MOSTRADOR`, `COMPRA_LICITACION` y `COMPRA_INVITACION`.
  - Flujo de Orden de Compra (página 2 del formato oficial de Solicitud de Materiales y/o Servicios) después de `APRUEBA_SUFICIENCIA`.

### 10.2 Reglas de negocio verificables (EARS)

Leyenda de método de verificación: **T** = Prueba automatizada (`Test`), **A** = Análisis o cálculo (`Analysis`), **I** = Inspección de código/documento (`Inspection`), **D** = Demostración funcional (`Demonstration`).

#### Activación, permisos y ciclo de vida

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-01` | Complejo | Mientras una solicitud esté en estado `EN_REVISION_RECURSOS` y su `purchase_type` sea `COMPRA_ADJ_DIRECTA`, el sistema debe habilitar la captura del Cuadro Comparativo. | `T` | Flujo / Regla 1 |
| `CC-02` | Ubicuo | El sistema no debe aplicar validaciones de umbrales en UMAs para habilitar ni restringir el Cuadro Comparativo. | `I` | Regla 3 |
| `CC-03` | Ubicuo | El sistema debe restringir la captura, la consulta de edición y el envío a Suficiencia del Cuadro Comparativo exclusivamente a usuarios activos con el rol `recursos_materiales` en la base de datos. | `T` | Seguridad / Sec. 1 y 6 |
| `CC-04` | Si/entonces | Si se intenta guardar un Cuadro Comparativo incompleto (faltan proveedores, cotizaciones válidas, criterios de evaluación, proveedor adjudicado o justificación obligatoria), entonces el sistema debe rechazar la operación sin persistir un borrador parcial. | `T` | Regla 4 |
| `CC-05` | Si/entonces | Si una solicitud ya cuenta con un Cuadro Comparativo guardado, entonces el sistema debe rechazar la creación de un segundo Cuadro Comparativo para esa solicitud. | `T` | Relación 1:1 |
| `CC-06` | Cuando | Cuando Recursos Materiales guarda un Cuadro Comparativo válido, el sistema debe mantener el estado de la solicitud en `EN_REVISION_RECURSOS` sin realizar transición automática. | `T` | Regla 4 |
| `CC-07` | Complejo | Mientras una solicitud con `purchase_type = COMPRA_ADJ_DIRECTA` esté en estado `EN_REVISION_RECURSOS` y tenga un Cuadro Comparativo guardado, cuando Recursos Materiales confirme la acción explícita de enviar a segunda revisión de Suficiencia, el sistema debe cambiar el estado de la solicitud a `PENDIENTE_APROBACION_SUFICIENCIA`. | `T` | Regla 4 |

#### Datos heredados y autoría

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-08` | Ubicuo | El sistema debe tomar automáticamente de la solicitud el folio (`request_number`), el área solicitante (`requester.department.name`), los componentes, las actividades y las fuentes de financiamiento sin permitir su modificación en el Cuadro Comparativo. | `T` | Campos PDF 1, 3, 4, 5, 6 |
| `CC-09` | Ubicuo | El sistema debe listar los artículos del Cuadro Comparativo desde `product_items` respetando su `position` original e incluyendo número secuencial, partida COG (`budget_item.code`), cantidad (`quantity`), unidad de medida (`measurement_unit.name`) y descripción (`description`). | `T` | Campos PDF 7–10 |
| `CC-10` | Cuando | Cuando se guarda el Cuadro Comparativo, el sistema debe registrar automáticamente la fecha de elaboración y el identificador del usuario autenticado que lo capturó. | `T` | Campos PDF 2 y 21 |

#### Proveedores y cotizaciones

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-11` | Ubicuo | Cada Cuadro Comparativo debe asociar exactamente 3 proveedores distintos seleccionados del catálogo de proveedores activos del sistema. | `T` | Campo PDF 11 / Regla 2 |
| `CC-12` | Si/entonces | Si la captura del Cuadro Comparativo incluye una cantidad de proveedores distinta de 3, repite un mismo proveedor o referencia un proveedor inexistente o inactivo, entonces el sistema debe rechazar el guardado. | `T` | Regla 2 |
| `CC-13` | Ubicuo | Para cada artículo cotizado por un proveedor, el sistema debe exigir un costo unitario sin IVA mayor o igual a `$0.00` (con precisión de 2 decimales) y calcular automáticamente el costo total de línea como `cantidad × costo_unitario` redondeado a 2 decimales. | `T` | Campo PDF 12 / Regla 3 |
| `CC-14` | Donde | Donde un proveedor no cotice un artículo específico, el sistema debe permitir registrarlo como "no cotizado" (costo unitario `NULL`), aportando `$0.00` al importe de ese proveedor. | `T` | Evidencia folio `00267` / Regla 2 |
| `CC-15` | Si/entonces | Si alguno de los 3 proveedores tiene todos los artículos de la solicitud marcados como "no cotizado", entonces el sistema debe rechazar el guardado. | `T` | Integridad de cotización |
| `CC-16` | Ubicuo | Para cada proveedor, el sistema debe calcular automáticamente `importe` como la suma exacta de los costos totales de línea (sin IVA) de los artículos que cotizó, redondeada a 2 decimales. | `T` | Campo PDF 13 |
| `CC-17` | Ubicuo | Para cada proveedor, el sistema debe recibir `iva` (obligatorio, `>= 0.00`), `ret_iva` (opcional, valor por defecto `0.00`, `>= 0.00`) y `ret_isr` (opcional, valor por defecto `0.00`, `>= 0.00`) y calcular automáticamente `total = importe + iva - ret_iva - ret_isr` redondeado a 2 decimales. | `T` | Campos PDF 14–17 / Regla 3 |
| `CC-18` | Si/entonces | Si el `total` calculado de algún proveedor es menor que `$0.00`, entonces el sistema debe rechazar el guardado. | `T` | Integridad financiera |

#### Criterios de evaluación

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-19` | Ubicuo | Para cada uno de los 3 proveedores, el sistema debe registrar la evaluación de los 5 criterios fijos del Instructivo de Adjudicaciones Directas: `precio`, `tiempo_entrega`, `tiempo_respuesta`, `financiamiento` y `garantia`. | `T` | Campo PDF 18 / Instructivo pág. 4 |
| `CC-20` | Ubicuo | Para cada criterio evaluado de cada proveedor, el sistema debe exigir una calificación entera en el conjunto `{0, 1, 2}` y una observación en texto no vacía. | `T` | Regla 1 / Evidencia folio `00267` |
| `CC-21` | Si/entonces | Si falta alguno de los 5 criterios para un proveedor, una calificación está fuera de `{0, 1, 2}` o su observación está vacía o solo contiene espacios, entonces el sistema debe rechazar el guardado. | `T` | Regla 1 |
| `CC-22` | Ubicuo | Para cada proveedor, el sistema debe calcular automáticamente el puntaje total como la suma de sus 5 calificaciones (entero de `0` a `10`). | `T` | Evidencia folio `00267` / Instructivo pág. 5 |

#### Adjudicación, justificación y montos finales

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-23` | Ubicuo | Cada Cuadro Comparativo debe designar exactamente 1 proveedor adjudicado seleccionado entre los 3 proveedores del propio cuadro, cubriendo la solicitud completa. | `T` | Campo PDF 19 / Regla 4 |
| `CC-24` | Si/entonces | Si el proveedor seleccionado como adjudicado tiene uno o más artículos marcados como "no cotizado", entonces el sistema debe rechazar el guardado. | `T` | Regla 2 |
| `CC-25` | Si/entonces | Si el `total` del proveedor adjudicado es estrictamente mayor que el `total` mínimo entre los proveedores del cuadro que cotizaron el 100% de los artículos, entonces el sistema debe exigir una justificación de adjudicación no vacía; cuando el adjudicado tiene el menor `total`, la justificación debe ser opcional y conservarse si se captura. | `T` | Regla 2 / Evidencia folio `00267` |
| `CC-26` | Ubicuo | El sistema debe aceptar la fecha de entrega (`delivery_date`) como dato opcional en el Cuadro Comparativo. | `T` | Campo PDF 20 / Regla 3 |
| `CC-27` | Cuando | Cuando Recursos Materiales confirma el envío de la solicitud a `PENDIENTE_APROBACION_SUFICIENCIA`, el sistema debe guardar en cada `product_items.final_amount` el costo total de línea **sin IVA** (`cantidad × costo_unitario`) correspondiente al proveedor adjudicado. | `T` | Regla 4 / Evidencia folio `00267` |
| `CC-28` | Cuando | Cuando Recursos Materiales confirma el envío de la solicitud a `PENDIENTE_APROBACION_SUFICIENCIA`, el sistema debe registrar los importes finales del proveedor adjudicado en la solicitud: subtotal sin IVA (`importe`), `iva`, `ret_iva`, `ret_isr` y `total_amount_final = importe + iva - ret_iva - ret_isr`. | `T` | Regla 3 y 4 / Evidencia folio `00267` |
| `CC-29` | Si/entonces | Si Recursos Materiales intenta enviar una solicitud con `purchase_type = COMPRA_ADJ_DIRECTA` a `PENDIENTE_APROBACION_SUFICIENCIA` sin contar con un Cuadro Comparativo guardado, entonces el sistema debe rechazar la transición. | `T` | Integridad de flujo |

#### Generación de PDF y firmas físicas

| ID | Patrón EARS | Regla | Verif. | Origen |
|---|---|---|---|---|
| `CC-30` | Mientras | Mientras exista un Cuadro Comparativo guardado para la solicitud, el sistema debe ofrecer la generación y descarga de su formato oficial en PDF con los datos capturados (cabecera, tabla de productos con los 3 proveedores, totales desglosados, tabla de 5 criterios con puntajes y observaciones, proveedor adjudicado, justificación si existe y fecha de entrega si se capturó). | `D` | Regla 4 / Formato oficial PDF |
| `CC-31` | Ubicuo | El PDF del Cuadro Comparativo debe incluir los 4 apartados de firma física: *Elaboró* (Departamento de Recursos Materiales y/o Servicios), *Supervisó* (Jefa del Departamento de Recursos Materiales y/o Servicios), *Autorizó* (Subdirectora de Servicios Administrativos) y *V.B. del Área Solicitante* (nombre y firma). | `I` | Campos PDF 21–24 / Regla 6 |
| `CC-32` | Ubicuo | Las 4 firmas del Cuadro Comparativo se recaban únicamente en el documento físico impreso y no deben introducir estados ni pasos de aprobación digital adicionales en el flujo de solicitudes. | `I` | Regla 6 |

### 10.3 Escala de referencia de los 5 criterios

Cada criterio se captura con calificación entera en `{0, 1, 2}` y su observación en texto. Los significados de referencia según el *Instructivo de Adjudicaciones Directas* (pág. 4) y la práctica operativa (folio `00267`) son:

| Código | Criterio | `2` | `1` | `0` |
|---|---|---|---|---|
| `precio` | Precio | Costo bajo en el mercado | Costo alto en el mercado | No cotiza / sin dato |
| `tiempo_entrega` | Tiempo de entrega del bien o servicio | Entrega en la fecha pactada o antes | Entrega posterior a la fecha pactada | No menciona / sin dato |
| `tiempo_respuesta` | Tiempo de respuesta en la información | Entrega la información el mismo día | Entrega de 1 a 2 días hábiles posteriores (o mayor plazo según cotización) | No menciona / sin dato |
| `financiamiento` | Financiamiento | Sí otorga crédito | No otorga crédito (ej. contra entrega) | No menciona |
| `garantia` | Garantía por defecto o vicio oculto | Otorga garantía por defecto o vicio oculto | No otorga garantía | No menciona |

### 10.4 Trazabilidad contra el formato oficial (campos 1–24)

| Campo del formato PDF | Nombre en el instructivo | Origen en SIGMAS | Regla |
|---|---|---|---|
| `1` | No. solicitud | `purchase_requests.request_number` (folio de la solicitud) | `CC-08` |
| `2` | Fecha | Fecha de elaboración registrada al guardar el cuadro | `CC-10` |
| `3` | Área | `requester.department.name` | `CC-08` |
| `4` | Componente | Clave/nombre desde `request_components` | `CC-08` |
| `5` | Actividad | Clave/nombre desde `request_components` | `CC-08` |
| `6` | Fuente de financiamiento | Clave/nombre desde `request_components` (`25`, `11`, `14`) | `CC-08` |
| `7` | No. artículo | Posición secuencial derivada de `product_items.position` | `CC-09` |
| `8` | Partida COG | `product_items` → `budget_items.code` | `CC-09` |
| `9` | Unidades | `product_items.quantity` y `measurement_units.name` | `CC-09` |
| `10` | Descripción del artículo | `product_items.description` | `CC-09` |
| `11` | Nombre de los 3 proveedores | Catálogo de proveedores activos del sistema | `CC-11`, `CC-12` |
| `12` | Costo unitario y costo total | Costo unitario sin IVA capturado (o `NULL` si no cotizó) y `cantidad × costo_unitario` | `CC-13`, `CC-14` |
| `13` | Importe | Suma de costos totales de línea sin IVA por proveedor | `CC-16` |
| `14` | IVA | Capturado por proveedor (`>= 0.00`) | `CC-17` |
| `15` | RET IVA | Capturado por proveedor (por defecto `0.00`) | `CC-17` |
| `16` | RET ISR | Capturado por proveedor (por defecto `0.00`) | `CC-17` |
| `17` | Total | `importe + iva - ret_iva - ret_isr` (`>= 0.00`) | `CC-17`, `CC-18` |
| `18` | Observaciones (criterios) | 5 criterios con puntaje `{0, 1, 2}`, texto de observación y puntaje total (`0–10`) | `CC-19` a `CC-22` |
| `19` | Proveedor adjudicado | 1 proveedor ganador entre los 3 del cuadro + justificación si aplica | `CC-23` a `CC-25` |
| `20` | Fecha de entrega | Dato opcional capturado en el cuadro | `CC-26` |
| `21` | Elaboró | Usuario de Recursos Materiales que guardó el cuadro + espacio de firma física | `CC-10`, `CC-31`, `CC-32` |
| `22` | Supervisó | Espacio de firma física (Jefa del Depto. de Recursos Materiales y/o Servicios) | `CC-31`, `CC-32` |
| `23` | Autorizó | Espacio de firma física (Subdirectora de Servicios Administrativos) | `CC-31`, `CC-32` |
| `24` | V.B. del área solicitante | Espacio de firma física (nombre y firma del área solicitante) | `CC-31`, `CC-32` |

### 10.5 Comprobación aritmética con el ejemplo real (Folio `00267`)

En la evidencia del folio `00267` (Cuadro Comparativo del `17/07/2026` y Solicitud del `01/07/2026`), el proveedor adjudicado **MEXDAN SOLUCIONES S.A. DE C.V.** (9 puntos) cotizó:

| Concepto | Importe | Dónde queda en el sistema |
|---|---:|---|
| Suma de los 5 artículos sin IVA (`290.00 + 55.00 + 1,425.00 + 2,125.00 + 6,206.90`) | `$10,101.90` | Suma de `product_items.final_amount` (`CC-27`) y subtotal del cuadro (`CC-16`) |
| `IVA` | `+ $1,616.30` | Desglose fiscal del cuadro y de la solicitud (`CC-17`, `CC-28`) |
| `RET IVA` | `- $0.00` | Desglose fiscal (`0.00` por defecto si no se captura, `CC-17`, `CC-28`) |
| `RET ISR` | `- $0.00` | Desglose fiscal (`0.00` por defecto si no se captura, `CC-17`, `CC-28`) |
| **Total final (`Importe + IVA - Ret. IVA - Ret. ISR`)** | **`$11,718.20`** | `purchase_requests.total_amount_final` enviado a Suficiencia (`CC-28`) |

- El 3.er proveedor (`COMERCIALIZADORA ALLFIND S. DE R. DE C.V.`) dejó el artículo 2 sin cotizar (`CC-14`); al no ser el adjudicado, el cuadro es válido.
- El 2.º proveedor (`NANCY MAYA ESTRADA`) cotizó todos los artículos con un total menor (`$8,270.80 < $11,718.20`), por lo que bajo `CC-25` al adjudicar a Mexdan es obligatorio capturar justificación (como en el formato físico: evaluación superior de criterios / mejores condiciones para el Estado).

## 11. Pendientes por definir

1. Recursos materiales: el Cuadro Comparativo para `COMPRA_ADJ_DIRECTA` ya quedó definido en la [sección 10](#10-cuadro-comparativo-adjudicación-directa). Siguen pendientes:
   - La mecánica del estudio de mercado para `COMPRA_MOSTRADOR`, `COMPRA_LICITACION` y `COMPRA_INVITACION`.
   - Cómo se asigna cada solicitud a una persona dentro del área y si existe un caso "sin proveedor".
   - La propuesta de bandejas de Recursos Materiales rescatada del plan anterior del front (sin validar):

     | Bandeja | Contenido |
     |---|---|
     | Clasificación | `EN_REVISION_RECURSOS` sin `purchase_type` todavía |
     | Compras directas (mostrador) | `EN_REVISION_RECURSOS` + `COMPRA_MOSTRADOR` |
     | Adjudicación directa | `EN_REVISION_RECURSOS` + `COMPRA_ADJ_DIRECTA` |
     | Licitación | `EN_REVISION_RECURSOS` + `COMPRA_LICITACION` |
     | Invitación a 3 personas | `EN_REVISION_RECURSOS` + `COMPRA_INVITACION` |
     | Solicitudes aprobadas | `APRUEBA_SUFICIENCIA`, con búsqueda por folio y por tipo, por separado o juntos |

   - Recorrido propuesto para esa bandeja:
     1. Al clasificar, la solicitud sale de Clasificación y entra a la bandeja de su tipo.
     2. Al terminar el estudio, pasa a `PENDIENTE_APROBACION_SUFICIENCIA` y sale de la bandeja de su tipo.
     3. Cuando suficiencia la aprueba, aparece en Aprobadas.
   - Para esto el backend necesitaría:
     - filtros de `purchaseType` y "sin clasificar" en `/resources`,
     - los endpoints de clasificar y terminar el estudio (además de los propios del Cuadro Comparativo).
2. **Catálogo de proveedores y evaluación trimestral:** estructura de datos del catálogo de proveedores (datos generales, clasificación `Críticos` / `Únicos` / `Menores`, datos bancarios y fiscales) y el *Reporte de Evaluación a Proveedores* trimestral (rangos 8–10 Confiable / 5–7 No confiable).
3. **Corrección del Cuadro Comparativo antes de enviar a Suficiencia:** definir si se permitirá editar o reemplazar un Cuadro Comparativo ya guardado mientras la solicitud siga en `EN_REVISION_RECURSOS`, o si es inmutable una vez guardado (`CC-05`).
4. **Orden de compra (página 2 de la Solicitud de Materiales y/o Servicios):** flujo posterior a `APRUEBA_SUFICIENCIA` (captura de datos bancarios y fiscales del proveedor, fecha de pedido, factura y recepción a entera satisfacción).
5. Quién reparte el monto final entre las filas de distribución después del estudio de mercado, y cómo se muestran múltiples componentes o actividades en el PDF del Cuadro Comparativo.
   - **Solicitudes con varios componentes o actividades.** El backend ya las soporta: filas, un líder por fila, aprobación fila por fila y visibilidad por líder. Pero falta terminar de definir las reglas de negocio de ese caso. Mientras tanto, **el front solo captura una fila** (decisión del 22 de noviembre de 2026).
6. Qué documentos se generan cuando suficiencia aprueba los montos finales.
7. Alternativa al rechazo cuando el monto final excede el estimado: consultar a los líderes.
8. Admin:
   - Ver qué actividades y componentes ya tienen líder, y quién es.
   - Revocar roles.
   - Qué pasa si se reasigna un líder mientras hay solicitudes en curso (por ahora: no se permite).
9. Líder que nunca responde (timeouts).
