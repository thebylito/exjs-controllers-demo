import { Controller, Get } from 'exjs-controllers'

/**
 * Plain @Controller: string results are sent as text/plain. The "internal"
 * group is not referenced by any entry in `openapi.documents`, so this route
 * works but is hidden from both OpenAPI documents.
 */
@Controller('/health', { group: 'internal' })
export class HealthController {
  @Get('/', { summary: 'Liveness probe' })
  check() {
    return 'ok'
  }
}
