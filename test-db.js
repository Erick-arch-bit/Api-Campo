const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function test() {
  try {
    const client = await pool.connect()
    console.log('✅ Conexión exitosa a la base de datos')
    
    // Verificar tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('\n📋 Tablas en la base de datos:')
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    client.release()
    await pool.end()
  } catch (err) {
    console.error('❌ Error de conexión:', err.message)
    process.exit(1)
  }
}

test()
