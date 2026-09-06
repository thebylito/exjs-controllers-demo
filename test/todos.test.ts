import type { Application } from 'exjs-controllers'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

let app: Application
let baseUrl: string

const alice = { authorization: 'Bearer alice-token' }
const bob = { authorization: 'Bearer bob-token' }
const admin = { authorization: 'Bearer admin-token' }
const apiKey = { 'x-api-key': 'demo-api-key' }
const json = { 'content-type': 'application/json' }

// The framework keeps a global registry of routes, so the app is built once
// for the whole file instead of once per test.
beforeAll(async () => {
  app = await createApp({ logger: false })
  await new Promise<void>((resolve) => app.listen(0, resolve))

  const address = app.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(
  () => new Promise<void>((resolve, reject) => app.close((error) => (error ? reject(error) : resolve()))),
)

function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init)
}

async function createTodo(title: string, headers: Record<string, string> = alice) {
  const response = await request('/todos', {
    method: 'POST',
    headers: { ...json, ...headers },
    body: JSON.stringify({ title }),
  })
  expect(response.status).toBe(201)
  return (await response.json()) as { id: string; title: string; done: boolean }
}

describe('Todo API', () => {
  it('starts empty', async () => {
    const response = await request('/todos')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  it('rejects anonymous writes with 401', async () => {
    const response = await request('/todos', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ title: 'nope' }),
    })
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: 'UnauthorizedError' })
  })

  it('rejects users without todos:write with 403', async () => {
    const response = await request('/todos', {
      method: 'POST',
      headers: { ...json, ...bob },
      body: JSON.stringify({ title: 'nope' }),
    })
    expect(response.status).toBe(403)
  })

  it('treats a missing body as an empty DTO (422, not 500)', async () => {
    const response = await request('/todos', { method: 'POST', headers: alice })
    expect(response.status).toBe(422)
    const body = (await response.json()) as { error: string; issues: Array<{ path: string[] }> }
    expect(body.error).toBe('UseCaseInputValidationError')
    expect(body.issues.map((issue) => issue.path)).toEqual([['title']])
  })

  it('validates the body through the use case (422 with issues)', async () => {
    const response = await request('/todos', {
      method: 'POST',
      headers: { ...json, ...alice },
      body: JSON.stringify({ title: '' }),
    })
    expect(response.status).toBe(422)
    const body = (await response.json()) as { error: string; issues: Array<{ path: string[] }> }
    expect(body.error).toBe('UseCaseInputValidationError')
    expect(body.issues.map((issue) => issue.path)).toEqual([['title']])
  })

  it('creates, reads, updates and deletes a todo', async () => {
    const created = await createTodo('Write the demo')
    expect(created).toMatchObject({ title: 'Write the demo', done: false })

    const fetched = await request(`/todos/${created.id}`)
    expect(fetched.status).toBe(200)
    expect(await fetched.json()).toMatchObject({ id: created.id, createdBy: 'u-1' })

    const updated = await request(`/todos/${created.id}`, {
      method: 'PATCH',
      headers: { ...json, ...alice },
      body: JSON.stringify({ done: true }),
    })
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({ id: created.id, done: true })

    const onlyDone = await request('/todos?done=true')
    expect(((await onlyDone.json()) as Array<{ id: string }>).map((todo) => todo.id)).toEqual([created.id])

    const deleted = await request(`/todos/${created.id}`, { method: 'DELETE', headers: alice })
    expect(deleted.status).toBe(204)

    const gone = await request(`/todos/${created.id}`)
    expect(gone.status).toBe(404)
    expect(await gone.json()).toMatchObject({ error: 'NotFoundError' })
  })

  it('exposes stats to admins only', async () => {
    await createTodo('Pending one')

    const forbidden = await request('/admin/todos/stats', { headers: alice })
    expect(forbidden.status).toBe(403)

    const allowed = await request('/admin/todos/stats', { headers: admin })
    expect(allowed.status).toBe(200)
    expect(await allowed.json()).toEqual({ total: 1, done: 0, pending: 1 })
  })

  it('restricts purge to API keys', async () => {
    const asUser = await request('/admin/todos', { method: 'DELETE', headers: admin })
    expect(asUser.status).toBe(403)

    const asApiKey = await request('/admin/todos', { method: 'DELETE', headers: apiKey })
    expect(asApiKey.status).toBe(200)
    expect(await asApiKey.json()).toEqual({ deleted: 1, requestedBy: 'Nightly cleanup job' })

    expect(await (await request('/todos')).json()).toEqual([])
  })

  it('serves the health check as text', async () => {
    const response = await request('/health')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(await response.text()).toBe('ok')
  })
})

describe('OpenAPI documents', () => {
  it('splits public and admin routes into separate documents', async () => {
    const publicDoc = (await (await request('/docs/openapi.json')).json()) as {
      info: { title: string }
      paths: Record<string, unknown>
    }
    const adminDoc = (await (await request('/docs/admin/openapi.json')).json()) as {
      info: { title: string }
      paths: Record<string, unknown>
    }

    expect(publicDoc.info.title).toBe('Todo API')
    expect(Object.keys(publicDoc.paths).sort()).toEqual(['/todos', '/todos/{id}'])

    expect(adminDoc.info.title).toBe('Todo API — Admin')
    expect(Object.keys(adminDoc.paths).sort()).toEqual(['/admin/todos', '/admin/todos/stats'])

    // group "internal" is not referenced by any document
    expect(publicDoc.paths).not.toHaveProperty('/health')
    expect(adminDoc.paths).not.toHaveProperty('/health')
  })

  it('documents security per route', async () => {
    const publicDoc = (await (await request('/docs/openapi.json')).json()) as {
      paths: Record<string, Record<string, { security?: unknown }>>
      components: { securitySchemes: Record<string, unknown> }
    }

    expect(publicDoc.paths['/todos']?.get?.security).toBeUndefined()
    expect(publicDoc.paths['/todos']?.post?.security).toEqual([{ bearerAuth: ['todos:write'] }])
    expect(Object.keys(publicDoc.components.securitySchemes).sort()).toEqual(['apiKey', 'bearerAuth'])
  })

  it('mounts one Scalar UI per document', async () => {
    for (const path of ['/docs', '/docs/admin']) {
      const response = await request(path)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
    }
  })
})
