# Valoración Territorial — Frontend completo

Aplicación Angular que implementa los **15 casos de uso (CU-01 a CU-15)** del sistema de valoración territorial, consumiendo el backend `territorial_backend_flask`.

## Módulos implementados

| Módulo | Casos de uso | Pantallas |
|--------|--------------|-----------|
| 1 — Administración | CU-01 a CU-06 | Entidades, funcionarios, ciudadanos, categorías, comunas, barrios |
| 2 — Autenticación | CU-07, CU-08 | Login OAuth con Google + completar perfil + cerrar sesión |
| 3 — Gestión territorial | CU-09 a CU-11 | Mapa: demarcación, edición de polígono, seguimiento GPS |
| 4 — Anotaciones | CU-12 a CU-14 | Crear anotaciones, calificar, filtros por categoría |
| 5 — Reportes | CU-15 | Consultas inteligentes con ApexCharts |

## Requisitos

- Node.js 18+
- Backend Flask en `http://127.0.0.1:5000`

## Instalación y ejecución

```bash
cd "Proyecto 3/territorial-consultas"
npm install
```

**Backend:**

```bash
cd ../../territorial_backend-main/territorial_backend_flask
.\.venv\Scripts\activate
python scripts/seed.py   # primera vez
python run.py
```

**Frontend:**

```bash
npm start
```

Abre `http://localhost:4200/login`.

## Autenticacion con Google

### Google Cloud Console

1. Crea credenciales OAuth tipo **Aplicacion web**.
2. URI de redireccion autorizada: `http://localhost:4200/auth/callback`
3. Copia Client ID y Client Secret al `.env` del backend.

### Variables en `territorial_backend_flask/.env`

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
JWT_SECRET_KEY=una-clave-secreta-larga
FRONTEND_URL=http://localhost:4200
ADMIN_EMAILS=tu-correo@gmail.com
```

### Roles automaticos

| Correo | Rol |
|--------|-----|
| En `ADMIN_EMAILS` | administrador |
| En tabla `officials` | funcionario |
| En tabla `citizens` | ciudadano |
| No registrado | completar perfil como ciudadano |

Seed de prueba: funcionario `laura.gomez@manizales.gov.co`, ciudadano `carolina@example.com`.

## Roles de prueba

Tras configurar Google OAuth, el rol lo asigna el backend segun el correo:

- **administrador** — acceso a todo el módulo 1 y reportes
- **funcionario** — mapa, demarcación, seguimiento y reportes
- **ciudadano** — mapa, crear anotaciones y calificar

## Notas

- Microsoft y GitHub quedan como "proximamente".
- Consultas con lenguaje natural requieren `GEMINI_API_KEY` en el `.env` del backend.
- Las pruebas rápidas Pie/Bar/Line del módulo 5 funcionan sin Gemini.

## Referencias ApexCharts

- [Pie](https://apexcharts.com/angular-chart-demos/pie-charts/simple-pie/)
- [Bar](https://apexcharts.com/angular-chart-demos/bar-charts/basic-bar/)
- [Line](https://apexcharts.com/angular-chart-demos/line-charts/line-with-data-labels/)
