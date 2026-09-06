import { DefineUseCase, Inject, Injectable, type UseCase } from 'exjs-controllers'

import { NotFoundError } from '../../http/errors.js'
import { TodoOutput, UpdateTodoInput } from '../dtos.js'
import type { Todo } from '../Todo.js'
import { TodoRepository } from '../TodoRepository.js'

@Injectable()
@DefineUseCase()
export class UpdateTodo implements UseCase<UpdateTodoInput, TodoOutput> {
  constructor(@Inject(TodoRepository) private readonly todos: TodoRepository) {}

  execute(input: UpdateTodoInput, id: string): TodoOutput {
    const current = this.todos.findById(id)

    if (!current) {
      throw new NotFoundError(`Todo ${id} not found`)
    }

    const updated: Todo = {
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.done !== undefined ? { done: input.done } : {}),
      updatedAt: new Date().toISOString(),
    }

    return TodoOutput.fromTodo(this.todos.save(updated))
  }
}
