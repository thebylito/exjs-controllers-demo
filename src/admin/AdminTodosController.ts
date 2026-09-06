import {
  Authorized,
  CurrentApiKey,
  Delete,
  Get,
  Inject,
  JsonController,
} from 'exjs-controllers'

import type { ApiKey } from '../auth/authentication.js'
import { TodoRepository } from '../todos/TodoRepository.js'
import { PurgeResultOutput, TodoStatsOutput } from './dtos.js'

/**
 * Admin API. `group: 'admin'` puts every route of this controller in the
 * "admin" OpenAPI document (/docs/admin) and keeps it out of the public one.
 */
@JsonController('/admin/todos', { group: 'admin' })
export class AdminTodosController {
  constructor(@Inject(TodoRepository) private readonly todos: TodoRepository) {}

  @Authorized('todos:admin')
  @Get('/stats', { summary: 'Todo statistics', tags: ['admin'], outputClass: TodoStatsOutput })
  stats() {
    const all = this.todos.findAll()
    const done = all.filter((todo) => todo.done).length

    return TodoStatsOutput.create({ total: all.length, done, pending: all.length - done })
  }

  // The object form of @Authorized also restricts which principal kinds may
  // call the route: a user with todos:admin gets 403 here, an API key passes.
  @Authorized({ permissions: ['todos:admin'], kinds: ['api-key'] })
  @Delete('/', {
    summary: 'Delete every todo',
    description: 'Restricted to API keys (machine clients).',
    tags: ['admin'],
    outputClass: PurgeResultOutput,
  })
  purge(@CurrentApiKey() apiKey: ApiKey) {
    return PurgeResultOutput.create({ deleted: this.todos.clear(), requestedBy: apiKey.label })
  }
}
