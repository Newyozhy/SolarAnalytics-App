
# Plan de Implementación — Sistema de Gráficas SolarApp
**Versión:** 1.0 · **Fecha:** 2026-05-01

---

## Notas del usuario incorporadas

- ✅ Toggle de agrupamiento temporal (Días/Semanas/Meses) **solo en gráficas que apliquen** — no duplicar paneles
- ✅ El sistema mostrará **todo el período disponible** en los datos; solo excluirá sesiones con rendimientos anormalmente bajos (p.ej. primeros días de instalación/configuración) — esto debe ser automático con un umbral configurable
- ✅ La lógica de distribución horaria del Excel es solo una guía; **se buscará siempre la forma más eficiente** de producir el mismo resultado en Python
- ✅ El consumo base del sitio es **editable** por proyecto hasta que se encuentre la fuente en los CSV
- ✅ La fragmentación de sesiones (# interrupciones por día) se destacará automáticamente como indicador de calidad solar
- ✅ Se harán todos los cruces de `history_data.csv` que aporten información relevante

---

## 1. TAXONOMÍA — Categorías de Gráficas

Se proponen **5 categorías** que forman las pestañas/secciones del dashboard de análisis:

| # | Categoría | Ícono | Descripción |
|---|-----------|-------|-------------|
| **A** | **Generación Solar** | ☀️ | Todo lo relacionado con cuánto, cuándo y cómo genera el sistema fotovoltaico |
| **B** | **Consumo & Ahorro** | ⚡ | Comparativo red comercial antes/después de SPV, ahorro económico |
| **C** | **Baterías** | 🔋 | Estado de salud, SOC, ciclos de carga/descarga |
| **D** | **Sistema & Equipos** | 🔧 | Rendimiento por módulo SPU, temperatura, MPPT, balance de canales |
| **E** | **Alarmas & Eventos** | 🔔 | Timeline de alarmas, interrupciones, disponibilidad del sistema |

> Cada categoría es una **pestaña** en la vista de análisis del proyecto. El usuario navega entre ellas; no todas aparecen al mismo tiempo.

---

## 2. CATÁLOGO DE PANELES — Agrupamientos con Toggles

A continuación se muestra qué gráficas se consolidan en un único panel con controles internos. Esto reduce **22 gráficas** a **12 paneles** visibles.

---

### CATEGORÍA A — ☀️ Generación Solar

#### **Panel A-1: Producción Solar Diaria / Semanal / Mensual**
*Reemplaza: G-01 (Work Duration) + G-02 (kWh generados)*

Un solo `BarChart` con **2 controles:**
- **Toggle métrica** (radio buttons o tabs internos):
  - `⏱ Duración` → Horas de trabajo solar por período
  - `⚡ Energía` → kWh generados por período
- **Toggle agrupamiento temporal:**
  - `Días` · `Semanas` · `Meses`

**Métricas en tooltip:** kWh total del período · Promedio diario · # interrupciones del período · Eficiencia (kWh/h)

**Indicador automático de sesiones fragmentadas:** Si un día tiene ≥3 sesiones, aparece un punto rojo sobre la barra con tooltip "X interrupciones detectadas".

---

#### **Panel A-2: Perfil Horario de Generación**
*Reemplaza: G-03 (minutos/hora) + G-04 (kWh/hora) + G-05 (kWh acumulado/hora)*

Un `AreaChart` con **1 control de métrica:**
- `⏱ Minutos activos promedio por hora`
- `⚡ kWh promedio por hora`
- `⚡⚡ kWh totales acumulados por hora`

Eje X siempre fijo: horas 00:00–23:00.  
**Sin toggle temporal** (siempre muestra el promedio sobre el período completo disponible).  
**Selector de rango de fechas** opcional para recalcular sobre un sub-período.

> **Implementación eficiente en Python (alternativa al Excel):**
> ```python
> import pandas as pd
> df['start'] = pd.to_datetime(df['start_time'])
> df['end'] = pd.to_datetime(df['end_time'])
> df['kwh'] = df['PV Final'] - df['PV Initial']
>
> # Expandir cada sesión en sus horas usando pd.interval_range
> hourly = []
> for _, row in df.iterrows():
>     hours = pd.date_range(
>         row['start'].floor('H'), row['end'].floor('H'), freq='H'
>     )
>     span = (row['end'] - row['start']).total_seconds() / 3600
>     for h in hours:
>         # Minutos reales dentro de esa hora
>         h_start = max(row['start'], h)
>         h_end   = min(row['end'], h + pd.Timedelta('1H'))
>         mins = (h_end - h_start).total_seconds() / 60
>         kwh_share = row['kwh'] * (mins / 60) / span if span > 0 else 0
>         hourly.append({'hour': h.hour, 'minutes': mins, 'kwh': kwh_share})
>
> hourly_df = pd.DataFrame(hourly)
> result = hourly_df.groupby('hour').agg({'minutes':'mean','kwh':'mean'}).reset_index()
> ```
> Esto es O(n×24) vs la solución Excel que es O(n×24) pero con fórmulas masivas. En pandas con vectorización es ~100× más rápido para grandes datasets.

---

#### **Panel A-3: Heatmap Calendárico de Generación**
*G-21 — sin toggles, vista anual*

Estilo "GitHub contributions". Semanas en X, días en Y, color por kWh.  
**Click en un día** → abre detalle de ese día en Panel A-1.  
**Indicador de fragmentación:** Puntos de color en días con ≥3 sesiones.

---

### CATEGORÍA B — ⚡ Consumo & Ahorro

#### **Panel B-1: Perfil Horario de Consumo Comercial vs Generación**
*Reemplaza: G-06 (consumo ANTES) + G-07 (consumo CON SPV) + G-09 (carga vs generación)*

Un `ComposedChart` con **1 control de vista:**
- `📊 Comparativo` → Muestra 3 series en el mismo gráfico:
  - Línea "Consumo base 24h" (configurable: kWh/h del sitio)
  - Área "Generación solar promedio/h"
  - Área "Consumo neto de red = base − solar" (relleno diferencial en verde = zona de ahorro)
- `📈 Solo Solar` → Enfoca en la generación (mismo que Panel A-2 pero en este contexto)
- `💰 Ahorro proyectado` → Tabla con kWh ahorrados × tarifa kWh = $ ahorrado por período

**Campo editable:** `Consumo base (kWh/h)` — con nota: "Si el sistema detecta el valor en los datos, lo usará automáticamente".

> **Sobre el consumo base:** Investigar en `history_data.csv` → `DC Load: Load Power Consumption [kWh]`. Este campo tiene un acumulador que aumenta con el tiempo. El consumo horario real se puede derivar como `Δ(Load Power Consumption) / Δt`. Si es consistente, se elimina el campo editable.

**Sin toggle temporal** (eje X siempre = horas del día).  
**Selector de rango de fechas** para ver perfil en distintos períodos.

---

#### **Panel B-2: Resumen de Ahorro por Período**
*Nuevo — KPIs y tabla*

No es un gráfico de líneas sino un panel de KPIs + `BarChart` simple:
- KPIs: Total kWh generados · Total kWh ahorrados de red · % de autonomía solar · $ ahorrado (tarifa configurable)
- BarChart: kWh generados vs kWh consumidos de red por mes (2 barras agrupadas)
- **Toggle:** `Semanas` · `Meses`

---

### CATEGORÍA C — 🔋 Baterías

#### **Panel C-1: Estado de Baterías en el Tiempo**
*Reemplaza: G-08 (SOC) + G-15 (SOH) + G-16 (Voltaje DC)*

Un `LineChart` con **1 control de métrica:**
- `🔋 SOC (%)` → State of Charge — Battery_1 y Battery_2
- `❤️ SOH (%)` → State of Health
- `⚡ Voltaje DC (V)` → Con líneas de umbral LLVD1 (47V) y BLVD (46V)

**Toggle agrupamiento temporal:** `Días` · `Semanas` · `Meses` (promedio del período).  
**Alerta automática:** Si SOH < 80% → badge de advertencia en la pestaña "Baterías".

---

#### **Panel C-2: Eventos de Carga / Descarga**
*Nuevo — desde `batt_chg_rec.csv` y `batt_dischg_rec.csv`*

`BarChart` apilado mostrando por día:
- Barras verdes: kWh cargados (desde solar/red)
- Barras rojas: kWh descargados

**Toggle:** `Días` · `Semanas` · `Meses`.  
Tooltip: SOC inicial → SOC final · Duración del ciclo.

---

### CATEGORÍA D — 🔧 Sistema & Equipos

#### **Panel D-1: Rendimiento por Canal SPU**
*Reemplaza: G-10 (potencia entrada) + G-18 (energía acumulada por canal)*

Un panel con **2 sub-vistas:**
- `📊 Energía Total` → BarChart horizontal comparando los 8 canales (`SPU Power Total Generation[1-8]`). Canal con barra más corta = posible problema.
- `📈 Potencia en el Tiempo` → LineChart multiserie (8 líneas) de `V_in × I_in` por canal a lo largo del tiempo.

**Toggle agrupamiento** (solo en sub-vista "Potencia en el Tiempo"): `Días` · `Semanas`.

---

#### **Panel D-2: Eficiencia MPPT y Temperatura SPU**
*Reemplaza: G-11 (temperatura vs generación) + G-17 (MPPT heatmap)*

**2 sub-vistas con selector:**
- `🌡️ Temperatura vs Eficiencia` → ScatterChart: eje X = temperatura SPU, eje Y = kWh generados en esa hora. Punto de inflexión visible a ~45°C.
- `📡 Actividad MPPT` → Heatmap (canales × días): color = % tiempo en MPPT activo. Rojo = canal con problemas de rastreo.

---

#### **Panel D-3: Calidad de Energía AC (3 Fases)**
*G-19*

`LineChart` con 3 series (Fase 1, 2, 3) de corriente AC.  
**Toggle métrica:** `Corriente (A)` · `Potencia (kW)`.  
**Toggle agrupamiento:** `Días` · `Semanas` · `Meses`.

---

### CATEGORÍA E — 🔔 Alarmas & Eventos

#### **Panel E-1: Timeline de Alarmas**
*G-14 — desde `history_alarm.csv`*

`Gantt-style chart` o tabla agrupada por dispositivo × tiempo.  
**Filtros:**
- Por nivel: `Critical` `Major` `Minor` `Warning` (chips multiselect)
- Por dispositivo: dropdown
- Por rango de fechas: date picker

**KPIs en la cabecera:** Total alarmas · Alarmas críticas · MTBF (tiempo medio entre fallos).

---

#### **Panel E-2: Disponibilidad del Sistema Solar**
*Nuevo — combinación de solar_work_rec + history_alarm*

`BarChart` por día mostrando:
- % del día con generación solar activa
- Marcadores de alarmas críticas que coincidieron ese día

**Toggle:** `Días` · `Semanas`.

---

## 3. TABLA RESUMEN — De 22 gráficas a 12 paneles

| Panel | Categoría | Gráficas consolidadas | Controles internos |
|-------|-----------|----------------------|-------------------|
| **A-1** | ☀️ Generación | G-01, G-02 | Toggle métrica + Toggle temporal |
| **A-2** | ☀️ Generación | G-03, G-04, G-05 | Toggle métrica · Selector rango |
| **A-3** | ☀️ Generación | G-21 | Click-through a A-1 |
| **B-1** | ⚡ Consumo | G-06, G-07, G-09 | Toggle vista · Campo consumo base |
| **B-2** | ⚡ Consumo | Nuevo KPI | Toggle temporal |
| **C-1** | 🔋 Baterías | G-08, G-15, G-16 | Toggle métrica + Toggle temporal |
| **C-2** | 🔋 Baterías | Nuevo carga/descarga | Toggle temporal |
| **D-1** | 🔧 Sistema | G-10, G-18 | Toggle sub-vista + Toggle temporal |
| **D-2** | 🔧 Sistema | G-11, G-17 | Toggle sub-vista |
| **D-3** | 🔧 Sistema | G-19 | Toggle métrica + Toggle temporal |
| **E-1** | 🔔 Alarmas | G-14 | Filtros multi-nivel |
| **E-2** | 🔔 Alarmas | Nuevo disponibilidad | Toggle temporal |

> **Nota de diseño:** Los toggles de métrica y agrupamiento se implementan como componentes reutilizables (`<MetricToggle>` y `<GranularityToggle>`) que se inyectan en cualquier panel que los necesite. Esto garantiza UX consistente en todo el sistema.

---

## 4. PLAN DE FASES DE IMPLEMENTACIÓN

### FASE 1 — Backend: Motor de Cálculo (2-3 días)
Implementar en Python los cálculos que alimentan todos los paneles.

**Endpoint: `/api/v1/analysis/{project_id}/generation`**
```
GET ?granularity=day|week|month&metric=kwh|duration&date_from=&date_to=
```
- Calcula diario/semanal/mensual desde `solar_work_rec.csv`
- Detecta y marca días con ≥3 sesiones (fragmentación)
- Filtra outliers de inicio de instalación (umbral: `kwh < percentil_5` en los primeros 7 días)

**Endpoint: `/api/v1/analysis/{project_id}/hourly-profile`**
```
GET ?metric=minutes|kwh|kwh_cumulative&date_from=&date_to=
```
- Lógica pandas vectorizada para distribución horaria (código propuesto en Panel A-2)

**Endpoint: `/api/v1/analysis/{project_id}/consumption-profile`**
```
GET ?base_consumption_kwh_per_hour=12.34
```
- Cruza perfil horario solar con consumo base configurable
- Retorna: consumo_base[], solar_avg[], consumo_neto[]

**Endpoint: `/api/v1/analysis/{project_id}/battery`**
```
GET ?metric=soc|soh|voltage&granularity=day|week|month
```
- Desde `history_data.csv` filtrando `Battery_1` y `Battery_2`

**Endpoint: `/api/v1/analysis/{project_id}/alarms`**
```
GET ?level=1,2,3,4&device=&date_from=&date_to=
```
- Desde `history_alarm.csv`

---

### FASE 2 — Frontend: Categoría A (Generación Solar) (2-3 días)
Los paneles más importantes para el pitch a inversores.

- [ ] Componente `<GranularityToggle>` reutilizable
- [ ] Componente `<MetricToggle>` reutilizable
- [ ] **Panel A-1:** BarChart producción con doble toggle + indicador de fragmentación
- [ ] **Panel A-2:** AreaChart perfil horario con toggle métrica
- [ ] **Panel A-3:** Heatmap calendárico (puede usar `react-calendar-heatmap`)
- [ ] Integrar con endpoints de Fase 1

---

### FASE 3 — Frontend: Categoría B (Consumo & Ahorro) (2 días)
El argumento económico del pitch.

- [ ] **Panel B-1:** ComposedChart comparativo con campo editable consumo base
- [ ] **Panel B-2:** KPIs de ahorro + BarChart agrupado
- [ ] Lógica de tarifa configurable ($ por kWh)
- [ ] Investigar si `DC Load: Load Power Consumption` puede reemplazar el campo editable

---

### FASE 4 — Frontend: Categoría C (Baterías) (2 días)

- [ ] **Panel C-1:** LineChart SOC/SOH/Voltaje con alertas automáticas
- [ ] **Panel C-2:** BarChart apilado carga/descarga
- [ ] Badge de alerta en pestaña si SOH < 80%

---

### FASE 5 — Frontend: Categorías D y E (Sistema + Alarmas) (3-4 días)

- [ ] **Panel D-1:** Comparativo por canal SPU (horizontal bar + time series)
- [ ] **Panel D-2:** ScatterChart temperatura vs eficiencia + Heatmap MPPT
- [ ] **Panel D-3:** Gráfica trifásica AC
- [ ] **Panel E-1:** Timeline de alarmas con filtros
- [ ] **Panel E-2:** Disponibilidad diaria

---

### FASE 6 — Pulido y exportación (1-2 días)

- [ ] Export a PDF del informe completo (mismo layout del PPTX)
- [ ] Selector global de rango de fechas que aplica a todos los paneles activos
- [ ] Modo de comparación: seleccionar 2 períodos y ver side-by-side
- [ ] Guardar configuración del análisis en Supabase (consumo base, tarifa, filtros)

---

## 5. PRINCIPIOS DE DISEÑO PARA LOS CONTROLES

### Toggle de agrupamiento temporal
```
[ Días ]  [ Semanas ]  [ Meses ]   ← solo aparece en paneles que aplican
```
- Estilo: pill buttons, el activo con fondo `accent color`
- Posición: esquina superior derecha del panel
- Estado guardado por panel en `localStorage` (el usuario no pierde su selección al navegar)

### Toggle de métrica
```
[ ⏱ Duración ]  [ ⚡ Energía ]   ← cambia qué se grafica, mismo eje
```
- Mismo estilo que granularidad pero con ícono
- Puede combinarse con granularidad en una barra de controles compacta

### Selector de sub-vista (para paneles D-1, D-2, B-1)
```
┌─────────────────────────────────────────┐
│ ● Comparativo  ○ Solo Solar  ○ Ahorro   │  ← radio group estilo tab
└─────────────────────────────────────────┘
```

### Patrón general de panel
```
┌──────────────────────────────────────────────────────┐
│  Título del panel              [Métrica ▾] [Período ▾]│
│  Subtítulo / KPI destacado                            │
│                                                       │
│  [          GRÁFICA PRINCIPAL          ]              │
│                                                       │
│  ← Nota o insight automático del sistema             │
└──────────────────────────────────────────────────────┘
```
- El "insight automático" es texto generado por el backend:  
  *"Este sitio tuvo 23 días con interrupciones múltiples, mayormente los lunes."*

---

## 6. OPEN QUESTIONS

> [!IMPORTANT]
> **Q1 — Consumo base del sitio:** ¿Confirmas que `DC Load: Load Power Consumption [kWh]` (acumulador en `history_data.csv`) es la fuente correcta para calcular el consumo horario real del sitio? Si es así, se elimina el campo editable en Fase 3.

> [!IMPORTANT]
> **Q2 — Umbral de outliers de instalación:** ¿Con qué criterio descartar días atípicos del inicio? Propongo: si los primeros N días tienen una mediana de kWh < 30% de la mediana general del período, se marcan como "período de puesta en marcha" y se excluyen por defecto (con opción de incluirlos).

> [!IMPORTANT]
> **Q3 — Tarifa eléctrica:** ¿Se debe incluir un campo de tarifa ($ por kWh) editable por proyecto desde el inicio, o se deja para la Fase 6?

> [!NOTE]
> **Q4 — Paneles D (Sistema/Equipos):** ¿Confirmas que los datos de `SPCU_5` con los 8 canales SPU son representativos de todos los sitios, o hay sitios con diferente número de módulos/canales?
