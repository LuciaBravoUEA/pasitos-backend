# Especificación - Backend Pasitos Mágicos

## Objetivo

Proporcionar una API REST funcional que:
1. Permita autenticación de usuarios nativos (Android/iOS) con tokens Bearer
2. Gestione sesiones de usuarios autenticados
3. Sirva como base para endpoints de rutinas gamificadas

## Requisitos Funcionales

### RF-1: Autenticación Móvil
- Endpoint POST `/api/auth/mobile/login`
- Acepta `{ username, password }`
- Retorna token JWT + datos del usuario
- Usuario de prueba: `Evam` / `ExamplePassword123!`
- Login y registro consultan PostgreSQL mediante Prisma.
- Las contraseñas se almacenan como hashes `scrypt` con sal aleatoria, nunca en texto plano.

### RF-1.1: Registro móvil persistente
- Endpoint POST `/api/auth/mobile/register`
- Acepta `{ name, username, email, password }`.
- `username` y `email` son únicos sin distinguir mayúsculas en la entrada normalizada.
- La cuenta creada sobrevive al reinicio del proceso y puede iniciar sesión posteriormente.

### RF-2: Validación de Sesión
- Endpoint GET `/api/auth/session`
- Requiere header `Authorization: Bearer <token>`
- Retorna datos del usuario si token es válido

### RF-3: Health Check
- Endpoint GET `/api/health`
- Verifica que el backend está funcionando
- No requiere autenticación

### RF-4: Rutinas gamificadas
- `GET /api/rutinas?page&pageSize` lista las rutinas del usuario autenticado.
- `GET /api/rutinas/{routineId}` reconstruye el detalle por UUID.
- `POST /api/rutinas` crea una rutina para el usuario autenticado.
- Request de creación: `{ title, description?, category, points }`.
- `title`: texto recortado entre 2 y 80 caracteres.
- `description`: texto opcional de máximo 240 caracteres.
- `category`: uno de `ESCUELA`, `HOGAR`, `CALMA`, `AUTOCUIDADO`.
- `points`: entero entre 1 y 100.
- Validación semántica responde HTTP 422 con `{ error: { code: 'VALIDATION_ERROR', message, details[] } }`.
- Sin Bearer válido responde 401. Usuario autenticado sin `rutinas.read`/`rutinas.manage` responde 403.
- Para el entorno académico local, el rol `user` recibe ambos permisos en el token emitido por login/registro.
- Las rutinas se persisten en PostgreSQL mediante Prisma y pueden reconstruirse por UUID después de reiniciar el proceso.

## Requisitos Técnicos

### RT-1: CORS para Móvil
- Permitir requests desde:
  - `http://localhost:5173` (dev web)
  - `http://localhost:3000` (dev web)
  - `http://10.0.2.2:3000` (Android emulator)
- Headers: `Authorization`, `Content-Type`, `X-Correlation-ID`

### RT-2: Docker
- `docker-compose up` inicia:
  - PostgreSQL 16 (puerto 5432)
  - Keycloak (puerto 8080)
  - Next.js backend (puerto 3000)

### RT-3: TypeScript Estricto
- Todos los tipos definidos explícitamente
- No usar `any`
- `tsconfig.json` con `strict: true`

## Criterios de Aceptación

- [x] Backend iniciable con `docker-compose up`
- [x] Endpoint `/api/health` retorna `{ status: "ok", ... }`
- [x] Endpoint `/api/auth/mobile/login` autentica usuario
- [x] Endpoint `/api/auth/session` valida token
- [x] CORS configurado para móvil
- [x] Middleware Next.js maneja CORS
- [ ] Tests unitarios (próximo)
- [x] Base de datos Prisma para cuentas móviles
- [ ] Integración real Keycloak (próximo)

## Contratos de API

Ver [API Integration](../constitution/api-integration.md) en cliente móvil.

Todos los endpoints siguen formato:
```json
{
  "data": { /* respuesta */ },
  "meta": { "timestamp": "2026-08-30T..." }
}
```

Errores:
```json
{
  "error": "Descripción del error",
  "status": 400
}
```

## Correcci?n de autenticaci?n persistente (2026-09-20)

Autorizada por el usuario: corregir el login y conservar funcionamiento tras cerrar y abrir el IDE. Las sesiones se persistir?n en user_sessions, con token opaco aleatorio y hash SHA-256 en PostgreSQL. Cerrar sesi?n revoca el registro; renovar extiende una sesi?n a?n v?lida. Las cuentas no se modifican autom?ticamente al intentar iniciar sesi?n. El arranque de Docker ser? desacoplado de la terminal y regenerar? Prisma antes de iniciar Next. Se mantiene la caducidad de 24 horas.

Validaci?n: credenciales inv?lidas ? 401; login/registro ? sesi?n v?lida; sesi?n v?lida tras reiniciar; logout ? 401; token inv?lido/expirado ? 401. No se reutilizan credenciales de usuarios existentes en pruebas autom?ticas.
