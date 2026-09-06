import { logger } from 'exjs-controllers'

import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3009)
const app = await createApp()

app.listen(port, () => {
  logger.info(`Todo API listening on http://localhost:${port}`)
  logger.info(`Public reference: http://localhost:${port}/docs`)
  logger.info(`Admin reference:  http://localhost:${port}/docs/admin`)
})
