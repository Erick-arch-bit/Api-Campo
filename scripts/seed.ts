import { db }                 from '../lib/db'
import { usuarios, zonas }   from '../drizzle/schema'
import { hashCodigo }        from '../lib/auth'
import { eq }                from 'drizzle-orm'

async function seed() {
  console.log('\n🌱 Iniciando seed SADERH v2.0...\n')

  // Las zonas ya vienen del SQL, solo verificamos
  const zonasExistentes = await db.select().from(zonas)
  console.log(`✅ Zonas en BD: ${zonasExistentes.length}`)

  // Crear SUPER_ADMIN con código especial 00001
  const CODIGO_ADMIN = '00001'
  const hashAdmin    = await hashCodigo(CODIGO_ADMIN)

  const [adminExiste] = await db
    .select({ id: usuarios.id_usuario })
    .from(usuarios)
    .where(eq(usuarios.email, 'admin@saderh.hidalgo.gob.mx'))
    .limit(1)

  if (!adminExiste) {
    await db.insert(usuarios).values({
      nombre_completo:               'Administrador SADERH',
      email:                         'admin@saderh.hidalgo.gob.mx',
      codigo_acceso:                 CODIGO_ADMIN,
      codigo_acceso_hash:            hashAdmin,
      rol:                           'SUPER_ADMIN',
      activo:                        true,
      puede_registrar_beneficiarios: true,
      bloqueado_revision:            false,
    })
    console.log('✅ SUPER_ADMIN creado')
  } else {
    console.log('ℹ️  SUPER_ADMIN ya existe — omitido')
  }

  console.log('\n══════════════════════════════════════')
  console.log('  SEED COMPLETADO')
  console.log('──────────────────────────────────────')
  console.log('  Login web (dashboard):')
  console.log('  Código de acceso: (consulta la BD o el email registrado)')
  console.log('  URL: http://localhost:3000')
  console.log('──────────────────────────────────────')
  console.log('  ⚠️  Cambia este código desde el panel')
  console.log('      web antes de pasar a producción')
  console.log('══════════════════════════════════════\n')

  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
