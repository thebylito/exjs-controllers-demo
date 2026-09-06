import { BaseSchema, Field } from 'exjs-controllers'
import { z } from 'zod'

import type { Todo } from './Todo.js'

// Each @Field is a Zod schema. Together they drive validation (BaseSchema.validate)
// and the JSON Schema that ends up in the OpenAPI document.

export class CreateTodoInput extends BaseSchema {
  @Field(z.string().min(1).max(120))
  title!: string

  @Field(z.string().max(1000).optional())
  description?: string
}

export class UpdateTodoInput extends BaseSchema {
  @Field(z.string().min(1).max(120).optional())
  title?: string

  @Field(z.string().max(1000).optional())
  description?: string

  @Field(z.boolean().optional())
  done?: boolean
}

export class TodoOutput extends BaseSchema {
  @Field(z.string())
  id!: string

  @Field(z.string())
  title!: string

  @Field(z.string().optional())
  description?: string

  @Field(z.boolean())
  done!: boolean

  @Field(z.string())
  createdBy!: string

  @Field(z.string())
  createdAt!: string

  @Field(z.string())
  updatedAt!: string

  static fromTodo(todo: Todo): TodoOutput {
    return TodoOutput.create(todo)
  }
}
