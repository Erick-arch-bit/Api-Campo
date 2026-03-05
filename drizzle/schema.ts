import {
  pgTable, integer, varchar, text, boolean, timestamp,
  decimal, smallint, jsonb, uuid, char, unique, index,
} from 'drizzle-orm/pg-core'

// ── 1. ZONAS ──────────────────────────────────────────────────────
export const zonas = pgTable('zonas', {
  id_zona:     integer('id_zona').primaryKey().generatedAlwaysAsIdentity(),
  nombre:      varchar('nombre', { length: 100 }).notNull().unique(),
  descripcion: text('descripcion'),
})

// ── 2. USUARIOS ───────────────────────────────────────────────────
export const usuarios = pgTable('usuarios', {
  id_usuario:                    integer('id_usuario').primaryKey().generatedAlwaysAsIdentity(),
  nombre_completo:               varchar('nombre_completo', { length: 150 }).notNull(),
  email:                         varchar('email', { length: 100 }).notNull().unique(),
  // LOGIN v2.0: código de 5 dígitos único — NO hay password separada
  codigo_acceso:                 char('codigo_acceso', { length: 5 }).notNull().unique(),
  codigo_acceso_hash:            varchar('codigo_acceso_hash', { length: 255 }).notNull(),
  rol:                           varchar('rol', { length: 20 }).notNull(),
  especialidad:                  varchar('especialidad', { length: 30 }),
  id_zona:                       integer('id_zona').references(() => zonas.id_zona, { onDelete: 'set null' }),
  activo:                        boolean('activo').default(true),
  puede_registrar_beneficiarios: boolean('puede_registrar_beneficiarios').default(false),
  bloqueado_revision:            boolean('bloqueado_revision').default(false),
  foto_perfil_url:               varchar('foto_perfil_url', { length: 500 }),
  ultimo_acceso:                 timestamp('ultimo_acceso'),
  push_token:                    varchar('push_token', { length: 255 }),
  fecha_creacion:                timestamp('fecha_creacion').defaultNow(),
}, (t) => [
  index('idx_usuarios_email').on(t.email),
  index('idx_usuarios_codigo').on(t.codigo_acceso),
  index('idx_usuarios_rol').on(t.rol),
])

// ── 3. BENEFICIARIOS ──────────────────────────────────────────────
export const beneficiarios = pgTable('beneficiarios', {
  id_beneficiario:      integer('id_beneficiario').primaryKey().generatedAlwaysAsIdentity(),
  folio_saderh:         varchar('folio_saderh', { length: 50 }).unique(),
  curp:                 varchar('curp', { length: 18 }).unique(),
  nombre_completo:      varchar('nombre_completo', { length: 150 }).notNull(),
  municipio:            varchar('municipio', { length: 100 }).notNull(),
  localidad:            varchar('localidad', { length: 100 }).notNull(),
  cadena_productiva:    varchar('cadena_productiva', { length: 30 }),
  telefono_contacto:    varchar('telefono_contacto', { length: 20 }),
  latitud_predio:       decimal('latitud_predio', { precision: 10, scale: 8 }),
  longitud_predio:      decimal('longitud_predio', { precision: 11, scale: 8 }),
  id_usuario_registro:  integer('id_usuario_registro').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  origen_registro:      varchar('origen_registro', { length: 20 }).default('WEB'),
  uuid_movil_registro:  uuid('uuid_movil_registro'),
  estatus_sync:         varchar('estatus_sync', { length: 20 }).default('SINCRONIZADO'),
  documentos:           jsonb('documentos').default({}),
  estatus_beneficiario: varchar('estatus_beneficiario', { length: 30 }).default('ACTIVO'),
  total_visitas:        integer('total_visitas').default(0),
  fecha_registro:       timestamp('fecha_registro').defaultNow(),
}, (t) => [
  index('idx_beneficiarios_usuario').on(t.id_usuario_registro),
  index('idx_beneficiarios_uuid').on(t.uuid_movil_registro),
  index('idx_beneficiarios_municipio').on(t.municipio),
])

