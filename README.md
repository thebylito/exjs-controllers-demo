# exjs-controllers demo

A small Todo API built with [`exjs-controllers`](https://github.com/thebylito/exjs-controllers). It exists to show the framework's features working together in one runnable project: declarative controllers, DTO validation with Zod, dependency injection, use cases, authentication/authorization, and OpenAPI documents split by audience.

Everything is in memory. Restart the server and the todos are gone.

## Requirements

- Node.js 22+
- Yarn 4 (`corepack enable`) — or any package manager; there is nothing Yarn-specific in the code

## Run

```bash
yarn install
yarn dev            # tsx watch src/main.ts → http://localhost:3000
```

| URL | What |
| --- | --- |
| `http://localhost:3000/docs` | Scalar UI for the public API (`/docs/openapi.json`) |
| `http://localhost:3000/docs/admin` | Scalar UI for the admin API (`/docs/admin/openapi.json`) |
| `http://localhost:3000/health` | Liveness probe, served but documented nowhere |

Other scripts: `yarn test` (Vitest, boots the app on a random port and talks HTTP), `yarn typecheck`, `yarn build` + `yarn start`.

## Credentials

Authentication is a static lookup in `src/auth/authentication.ts`. Swap it for JWT/session verification in a real app; the framework only asks for the `AuthenticationConfig` contract.

| Header | Principal | Permissions |
| --- | --- | --- |
| `Authorization: Bearer alice-token` | user Alice | `todos:write` |
| `Authorization: Bearer bob-token` | user Bob | none |
| `Authorization: Bearer admin-token` | user Admin | `todos:write`, `todos:admin` |
| `X-API-Key: demo-api-key` | API key "Nightly cleanup job" | `todos:admin` |

## Endpoints

| Method | Path | Auth | Document |
| --- | --- | --- | --- |
| `GET` | `/todos?done=true\|false` | public | default |
| `GET` | `/todos/:id` | public | default |
| `POST` | `/todos` | `todos:write` | default |
| `PATCH` | `/todos/:id` | `todos:write` | default |
| `DELETE` | `/todos/:id` | `todos:write` | default |
| `GET` | `/admin/todos/stats` | `todos:admin` | admin |
| `DELETE` | `/admin/todos` | `todos:admin`, API keys only | admin |
| `GET` | `/health` | public | none (group `internal`) |

### Try it

```bash
# 401: anonymous
curl -i -X POST localhost:3000/todos -H 'content-type: application/json' -d '{"title":"Buy milk"}'

# 201: authenticated with todos:write
curl -s -X POST localhost:3000/todos \
  -H 'authorization: Bearer alice-token' -H 'content-type: application/json' \
  -d '{"title":"Buy milk"}'

# 422: validation happens in the use case, issues come back in the body
curl -s -X POST localhost:3000/todos \
  -H 'authorization: Bearer alice-token' -H 'content-type: application/json' \
  -d '{"title":""}'

# 403 as a user, 200 with the API key (route restricted to kind "api-key")
curl -i -X DELETE localhost:3000/admin/todos -H 'authorization: Bearer admin-token'
curl -s -X DELETE localhost:3000/admin/todos -H 'x-api-key: demo-api-key'
```

## Where each feature lives

| Feature | File |
| --- | --- |
| Bootstrap: `createApplication` + `configureApplication`, logger, error handler, OpenAPI documents, Scalar | `src/app.ts`, `src/main.ts` |
| `@JsonController`, route decorators, `@Param` / `@QueryParam` / `@Body` / `@Res` | `src/todos/TodosController.ts` |
| DTOs: `BaseSchema` + `@Field(zodSchema)`, drives validation and the OpenAPI schemas | `src/todos/dtos.ts`, `src/admin/dtos.ts` |
| Dependency injection: `@Injectable` singleton repository, `@Inject` in constructors | `src/todos/TodoRepository.ts`, controllers, use cases |
| Use cases: `@DefineUseCase` validates the input and traces `execute` | `src/todos/use-cases/*.ts` |
| Authentication contract: `currentUserChecker`, `authorizationChecker`, `openApiSecuritySchemes` | `src/auth/authentication.ts` |
| `@Authorized(...permissions)`, `@Authorized({ permissions, kinds })`, `@CurrentUser`, `@CurrentApiKey` | `src/todos/TodosController.ts`, `src/admin/AdminTodosController.ts` |
| OpenAPI groups: `@JsonController(prefix, { group })`, `openapi.documents`, one Scalar per document | `src/admin/AdminTodosController.ts`, `src/app.ts` |
| Hidden group: routes served but excluded from every document | `src/health/HealthController.ts` |
| Plain `@Controller` returning `text/plain` | `src/health/HealthController.ts` |
| `@TraceSpan` on an arbitrary method | `src/todos/TodoRepository.ts` |
| JSON error responses for 401/403/404/422/500 | `src/http/errorHandler.ts`, `src/http/errors.ts` |
| Integration tests over real HTTP | `test/todos.test.ts` |

## Notes

- `tsconfig.json` enables `experimentalDecorators` because parameter decorators (`@Body`, `@Param`, `@Inject`, ...) only exist in the legacy TypeScript implementation. `emitDecoratorMetadata` is not needed.
- `express` and `zod` are peer dependencies of `exjs-controllers`, so they are installed explicitly here.
- The framework keeps a process-wide route registry, which is why the tests build the app once per file.
