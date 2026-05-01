# 📋 Pendientes para Completar la Migración (SolarApp)

A continuación se detalla todo el trabajo restante para finalizar la migración de Streamlit a la nueva arquitectura (React + FastAPI) y lograr el despliegue exitoso.

## 🔴 Bloqueo Actual (Inmediato)
- [ ] **Cambio de Entorno:** El usuario debe abrir la nueva carpeta (`C:\Users\Manolo\Desktop\Antigravity Proyects\ZTE\SPU Unit\SolarApp`) directamente en su editor de código (VS Code/Cursor) usando **Archivo > Abrir Carpeta**. *Esto es estrictamente necesario para que la IA tenga permisos de escritura y ejecución.*

---

## 🟡 Fase 2: Frontend (React + Vite + Tailwind)
Una vez resuelto el bloqueo, estas son las tareas de desarrollo de la interfaz:

- [x] **Dependencias Base:** Ejecutar `npm install` en la carpeta `/frontend` sin errores de Google Drive.
- [x] **Instalar Shadcn/ui:** Inicializar `shadcn/ui` y descargar los componentes base (Botones, Tarjetas, Tablas, etc.) para igualar el diseño del mockup.
- [x] **Conexión API (Axios):** Configurar cliente HTTP para consumir los endpoints de FastAPI (`/api/v1/projects`).
- [x] **Layout Principal:** Construir la barra lateral (Sidebar) con el logo de ZTE, navegación y el menú superior (Breadcrumbs).
- [x] **Explorador de Archivos (Drive):** 
    - Crear la vista de cuadrícula (Grid).
    - Crear la vista de lista (List).
    - Funcionalidad para navegar entre carpetas.
- [x] **Motor de Tareas en Segundo Plano:** Implementar la lógica (Polling) en React para consultar el estado del procesamiento pesado (usando el `job_id`).
- [x] **Dashboard de Resultados:** Renderizar las métricas y usar `plotly.js` para mostrar las gráficas de energía solar y baterías.

---

## 🟢 Fase 3: Integración y Limpieza
- [ ] **Pruebas E2E (End-to-End):** Validar que todo el flujo funcione desde el frontend: Login -> Explorar Drive -> Procesar Proyecto -> Descargar PPTX/Excel.
- [x] **Configuración CORS:** Asegurar que React pueda hablar con FastAPI sin bloqueos de seguridad en el navegador.
- [x] **Limpieza de Código Muerto:** Eliminar de forma segura los archivos antiguos de Streamlit para dejar el repositorio limpio:
    - Borrar `app.py`.
    - Borrar la carpeta `src/`.
    - Borrar `.streamlit/`.

---

## 🔵 Fase 4: Despliegue (Producción)
- [ ] **Backend (FastAPI):**
    - Subir el código a una plataforma como **Render**, **Railway** o **Koyeb**.
    - Configurar variables de entorno (Credenciales de Google Drive).
    - Configurar **UptimeRobot** o **cron-job.org** apuntando a `/api/health` para evitar que el servidor se duerma.
- [ ] **Frontend (React):**
    - Construir la versión de producción (`npm run build`).
    - Conectar el repositorio o subir los archivos estáticos a **Netlify**.
    - Añadir la URL de Netlify al `BACKEND_CORS_ORIGINS` del backend.
