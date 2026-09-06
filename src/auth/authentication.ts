import type { AuthenticationConfig, ResolvedPrincipal } from 'exjs-controllers'

export interface User {
  id: string
  name: string
  permissions: string[]
}

export interface ApiKey {
  id: string
  label: string
  permissions: string[]
}

export type Principal = User | ApiKey

// Demo credentials. A real application would verify a JWT or session cookie
// and look API keys up in a database. exjs-controllers only defines the
// contract below; how principals are resolved is entirely up to you.
const usersByToken: Record<string, User> = {
  'alice-token': { id: 'u-1', name: 'Alice', permissions: ['todos:write'] },
  'bob-token': { id: 'u-2', name: 'Bob', permissions: [] },
  'admin-token': { id: 'u-3', name: 'Admin', permissions: ['todos:write', 'todos:admin'] },
}

const apiKeysByValue: Record<string, ApiKey> = {
  'demo-api-key': { id: 'k-1', label: 'Nightly cleanup job', permissions: ['todos:admin'] },
}

export const authentication: AuthenticationConfig<Principal> = {
  // Who is calling? Return { principal, kind } or null for anonymous.
  // Only runs on routes that use @Authorized, @CurrentUser or @CurrentApiKey.
  currentUserChecker: ({ request }): ResolvedPrincipal<Principal> | null => {
    const authorization = request.get('authorization')
    if (authorization?.startsWith('Bearer ')) {
      const user = usersByToken[authorization.slice('Bearer '.length)]
      return user ? { principal: user, kind: 'user' } : null
    }

    const apiKey = request.get('x-api-key')
    if (apiKey) {
      const key = apiKeysByValue[apiKey]
      return key ? { principal: key, kind: 'api-key' } : null
    }

    return null
  },

  // Does the principal satisfy the permissions listed in @Authorized(...)?
  authorizationChecker: (_action, principal, _kind, requiredPermissions) =>
    requiredPermissions.every((permission) => principal.permissions.includes(permission)),

  // Documented in OpenAPI and used by Scalar's "Authentication" panel.
  openApiSecuritySchemes: {
    bearerAuth: {
      scheme: { type: 'http', scheme: 'bearer' },
      kinds: ['user'],
    },
    apiKey: {
      scheme: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      kinds: ['api-key'],
    },
  },
}
