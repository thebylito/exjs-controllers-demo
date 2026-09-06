import { Injectable, TraceSpan } from 'exjs-controllers'

import type { Todo } from './Todo.js'

export interface TodoFilter {
  done?: boolean
}

/**
 * In-memory store. `@Injectable()` makes it a singleton, so the controllers
 * and use cases below all share the same Map.
 */
@Injectable()
export class TodoRepository {
  private readonly todos = new Map<string, Todo>()

  // Any method can be traced; controller handlers and use cases are traced automatically.
  @TraceSpan('TodoRepository.findAll')
  findAll(filter: TodoFilter = {}): Todo[] {
    const all = [...this.todos.values()]
    return filter.done === undefined ? all : all.filter((todo) => todo.done === filter.done)
  }

  findById(id: string): Todo | undefined {
    return this.todos.get(id)
  }

  save(todo: Todo): Todo {
    this.todos.set(todo.id, todo)
    return todo
  }

  delete(id: string): boolean {
    return this.todos.delete(id)
  }

  clear(): number {
    const count = this.todos.size
    this.todos.clear()
    return count
  }
}