// ── 4. ASIGNACIONES ───────────────────────────────────────────────
export const asignaciones = pgTable('asignaciones', {
  id_asignacion:         integer('id_asignacion').primaryKey().generatedAlwaysAsIdentity(),
  id_tecnico:            integer('id_tecnico').notNull().references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  id_beneficiario:       integer('id_beneficiario').references(() => beneficiarios.id_beneficiario, { onDelete: 'cascade' }),
  id_usuario_creo:       integer('id_usuario_creo').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  tipo_asignacion:       varchar('tipo_asignacion', { length: 20 }).notNull(),
  descripcion_actividad: text('descripcion_actividad'),
  prioridad:             varchar('prioridad', { length: 10 }).default('NORMAL'),
  fecha_limite:          timestamp('fecha_limite').notNull(),
  completado:            boolean('completado').default(false),
  fecha_completado:      timestamp('fecha_completado'),
  fecha_creacion:        timestamp('fecha_creacion').defaultNow(),
}, (t) => [
  index('idx_asignaciones_tecnico').on(t.id_tecnico),
  index('idx_asignaciones_completado').on(t.completado),
])

// ── 5. PERIODOS_CIERRE ────────────────────────────────────────────
export const periodos_cierre = pgTable('periodos_cierre', {
  id_periodo:       integer('id_periodo').primaryKey().generatedAlwaysAsIdentity(),
  anio:             integer('anio').notNull(),
  mes:              integer('mes').notNull(),
  cerrado:          boolean('cerrado').default(false),
  fecha_cierre:     timestamp('fecha_cierre'),
  id_usuario_cerro: integer('id_usuario_cerro').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  notas:            text('notas'),
}, (t) => [
  unique().on(t.anio, t.mes),
  index('idx_periodos_cerrado').on(t.cerrado),
])

// ── 6. BITACORAS ──────────────────────────────────────────────────
export const bitacoras = pgTable('bitacoras', {
  id_bitacora:             integer('id_bitacora').primaryKey().generatedAlwaysAsIdentity(),
  uuid_movil:              uuid('uuid_movil').notNull().unique(),
  id_usuario:              integer('id_usuario').notNull().references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  id_asignacion:           integer('id_asignacion').references(() => asignaciones.id_asignacion, { onDelete: 'set null' }),
  id_periodo:              integer('id_periodo').references(() => periodos_cierre.id_periodo, { onDelete: 'set null' }),
  fecha_hora_inicio:       timestamp('fecha_hora_inicio').notNull(),
  latitud:                 decimal('latitud', { precision: 10, scale: 8 }).notNull(),
  longitud:                decimal('longitud', { precision: 11, scale: 8 }).notNull(),
  precision_gps:           decimal('precision_gps', { precision: 5, scale: 2 }),
  fecha_hora_fin:          timestamp('fecha_hora_fin'),
  latitud_fin:             decimal('latitud_fin', { precision: 10, scale: 8 }),
  longitud_fin:            decimal('longitud_fin', { precision: 11, scale: 8 }),
  precision_gps_fin:       decimal('precision_gps_fin', { precision: 5, scale: 2 }),
  tipo_bitacora:           varchar('tipo_bitacora', { length: 20 }).notNull().default('BENEFICIARIO'),
  calificacion:            smallint('calificacion'),
  reporte:                 text('reporte'),
  firma_url:               varchar('firma_url', { length: 500 }),
  foto_confirmacion_url:   varchar('foto_confirmacion_url', { length: 500 }),
  datos_extendidos:        jsonb('datos_extendidos').default({}),
  estatus_sincronizacion:  varchar('estatus_sincronizacion', { length: 20 }).default('RECIBIDO'),
  dispositivo_info:        jsonb('dispositivo_info').default({}),
  fecha_registro_servidor: timestamp('fecha_registro_servidor').defaultNow(),
}, (t) => [
  index('idx_bitacoras_usuario').on(t.id_usuario),
  index('idx_bitacoras_uuid').on(t.uuid_movil),
  index('idx_bitacoras_periodo').on(t.id_periodo),
  index('idx_bitacoras_fecha').on(t.fecha_hora_inicio),
])

