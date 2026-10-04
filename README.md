# Pasitos Mágicos Backend 🎯

API REST para la plataforma de rutinas gamificadas para niños con TDAH.

## Requisitos previos

- Docker & Docker Compose
- Node.js 20+ (para desarrollo local sin Docker)
- npm

## Inicio rápido con Docker

```bash
docker-compose up
```

El backend estará disponible en: `http://localhost:3000`

**Servicios:**
- Next.js API: http://localhost:3000
- Keycloak: http://localhost:8080
- PostgreSQL: localhost:5432

**Credenciales por defecto:**
- Admin Keycloak: `admin` / `admin`
- Usuario de prueba: `evam.jampa` / `PasitosJampa#2026`

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Abierto en: `http://localhost:3000`

## Endpoints

### Autenticación

**POST /api/auth/mobile/login**
```json
{
  "username": "evam.jampa",
  "password": "PasitosJampa#2026"
}
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Reinicio del IDE y sesiones (2026-09-20)

Ejecutar `docker compose up -d --no-deps pasitos-backend`. El puerto es 3001. Mantener Docker Desktop y PostgreSQL activos. El backend tiene restart unless-stopped y no depende de la terminal. Prisma se genera al arrancar y la caché .next queda aislada del host. Las sesiones nuevas se guardan en PostgreSQL durante 24 horas; los tokens antiguos requieren un nuevo login. El login no resetea cuentas ni contraseñas.

Prueba reproducible con cuenta temporal propia: `docker exec pasitos-backend node scripts/auth-persistence-check.cjs before`, reiniciar backend, esperar health 200, ejecutar el mismo comando con `after`. El segundo paso elimina la cuenta temporal y sus sesiones. No imprime ni reutiliza credenciales de usuarios existentes.

## Rutinas completas — 2026-10-01

Autorizado como parte de la preparación del video de Pasitos Mágicos. Las rutinas se crean con tareas en una transacción; el detalle permite consultar pasos, PUT conserva cumplimientos y DELETE elimina la rutina propia con cascada. POST /api/rutinas/{id}/tareas añade pasos. El progreso incluye estrellas reales calculadas desde las rutinas completas del día.

Contrato vigente: ../Pasitos-Magicos/spec/constitution/api-integration.md. Especificación y plan: ../Pasitos-Magicos/spec/features/014-rutinas-persistentes-completas/.

Verificación desde el frontend: node scripts/verify-routine-flow.mjs. Crea cuentas temporales, prueba roles/aislamiento/CRUD/validaciones, reinicia el backend para comprobar persistencia y limpia solo sus cuentas.

El servidor y PostgreSQL corren en Docker con restart unless-stopped; el volumen PostgreSQL conserva datos aunque se cierre Visual Studio Code. Arranque: docker start pasitos-postgres pasitos-backend. La página auxiliar usa fuentes del sistema para no requerir descargas de Google durante el build.
