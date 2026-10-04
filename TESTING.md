# Testing Guide - Pasitos Mágicos Backend

## Pruebas Manuales

### 1. Health Check (sin autenticación)

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "service": "pasitos-backend",
  "timestamp": "2026-08-30T...",
  "version": "0.1.0"
}
```

### 2. Login - Autenticación Móvil

```bash
curl -X POST http://localhost:3000/api/auth/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"username": "futbolista", "password": "ExamplePassword123!"}'
```

Respuesta esperada:
```json
{
  "data": {
    "token": "eyJz...",
    "user": {
      "id": "1",
      "username": "futbolista",
      "name": "Jugador de Fútbol",
      "email": "futbolista@pasitos.com",
      "roles": ["USER"]
    }
  },
  "meta": {
    "timestamp": "2026-08-30T..."
  }
}
```

### 3. Validar Sesión

Usa el token del login anterior:

```bash
curl http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer <TOKEN>"
```

Respuesta esperada:
```json
{
  "data": {
    "user": {
      "id": "1",
      "username": "futbolista",
      "email": "futbolista@pasitos.com",
      "roles": ["USER"]
    },
    "authenticated": true
  },
  "meta": {
    "timestamp": "2026-08-30T..."
  }
}
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## Tests desde la App Móvil

### Prerequisitos
1. Backend ejecutándose: `docker-compose up`
2. App compilada en `c:\Nueva carpeta\Pasitos-Magicos`
3. Emulator Android corriendo (Pixel 6)

### Pasos

1. **Abrir la app** en emulator
   ```bash
   cd c:\Nueva carpeta\Pasitos-Magicos
   adb shell am start -n com.pasitosmagicos.app/.MainActivity
   ```

2. **Login Screen**
   - Usuario: `futbolista`
   - Contraseña: `ExamplePassword123!`
   - Presionar "Iniciar Sesión"

3. **Esperado**
   - Si login es exitoso → Redirecciona a Home
   - Si falla → Muestra error "no se pudo iniciar sesión"

4. **Validar sesión**
   - Home debe mostrar nombre del usuario
   - Logout debe funcionar correctamente

## Postman Collection

Importar en Postman:

```json
{
  "info": {
    "name": "Pasitos Mágicos Backend",
    "version": "0.1.0"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/health"
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/mobile/login",
        "header": ["Content-Type: application/json"],
        "body": {
          "mode": "raw",
          "raw": "{\"username\": \"futbolista\", \"password\": \"ExamplePassword123!\"}"
        }
      }
    },
    {
      "name": "Get Session",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/auth/session",
        "header": ["Authorization: Bearer {{token}}"]
      }
    }
  ]
}
```

## Solución de Problemas

### Backend no responde

```bash
# Verificar que está corriendo
docker ps

# Ver logs
docker-compose logs pasitos-backend

# Reiniciar
docker-compose restart pasitos-backend
```

### Error CORS

- Verificar `middleware.ts` tiene origen correcto
- Para Android: debe incluir `http://10.0.2.2:3000`

### Error de autenticación

- Verificar credenciales: `futbolista` / `ExamplePassword123!`
- Verificar token no ha expirado
- Revisar logs: `docker-compose logs`