// ── 7. EVIDENCIAS ─────────────────────────────────────────────────
export const evidencias = pgTable('evidencias', {
  id_evidencia:         integer('id_evidencia').primaryKey().generatedAlwaysAsIdentity(),
  id_bitacora:          integer('id_bitacora').notNull().references(() => bitacoras.id_bitacora, { onDelete: 'cascade' }),
  url_archivo:          varchar('url_archivo', { length: 500 }).notNull(),
  cloudinary_public_id: varchar('cloudinary_public_id', { length: 300 }),
  tipo_archivo:         varchar('tipo_archivo', { length: 20 }),
  descripcion:          text('descripcion'),
  orden:                smallint('orden').default(0),
  fecha_subida:         timestamp('fecha_subida').defaultNow(),
}, (t) => [
  index('idx_evidencias_bitacora').on(t.id_bitacora),
])

// ── 8. NOTIFICACIONES ─────────────────────────────────────────────
export const notificaciones = pgTable('notificaciones', {
  id_notificacion: integer('id_notificacion').primaryKey().generatedAlwaysAsIdentity(),
  id_usuario:      integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  titulo:          varchar('titulo', { length: 150 }).notNull(),
  mensaje:         text('mensaje').notNull(),
  tipo:            varchar('tipo', { length: 20 }),
  origen:          varchar('origen', { length: 20 }).default('SISTEMA'),
  leida:           boolean('leida').default(false),
  fecha_creacion:  timestamp('fecha_creacion').defaultNow(),
  fecha_lectura:   timestamp('fecha_lectura'),
}, (t) => [
  index('idx_notificaciones_usuario').on(t.id_usuario),
  index('idx_notificaciones_leida').on(t.leida),
])

// ── 9. SYNC_LOG ───────────────────────────────────────────────────
export const sync_log = pgTable('sync_log', {
  id_sync:       integer('id_sync').primaryKey().generatedAlwaysAsIdentity(),
  uuid_movil:    uuid('uuid_movil').notNull(),
  tipo_registro: varchar('tipo_registro', { length: 20 }).default('BITACORA'),
  id_usuario:    integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  fecha_intento: timestamp('fecha_intento').defaultNow(),
  resultado:     varchar('resultado', { length: 20 }),
  detalle:       text('detalle'),
}, (t) => [
  index('idx_sync_log_usuario').on(t.id_usuario),
  index('idx_sync_log_resultado').on(t.resultado),
])

// ── 10. AUDITORIA ─────────────────────────────────────────────────
export const auditoria = pgTable('auditoria', {
  id_auditoria: integer('id_auditoria').primaryKey().generatedAlwaysAsIdentity(),
  id_usuario:   integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  tabla:        varchar('tabla', { length: 50 }).notNull(),
  id_registro:  integer('id_registro'),
  accion:       varchar('accion', { length: 20 }),
  antes:        jsonb('antes'),
  despues:      jsonb('despues'),
  fecha_accion: timestamp('fecha_accion').defaultNow(),
  ip_address:   varchar('ip_address', { length: 45 }),
}, (t) => [
  index('idx_auditoria_tabla').on(t.tabla),
  index('idx_auditoria_fecha').on(t.fecha_accion),
])

// ── 11. CONFIGURACION_SISTEMA ─────────────────────────────────────
export const configuracion_sistema = pgTable('configuracion_sistema', {
  id_config:           integer('id_config').primaryKey().generatedAlwaysAsIdentity(),
  clave:               varchar('clave', { length: 100 }).notNull().unique(),
  valor:               text('valor'),
  tipo:                varchar('tipo', { length: 20 }).default('texto'),
  descripcion:         varchar('descripcion', { length: 255 }),
  fecha_actualizacion: timestamp('fecha_actualizacion').defaultNow(),
  id_usuario_modifico: integer('id_usuario_modifico').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
})

// ── 12. PASSWORD_RESET_TOKENS ─────────────────────────────────────
export const password_reset_tokens = pgTable('password_reset_tokens', {
  id_token:       integer('id_token').primaryKey().generatedAlwaysAsIdentity(),
  id_usuario:     integer('id_usuario').notNull().references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  token:          varchar('token', { length: 128 }).notNull().unique(),
  tipo:           varchar('tipo', { length: 20 }).notNull().default('EMAIL'),
  usado:          boolean('usado').default(false),
  fecha_expira:   timestamp('fecha_expira').notNull(),
  fecha_uso:      timestamp('fecha_uso'),
  ip_solicitante: varchar('ip_solicitante', { length: 45 }),
  fecha_creacion: timestamp('fecha_creacion').defaultNow(),
}, (t) => [
  index('idx_prt_token').on(t.token),
  index('idx_prt_usuario').on(t.id_usuario),
])

