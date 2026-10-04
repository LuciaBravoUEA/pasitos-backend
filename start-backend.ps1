$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Abre Docker Desktop y vuelve a ejecutar este script.' }
    docker compose up -d --no-deps pasitos-backend
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el backend.' }
    Write-Host 'Backend: http://localhost:3001. Puedes cerrar Visual Studio Code.'
    Write-Host 'Manten Docker Desktop y PostgreSQL activos.'
} finally {
    Pop-Location
}
