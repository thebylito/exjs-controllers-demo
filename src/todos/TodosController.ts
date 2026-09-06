import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  Inject,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParam,
  Res,
  type HttpResponse,
} from 'exjs-controllers'

import type { User } from '../auth/authentication.js'
import { NotFoundError } from '../http/errors.js'
import { CreateTodoInput, TodoOutput, UpdateTodoInput } from './dtos.js'
import { TodoRepository } from './TodoRepository.js'
import { CreateTodo } from './use-cases/CreateTodo.js'
import { UpdateTodo } from './use-cases/UpdateTodo.js'

/**
 * Public API. No group is declared, so these routes belong to the "default"
 * OpenAPI document. Controllers are resolved through the DI container, so the
 * constructor can ask for repositories and use cases directly.
 */
@JsonController('/todos')
export class TodosController {
  constructor(
    @Inject(TodoRepository) private readonly todos: TodoRepository,
    @Inject(CreateTodo) private readonly createTodo: CreateTodo,
    @Inject(UpdateTodo) private readonly updateTodo: UpdateTodo,
  ) {}

  @Get('/', {
    summary: 'List todos',
    description: 'Optionally filter with `?done=true` or `?done=false`.',
    tags: ['todos'],
    outputClass: TodoOutput,
    outputIsArray: true,
  })
  list(@QueryParam('done') done?: unknown) {
    return this.todos.findAll({ done: parseBoolean(done) }).map(TodoOutput.fromTodo)
  }

  @Get('/:id', { summary: 'Get a todo', tags: ['todos'], outputClass: TodoOutput })
  get(@Param('id') id: string) {
    return TodoOutput.fromTodo(this.findOrFail(id))
  }

  // @Authorized mounts the authentication middleware on this route only.
  // @Body(CreateTodoInput) hydrates the JSON body into the DTO; the use case validates it.
  @Authorized('todos:write')
  @Post('/', { summary: 'Create a todo', tags: ['todos'], outputClass: TodoOutput })
  create(
    @Body(CreateTodoInput) input: CreateTodoInput,
    @CurrentUser() user: User,
    @Res() response: HttpResponse,
  ) {
    response.status(201)
    return this.createTodo.execute(input, user.id)
  }

  @Authorized('todos:write')
  @Patch('/:id', { summary: 'Update a todo', tags: ['todos'], outputClass: TodoOutput })
  update(@Param('id') id: string, @Body(UpdateTodoInput) input: UpdateTodoInput) {
    return this.updateTodo.execute(input, id)
  }

  @Authorized('todos:write')
  @Delete('/:id', { summary: 'Delete a todo', tags: ['todos'] })
  remove(@Param('id') id: string, @Res() response: HttpResponse) {
    this.findOrFail(id)
    this.todos.delete(id)
    response.status(204).end()
  }

  private findOrFail(id: string) {
    const todo = this.todos.findById(id)

    if (!todo) {
      throw new NotFoundError(`Todo ${id} not found`)
    }

    return todo
  }
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}