// ── 13. SESIONES_APP ──────────────────────────────────────────────
export const sesiones_app = pgTable('sesiones_app', {
  id_sesion:        integer('id_sesion').primaryKey().generatedAlwaysAsIdentity(),
  id_usuario:       integer('id_usuario').notNull().references(() => usuarios.id_usuario, { onDelete: 'cascade' }),
  token_hash:       varchar('token_hash', { length: 64 }).notNull(),
  dispositivo:      varchar('dispositivo', { length: 200 }),
  push_token:       varchar('push_token', { length: 255 }),
  activa:           boolean('activa').default(true),
  ultima_actividad: timestamp('ultima_actividad').defaultNow(),
  fecha_creacion:   timestamp('fecha_creacion').defaultNow(),
}, (t) => [
  index('idx_sesiones_usuario').on(t.id_usuario),
  index('idx_sesiones_activa').on(t.activa),
])

// ── 14. ERROR_LOG ─────────────────────────────────────────────────
export const error_log = pgTable('error_log', {
  id_error:          integer('id_error').primaryKey().generatedAlwaysAsIdentity(),
  origen:            varchar('origen', { length: 20 }).notNull(),
  entorno:           varchar('entorno', { length: 10 }).notNull().default('production'),
  endpoint:          varchar('endpoint', { length: 255 }),
  metodo_http:       varchar('metodo_http', { length: 10 }),
  mensaje_error:     text('mensaje_error').notNull(),
  stack_trace:       text('stack_trace'),
  codigo_http:       integer('codigo_http'),
  id_usuario:        integer('id_usuario').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  uuid_movil:        uuid('uuid_movil'),
  payload_entrada:   jsonb('payload_entrada').default({}),
  info_extra:        jsonb('info_extra').default({}),
  ip_address:        varchar('ip_address', { length: 45 }),
  user_agent:        varchar('user_agent', { length: 500 }),
  resuelto:          boolean('resuelto').default(false),
  fecha_resolucion:  timestamp('fecha_resolucion'),
  notas_resolucion:  text('notas_resolucion'),
  fecha_error:       timestamp('fecha_error').defaultNow(),
}, (t) => [
  index('idx_error_log_fecha').on(t.fecha_error),
  index('idx_error_log_origen').on(t.origen),
  index('idx_error_log_resuelto').on(t.resuelto),
])

// ── 15. PLANTILLAS_BITACORA ───────────────────────────────────────
export const plantillas_bitacora = pgTable('plantillas_bitacora', {
  id_plantilla:        integer('id_plantilla').primaryKey().generatedAlwaysAsIdentity(),
  nombre:              varchar('nombre', { length: 100 }).notNull().unique(),
  descripcion:         text('descripcion'),
  contenido_html:      text('contenido_html').notNull(),
  es_predeterminada:   boolean('es_predeterminada').default(false),
  activa:              boolean('activa').default(true),
  id_usuario_creo:     integer('id_usuario_creo').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  id_usuario_modifico: integer('id_usuario_modifico').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  fecha_creacion:      timestamp('fecha_creacion').defaultNow(),
  fecha_modificacion:  timestamp('fecha_modificacion').defaultNow(),
}, (t) => [
  index('idx_plantillas_activa').on(t.activa),
  index('idx_plantillas_predeterminada').on(t.es_predeterminada),
])

// ── 16. FORMULARIOS_BENEFICIARIO ──────────────────────────────────
export const formularios_beneficiario = pgTable('formularios_beneficiario', {
  id_formulario:       integer('id_formulario').primaryKey().generatedAlwaysAsIdentity(),
  nombre:              varchar('nombre', { length: 100 }).notNull().unique(),
  descripcion:         text('descripcion'),
  campo_config:        jsonb('campo_config').notNull().default([]),
  es_activo:           boolean('es_activo').default(false),
  version:             integer('version').default(1),
  id_usuario_creo:     integer('id_usuario_creo').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  id_usuario_modifico: integer('id_usuario_modifico').references(() => usuarios.id_usuario, { onDelete: 'set null' }),
  fecha_creacion:      timestamp('fecha_creacion').defaultNow(),
  fecha_publicacion:   timestamp('fecha_publicacion'),
}, (t) => [
  index('idx_formularios_activo').on(t.es_activo),
])
