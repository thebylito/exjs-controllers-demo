import {
  configureApplication,
  createApplication,
  type Application,
} from 'exjs-controllers'

import { AdminTodosController } from './admin/AdminTodosController.js'
import { authentication } from './auth/authentication.js'
import { HealthController } from './health/HealthController.js'
import { errorHandler } from './http/errorHandler.js'
import { TodosController } from './todos/TodosController.js'

export interface CreateAppOptions {
  /** Set to `false` to silence the HTTP logger (used by the tests). */
  logger?: boolean
}

/**
 * Builds the whole application. Kept separate from `main.ts` so tests can
 * boot the same app on an ephemeral port.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<Application> {
  const app = createApplication()

  return configureApplication(app, {
    controllers: [HealthController, TodosController, AdminTodosController],
    authentication,
    logger: options.logger === false ? false : { logFormat: 'pretty', levelFormat: 'label' },
    errorHandler,
    openapi: {
      documentation: {
        info: { title: 'Todo API', version: '1.0.0' },
      },
      // One OpenAPI document (and one Scalar UI) per group.
      //   default → routes without a group     → /docs/openapi.json, Scalar at /docs
      //   admin   → @JsonController(..., { group: 'admin' }) → /docs/admin/openapi.json, Scalar at /docs/admin
      // HealthController uses group "internal", which no document references,
      // so it is served but never documented.
      documents: {
        default: {},
        admin: { info: { title: 'Todo API — Admin', version: '1.0.0' } },
      },
    },
    enableScalar: true,
  })
}
