import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(currentDir, 'schema.sql')

try {
  const schema = await readFile(schemaPath, 'utf8')
  await pool.query(schema)
  console.log('Database migration complete.')
} catch (error) {
  console.error('Database migration failed.')
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
