import { BaseSchema, Field } from 'exjs-controllers'
import { z } from 'zod'

export class TodoStatsOutput extends BaseSchema {
  @Field(z.number().int())
  total!: number

  @Field(z.number().int())
  done!: number

  @Field(z.number().int())
  pending!: number
}

export class PurgeResultOutput extends BaseSchema {
  @Field(z.number().int())
  deleted!: number

  @Field(z.string())
  requestedBy!: string
}
