import { randomUUID } from 'node:crypto'

import { DefineUseCase, Inject, Injectable, type UseCase } from 'exjs-controllers'

import { CreateTodoInput, TodoOutput } from '../dtos.js'
import type { Todo } from '../Todo.js'
import { TodoRepository } from '../TodoRepository.js'

/**
 * `@DefineUseCase()` wraps `execute` so the first argument is validated
 * (`input.validate()`) before the body runs. Invalid input becomes a
 * `UseCaseInputValidationError` with status 422 and the Zod issues attached.
 */
@Injectable()
@DefineUseCase()
export class CreateTodo implements UseCase<CreateTodoInput, TodoOutput> {
  constructor(@Inject(TodoRepository) private readonly todos: TodoRepository) {}

  execute(input: CreateTodoInput, createdBy: string): TodoOutput {
    const now = new Date().toISOString()

    const todo: Todo = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      done: false,
      createdBy,
      createdAt: now,
      updatedAt: now,
    }

    return TodoOutput.fromTodo(this.todos.save(todo))
  }
}
