<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ pnpm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


### 1. Clonar e instalar dependencias

```bash
git clone git@github.com:erik-sostenes/sigmas-api.git
cd sigmas-api
pnpm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL=mysql://sigmas_user:sigmas_pass@localhost:3306/sigmas
```

Estos valores coinciden con los de `compose.yaml`. Si cambias el usuario, la contraseña o la base de datos allí, cámbialos también aquí.

> **Importante:** el esquema de la URL debe ser `mysql://` (no `mariadb://`), porque es el que reconoce `dbmate`. La API usa la misma variable y funciona igual con ese esquema.

Si el usuario o la contraseña tienen caracteres especiales (`@`, `:`, `/`, etc.), deben ir codificados en formato URL (por ejemplo, `@` se escribe `%40`).

### 3. Levantar la base de datos

```bash
docker compose up -d
```

Esto inicia un contenedor `sigmas-mariadb` (MariaDB 11) en el puerto `3306`, con la base de datos `sigmas` y el usuario `sigmas_user` ya creados. Los datos se guardan en el volumen `mariadb_data`, así que sobreviven a reinicios del contenedor.

### 4. Aplicar las migraciones

```bash
dbmate up
```

Esto crea las tablas definidas en `db/migrations/`. Si la base de datos aún no existe, `dbmate` la crea.

### 5. Compilar y levantar en desarrollo

La primera vez, compila una vez para generar la carpeta `dist/`:

```bash
pnpm build
pnpm dev
```

`pnpm dev` ejecuta en paralelo `tsc --watch` (recompila al guardar) y `node --watch` (reinicia el servidor cuando cambia `dist/`).

## Base de datos y migraciones (dbmate)

`dbmate` es una herramienta de migraciones que no depende del lenguaje: cada cambio al esquema es un archivo `.sql` con una parte para aplicarlo (`up`) y otra para revertirlo (`down`). Lee la conexión desde `DATABASE_URL` (también del archivo `.env`) y lleva el registro de las migraciones ya aplicadas en una tabla llamada `schema_migrations`.

### Comandos

| Comando                | Descripción                                                |
| ---------------------- | ---------------------------------------------------------- |
| `dbmate new nombre`    | Crea un archivo de migración vacío en `db/migrations/`     |
| `dbmate up`            | Crea la base de datos si no existe y aplica las pendientes |
| `dbmate status`        | Lista las migraciones aplicadas y las pendientes           |
| `dbmate down`      | Revierte la última migración aplicada                      |
| `dbmate wait`          | Espera a que la base de datos acepte conexiones            |
| `dbmate drop`          | Elimina la base de datos completa (solo para desarrollo)   |

### Estructura de una migración

Los archivos viven en `db/migrations/` y su nombre empieza con una marca de tiempo (`20261020173157_schema.sql`), que define el orden en que se aplican:

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE
);

-- migrate:down
DROP TABLE IF EXISTS users;
```

- Lo que va bajo `-- migrate:up` se ejecuta con `dbmate up`.
- Lo que va bajo `-- migrate:down` se ejecuta con `dbmate down`.

### Flujo para cambiar el esquema

1. Crea la migración: `dbmate new add_phone_to_users`
2. Edita el archivo generado en `db/migrations/` con el `up` y el `down`.
3. Aplícala: `dbmate up`
4. Si te equivocaste, revierte con `dbmate rollback`, corrige el archivo y vuelve a aplicar.

> **No edites una migración que ya se aplicó en otros entornos (staging, producción, compañeros de equipo).** Crea una nueva migración con el cambio.

### Empezar de cero

Para borrar todo y recrear la base de datos:

```bash
dbmate drop
dbmate up
```

Para borrar también los datos del contenedor (el volumen):

```bash
docker compose down -v
docker compose up -d
dbmate up
```

## Scripts disponibles

| Script              | Descripción                                                  |
| ------------------- | ------------------------------------------------------------ |
| `pnpm dev`          | Modo desarrollo: recompila y reinicia el servidor al guardar |
| `pnpm build`        | Compila el proyecto a `dist/` con `tsconfig.build.json`      |
| `pnpm start`        | Ejecuta la versión compilada (`dist/server/main.js`)         |
| `pnpm typecheck`    | Revisa los tipos sin generar archivos                        |
| `pnpm lint`         | Ejecuta ESLint                                               |
| `pnpm lint:fix`     | Ejecuta ESLint y corrige lo que pueda                        |
| `pnpm format`       | Formatea el código con Prettier                              |
| `pnpm format:check` | Verifica el formato sin modificar archivos                   |

Los comandos de `dbmate` están descritos en la sección de migraciones.

## Producción

```bash
pnpm install --frozen-lockfile
dbmate up
pnpm build
pnpm start
```

En producción se recomienda inyectar `DATABASE_URL` desde la plataforma (Docker, systemd, etc.) y quitar `--env-file=.env` del script `start` si no existe el archivo. Las credenciales de `compose.yaml` son solo para desarrollo local: no las uses en producción.

## Estructura del proyecto

```
.
├── compose.yaml         # MariaDB local con Docker
├── db
│   └── migrations       # Migraciones SQL (dbmate)
└── src
    ├── connections          # Conexiones a servicios externos (MariaDB)
    ├── controllers          # Controladores HTTP
    ├── dependency-injection # Contenedor de inyección de dependencias (diod)
    ├── repository           # Implementaciones de repositorios (MariaDB)
    ├── server               # App de Express, punto de entrada y rutas
    │   └── routes
    ├── services             # Lógica de negocio, entidades y contratos
    └── shared               # Utilidades compartidas
```

## Notas técnicas

- **Módulos**: el proyecto usa ESM (`"type": "module"`) con `module: nodenext`. Los imports relativos llevan extensión `.ts` (`import { X } from "./x.ts"`) y `rewriteRelativeImportExtensions` los convierte a `.js` al compilar.
- **Decoradores**: `diod` necesita `experimentalDecorators` y `emitDecoratorMetadata`, por eso se compila con `tsc` y no se ejecuta TypeScript directamente con Node.
- **Tipos de Node**: la versión mayor de `@types/node` debe coincidir con la de Node (`pnpm list @types/node`).

## Problemas frecuentes

**`Cannot find module .../dist/server/main.js` al correr `pnpm dev`**
`node` arrancó antes de que `tsc` generara `dist/`. Ejecuta `pnpm build` una vez y vuelve a lanzar `pnpm dev`.

**`TS2835: Relative import paths need explicit file extensions`**
Falta la extensión `.ts` en un import relativo. Los imports de carpeta tampoco existen: usa `./routes/index.ts` en lugar de `./routes`.

**`dbmate` no se conecta (`connection refused`)**
El contenedor puede no haber terminado de arrancar. Revisa `docker compose ps`, espera unos segundos o usa `dbmate wait`.

**`dbmate` dice `unsupported driver` o no encuentra la base de datos**
Revisa que `DATABASE_URL` empiece con `mysql://` y que exista el `.env` en la raíz del proyecto.

**Puerto 3306 ocupado**
Ya tienes un MySQL o MariaDB local corriendo. Detenlo o cambia el puerto en `compose.yaml` (por ejemplo `"3307:3306"`) y en el `DATABASE_URL`.
