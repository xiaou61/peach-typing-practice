import dotenv from 'dotenv'
import pg from 'pg'

const envResult = dotenv.config()
const fileEnv = envResult.parsed ?? {}

const { Pool } = pg

const connectionString = fileEnv.DATABASE_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and set your PostgreSQL connection string.')
}

export const pool = new Pool({
  connectionString
})

export function query(text, params) {
  return pool.query(text, params)
}

export async function withTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
