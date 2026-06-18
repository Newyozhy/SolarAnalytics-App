
# 📊 Informe de Gráficas — BOG.CocaCola 93 Solar Analysis
**Fecha de análisis:** 2026-05-01  
**Archivos fuente:** `BOG.CocaCola 93.pptx` · `bog.Cocacola solar_work_rec.xlsx` · `all_data Sergio CocaCola 93/`  
**Período de datos:** 21-Ene-2025 → 18-Jun-2025 (124 días)  
**Generación total registrada:** ~1,130+ kWh

---

## 1. ESTRUCTURA DEL INFORME PPTX (15 Slides)

| Slide | Título | Contenido |
|-------|--------|-----------|
| 1 | Portada | Logo Huawei/ZTE, título "BOG.CocaCola CLARO", tagline "Helps achieving net zero carbon" |
| 2 | Índice | Site Information / Solar Energy: PV / Configuration Parameters / Next Steps |
| 3 | Site Info (Equipos) | ZXDU68 W301 V6.0, CSU Serial, Rectifiers |
| 4 | Site Info (SPU) | 8 módulos ZXEPSS4810A con números de serie |
| 5 | Parámetros Config | LLVD1=47V, BLVD=46V, CPU threshold 80% |
| 6 | **Gráfica PV Work Duration** | 2 imágenes de gráficas de Excel |
| 7 | **Gráfica kWh Generados** | 2 imágenes + KPI "1.130,81 KWh en 93 días" |
| 8 | **Gráfica Minutos por Hora** | 1 imagen área chart promedio por hora |
| 9 | **Gráfica kWh por Hora** | 1 imagen área chart kWh promedio por hora |
| 10 | **Gráfica kWh Acumulado** | 1 imagen + KPI "1.130,81 kWh / 93 Días" |
| 11 | **Gráfica Consumo Comercial ANTES** | Consumo ENEL antes del 21-Ene-2025 |
| 12 | **Gráfica Consumo Comercial CON SPV** | Comparativo con energía solar |
| 13 | Real Data SPU | Imágenes de pantalla del equipo, totales por SPU |
| 14 | Next Steps | Tabla de sitios pendientes |
| 15 | Thank You | Cierre |

---

## 2. GRÁFICAS DEL EXCEL — Inventario Completo

### Hoja: `Work Duration`
**Gráfica 1 — `BarChart`: "Solar Energy - Work Duration per day"**
- **Tipo:** Barras verticales agrupadas por semana calendario
- **Eje X:** "Calendar Weeks - 2025" (semanas 4 a 17)
- **Eje Y:** "Work Duration — Hours per day"
- **Cálculo:** `SUMIF` que agrupa duración de trabajo solar por número de semana (`WEEKNUM`)
- **Fuente:** `'Work Duration'!$N$3:$N$14`
- **Derivación:** Desde `solar_work_rec.csv` → columna `PV Work Duration(Min)` dividida a horas y agrupada por día/semana

---

### Hoja: `solar_work_rec (2)`
**Gráfica 2 — `BarChart`: "PV Power Generated (kWh)"**
- **Tipo:** Barras verticales agrupadas por semana calendario
- **Eje X:** "Calendar Weeks - 2025"
- **Eje Y:** "PV Power Generated (kWh)"
- **Cálculo:** `SUMIF` por semana de la energía neta = `Final kWh − Initial kWh`
- **Fuente:** `'solar_work_rec (2)'!$O$3:$O$14`
- **Extra:** También se calcula `kWh/hora` = `(Final-Inicial) / (Duración en horas)`

---

### Hoja: `Chart minutes`
**Gráfica 3 — `LineChart`: (sin título explícito)**
- **Tipo:** Línea doble
- **Serie 1 y 2:** `'Chart minutes'!$AD$146:$BA$146`
- **Propósito:** Comparación de minutos de generación activa por franja horaria

**Gráfica 4 — `AreaChart`: "Average time (minutes) 21-Jan to 23-Apr [93 days]"**
- **Tipo:** Área rellena (promedio por hora del día)
- **Eje X:** Horas del día (00:00 a 23:00)
- **Eje Y:** Minutos promedio de generación solar activa en esa hora
- **Cálculo:** Para cada registro solar, marca con `TRUE/FALSE` si la sesión cubre cada franja horaria, luego distribuye proporcionalmente los minutos; finalmente `AVERAGE` de todos los días
- **Fuente:** `'Chart minutes'!$BE$98:$CB$98`

---

### Hoja: `Chart KWh`
**Gráfica 5 — `AreaChart`: "PV Power Generated [KWh] 21-Jan to 23-Apr [93 days]"**
- **Tipo:** Área por hora del día (distribución proporcional de kWh)
- **Eje X:** Horas 00:00–23:00
- **Eje Y:** kWh promedio generados en cada franja horaria
- **Cálculo:** Misma lógica que Chart minutes pero ponderando los kWh generados por sesión proporcionalmente a las horas cubiertas
- **Fuente:** `'Chart KWh'!$CI$96:$DF$96`

**Gráfica 6 — `AreaChart`: "PV Power Generated [KWh] cummulated 21-Jan to 23-Apr [93 days]"**
- **Tipo:** Área acumulada por hora del día
- **Eje Y:** kWh totales acumulados (suma de todos los días) por franja horaria
- **Fuente:** `'Chart KWh'!$CI$97:$DF$97`

---

### Hoja: `Utility Consumption`
**Gráfica 7 — `AreaChart`: "PV Power Generated [KWh] 21-Jan to 23-Apr [93 days]"** *(copia enriquecida)*
- Igual que Gráfica 5 pero en contexto con consumo comercial

**Gráfica 8 — `AreaChart`: "PV Power Generated [KWh] cummulated"** *(copia enriquecida)*
- Igual que Gráfica 6

**Gráfica 9 — `LineChart`: "Consumo Energía Comercial antes del 21 enero 2025 BOG. CocaCola"**
- **Tipo:** Línea
- **Eje X:** "Hours of day" (00:00–23:00)
- **Eje Y:** "Consumo Energía Comercial [KWh]"
- **Dato clave:** Valor fijo de `12.34 kWh` por hora (consumo base del sitio antes de SPV)
- **Fuente:** `'Utility Consumption'!$CI$99:$DF$99`
- **Representación:** Línea plana a 12.34 kWh (consumo constante 24/7 de la estación base)

**Gráfica 10 — `AreaChart`: "Consumo Energía Comercial BOG. CocaCola"**
- **Tipo:** Área
- **Serie:** "Consumo Energía comercial con SPV"
- **Eje X:** Horas del día
- **Eje Y:** kWh consumidos de la red comercial (ENEL) después de descontar generación solar
- **Cálculo:** `Consumo_comercial[hora] = Consumo_base[hora] − kWh_solar_promedio[hora]`
  - Formula Excel: `=CIx99 − CIx96` para cada hora x
- **Fuente:** `'Utility Consumption'!$CI$100:$DF$100`
- **Mensaje clave:** Muestra cuántas horas del día el panel solar "reemplaza" consumo de la red

---

## 3. DATOS DISPONIBLES EN LOS CSV BRUTOS

### `solar_work_rec.csv` — 168 sesiones / 124 días
| Campo | Descripción |
|-------|-------------|
| `start_time` | Inicio de sesión solar |
| `end_time` | Fin de sesión solar |
| `PV Work Duration(Min)` | Minutos activo ese período |
| `PV Initial Power Generation(kWh)` | Contador acumulado al inicio |
| `PV Final Power Generation(kWh)` | Contador acumulado al final |
| **Derivado** | `kWh generados = Final − Inicial` |

**Rango de fechas real:** 15-Feb-2025 → 18-Jun-2025  
**Pico diario máximo:** ~12.60 kWh (17-Feb-2025)  
**Mínimo diario:** ~1.04 kWh (25-Feb-2025, día nublado con 4 interrupciones)

---

### `history_data.csv` — 307 señales únicas (>400,000 registros)
Señales clave para nuevas gráficas:

| Dispositivo | Señales de interés |
|-------------|-------------------|
| **Solar Energy** | `PV Power Total Generation [kWh]`, `PV Work Duration [Min]` |
| **SPCU_5** | `SPU Input Voltage[1-8] [V]`, `SPU Output Current[1-8] [A]`, `SPU Energy[1-8] [kWh]`, `SPU Temperature[1-8] [°C]`, `SPU MPPT Status[1-8]`, `SPU Power Total Generation[1-8] [kWh]` |
| **Power System** | `DC Voltage [V]`, `Load Total Current [A]`, `Battery Total Current [A]`, `System AC Voltage[1-3] [V]`, `System AC Current[1-3] [A]`, `PU Total Output Power [kW]`, `PV Power Status` |
| **Battery_1 / Battery_2** | `Battery Voltage [V]`, `Battery Current [A]`, `Battery Present SOC [%]`, `Battery SOH [%]`, `Battery Discharge Power [kWh]`, `Battery Charge Power [kWh]` |
| **NFBBMS_2/5/6** | `Li Battery Voltage [V]`, `Battery SOC [%]`, `Battery SOH [%]`, `Battery Board Temperature [°C]` |
| **Mains_1** | `MAINS Status`, `MAINS Work Duration [Min]`, `MAINS Energy Production [kWh]` |
| **DC Load** | `Load Power Consumption [kWh]` |
| **System Running Environment** | `Environment Temperature [°C]`, `Environment Humidity [%]` |

---

### `mains_on_rec.csv` — 5 sesiones de red comercial
| Campo | Descripción |
|-------|-------------|
| `start_time` / `end_time` | Período de conexión a red comercial |
| `MAINS Work Duration(Min)` | Minutos activa la red |
- Sesión más larga: 10-Mar al 25-Abr = 66,586 min (~46 días continuos en red)

---

### `history_alarm.csv` — 7,091 alarmas
| Campo | Descripción |
|-------|-------------|
| `device_name` | Equipo que generó la alarma |
| `signal_name` | Tipo de alarma |
| `start_time` / `end_time` | Duración del evento |
| `level` | 1=Critical, 2=Major, 3=Minor, 4=Warning |

---

### `batt_chg_rec.csv` / `batt_dischg_rec.csv`
- Registros de eventos de carga/descarga por batería individual
- Voltaje inicial/final, SOC inicial/final, energía transferida

---

## 4. GRÁFICAS OBLIGATORIAS (del PPTX/Excel) — Implementación en SolarApp

### G-01: Duración de Trabajo Solar por Semana Calendario (BarChart)
- **Fuente CSV:** `solar_work_rec.csv`
- **Cálculo:** Agrupar sesiones por día → sumar `PV Work Duration(Min)` → convertir a horas → agrupar por semana calendario (`isoweek`)
- **Agrupamiento:** **Días / Semanas calendario / Meses** ← botón toggle requerido
- **Tooltip:** Promedio de horas/día dentro del período seleccionado
- **Chart type:** Recharts `BarChart`

### G-02: Energía Solar Generada por Período (BarChart)
- **Fuente CSV:** `solar_work_rec.csv`
- **Cálculo:** `kWh_diario = Final_kWh − Inicial_kWh` por día, luego agrupar
- **Agrupamiento:** **Días / Semanas / Meses** con promedio diario del período
- **Adicionales en tooltip:** # sesiones del día, duración total, eficiencia (kWh/hora)
- **Chart type:** Recharts `BarChart`

### G-03: Minutos de Generación por Franja Horaria — Promedio Diario (AreaChart)
- **Fuente CSV:** `solar_work_rec.csv`
- **Lógica (replicar Excel):** Para cada sesión (`start → end`), para cada hora 00–23: ¿cuántos minutos de esa hora estuvieron dentro del intervalo? Acumular y promediar sobre todos los días
- **Eje X:** Horas del día (00:00–23:00)
- **Eje Y:** Minutos promedio de generación activa
- **Chart type:** Recharts `AreaChart` con gradiente

### G-04: Potencia Solar Generada por Franja Horaria — kWh Promedio (AreaChart)
- **Fuente CSV:** `solar_work_rec.csv`
- **Lógica:** Igual que G-03 pero distribuir los kWh generados en la sesión proporcionalmente a las horas cubiertas, luego promediar por hora
- **Eje X:** Horas del día
- **Eje Y:** kWh promedio generados en esa hora
- **Chart type:** Recharts `AreaChart`

### G-05: Energía Solar Acumulada por Hora del Día (AreaChart)
- **Fuente CSV:** `solar_work_rec.csv`
- **Lógica:** Suma total (no promedio) de kWh distribuidos por hora, sobre todo el período
- **Eje Y:** kWh totales históricos en esa franja
- **Chart type:** Recharts `AreaChart` con fill acumulativo

### G-06: Consumo Energía Comercial ANTES de SPV (LineChart)
- **Dato:** Consumo base del sitio por hora (12.34 kWh/h en CocaCola 93)
- **Fuente:** Ingresado manualmente por usuario o calculado de `DC Load: Load Power Consumption`
- **Representación:** Línea plana o con variación horaria
- **Eje X:** Horas del día
- **Chart type:** Recharts `LineChart`

### G-07: Consumo Energía Comercial CON SPV — Comparativo (AreaChart)
- **Lógica:** `Consumo_red[hora] = Consumo_base[hora] − kWh_solar_promedio[hora]`
- **Series:** 2 líneas — "Antes SPV" vs "Con SPV"
- **Áreas:** Rellenar la diferencia (ahorro solar) con color verde
- **Chart type:** Recharts `ComposedChart` (Area + Line)
- **KPI visible:** Total kWh ahorrados en el período

---

## 5. GRÁFICAS ADICIONALES PROPUESTAS (Nuevas)

### G-08: Estado de Batería a lo Largo del Tiempo (LineChart Multi-serie)
- **Fuente:** `history_data.csv` → `Battery_1/Battery_2: Battery Present SOC [%]`
- **Eje X:** Timestamp
- **Series:** SOC% Batería 1, SOC% Batería 2
- **Agrupamiento:** Días/Semanas/Meses (promedio SOC)
- **Indicadores:** Líneas de umbral LLVD1 (47V) y BLVD (46V)
- **Valor:** Visualizar degradación de batería en el tiempo, correlacionar SOC bajo con períodos sin sol

### G-09: Curva de Carga vs Generación Solar (ComposedChart)
- **Fuente:** `history_data.csv` → `DC Load: Load Power Consumption [kWh]` + `Solar Energy: PV Power Total Generation [kWh]`
- **Eje X:** Timestamp o franja horaria
- **Series:** Carga del sitio vs Generación solar
- **Área de diferencia:** Zona cubierta por solar (verde) vs zona cubierta por red/batería (naranja)
- **Valor:** El gráfico más importante para demostrar viabilidad económica

### G-10: Potencia de Entrada por Panel SPU (Multi-línea por canal)
- **Fuente:** `history_data.csv` → `SPCU_5: SPU Input Voltage[1-8] [V]` × `SPU Input Current[1-8] [A]`
- **Derivado:** `Potencia_entrada[canal] = V_in × I_in` (Watts DC del panel)
- **Series:** 8 canales SPU superpuestos
- **Eje X:** Hora del día
- **Valor:** Identificar paneles con bajo rendimiento (sombreado, suciedad, degradación)

### G-11: Temperatura de Módulos SPU vs Generación (ScatterChart)
- **Fuente:** `history_data.csv` → `SPCU_5: SPU Temperature[1-8] [°C]` + `SPU Energy[1-8] [kWh]`
- **Eje X:** Temperatura del módulo (°C)
- **Eje Y:** Energía generada en esa hora (kWh)
- **Valor:** Correlacionar temperatura con eficiencia (a >45°C los paneles pierden eficiencia)

### G-12: Histograma de Duraciones de Sesión Solar
- **Fuente:** `solar_work_rec.csv`
- **Eje X:** Rangos de duración (0-2h, 2-4h, 4-6h, 6-8h, >8h)
- **Eje Y:** Número de días
- **Valor:** Distribución de días buenos vs malos para quick visual de confiabilidad

### G-13: Número de Sesiones por Día (Interrupciones solares)
- **Fuente:** `solar_work_rec.csv` → columna `sessions` (calculada)
- **Lógica:** Días con >1 sesión = nubes/sombras intermitentes
- **Chart type:** BarChart con código de color (1=verde, 2=amarillo, ≥3=rojo)
- **Agrupamiento:** Días/Semanas/Meses

### G-14: Timeline de Eventos de Alarma (GanttChart o HeatMap)
- **Fuente:** `history_alarm.csv` (7,091 alarmas)
- **Eje X:** Tiempo
- **Eje Y:** Dispositivo / Tipo de alarma
- **Colores:** Por nivel (Critical=rojo, Major=naranja, Minor=amarillo, Warning=azul)
- **Filtros:** Por dispositivo, por nivel de severidad, por rango de fechas
- **Valor:** Identificar patrones de falla, correlacionar alarmas con pérdida de generación

### G-15: SOH (State of Health) de Baterías en el Tiempo
- **Fuente:** `history_data.csv` → `Battery_1/2: Battery SOH [%]`
- **Eje X:** Fechas
- **Eje Y:** SOH% (100% = nueva, <80% = reemplazo recomendado)
- **Valor:** Predicción de vida útil restante de las baterías

### G-16: Voltaje DC del Sistema a lo Largo del Tiempo
- **Fuente:** `history_data.csv` → `Power System: DC Voltage [V]`
- **Agrupamiento:** Por hora del día (promedio) para ver variaciones
- **Umbral:** Línea en 47V (LLVD1) y 46V (BLVD)
- **Valor:** Estabilidad del bus DC del sistema

### G-17: Eficiencia del MPPT por Canal SPU
- **Fuente:** `history_data.csv` → `SPCU_5: SPU MPPT Status[1-8]` (0/1)
- **Derivado:** % del tiempo en estado MPPT activo por canal, por día
- **Chart type:** Heatmap (días × canales) con color por % actividad MPPT
- **Valor:** Detectar fallas de rastreo del punto de máxima potencia

### G-18: Energía Acumulada por Canal SPU — Comparativo
- **Fuente:** `history_data.csv` → `SPCU_5: SPU Power Total Generation[1-8] [kWh]`
- **Chart type:** BarChart horizontal comparando los 8 canales
- **Valor:** Identificar desbalance entre strings (un canal muy por debajo = problema en ese panel)

### G-19: Corriente AC del Sistema (3 Fases) en el Tiempo
- **Fuente:** `history_data.csv` → `Power System: System AC Current[1-3] [A]` + `System AC Voltage[1-3] [V]`
- **Derivado:** `Potencia_AC = V × I × √3` (carga total del sitio desde la red)
- **Chart type:** LineChart multiserie (3 fases)
- **Valor:** Análisis de balance de fases y calidad de energía

### G-20: Temperatura Ambiente vs Generación Solar (Dual-Axis)
- **Fuente:** `history_data.csv` → `System Running Environment: Environment Temperature [°C]` + `Solar Energy: PV Power Total Generation [kWh]`
- **Eje Y izq.:** Generación solar (kWh)
- **Eje Y der.:** Temperatura ambiente (°C)
- **Valor:** Correlación entre temperatura/radiación solar y generación

### G-21: Heatmap Calendárico de Generación
- **Fuente:** `solar_work_rec.csv`
- **Estilo:** GitHub contribution calendar (semanas × días de la semana)
- **Color:** Gradiente verde por kWh generados ese día
- **Valor:** Vista de año completo de días buenos/malos de generación

### G-22: Gauge / Velocímetro de KPIs en Tiempo Real
- **Fuente:** `real_data.csv` (datos actuales del equipo)
- **Métricas:** SOC batería actual, potencia solar actual, carga actual
- **Chart type:** Gauge semicircular con Recharts o D3
- **Valor:** Dashboard de estado actual del sitio

---

## 6. ARQUITECTURA DEL SISTEMA DE AGRUPAMIENTO (Toggle de Granularidad)

> **Requerimiento del usuario:** Todas las gráficas temporales deben tener un botón para cambiar entre Días / Semanas / Meses, mostrando el valor promedio del período seleccionado.

### Implementación propuesta en React:

```typescript
// Hook reutilizable para agrupamiento
type Granularity = 'day' | 'week' | 'month';

function useGroupedData(rawData: SolarSession[], granularity: Granularity) {
  return useMemo(() => {
    return rawData.reduce((acc, session) => {
      const key = getGroupKey(session.date, granularity);
      // day → "2025-02-15"
      // week → "2025-W07"  
      // month → "2025-02"
      if (!acc[key]) acc[key] = { values: [], label: formatLabel(key, granularity) };
      acc[key].values.push(session.kwh);
      return acc;
    }, {});
  }, [rawData, granularity]);
}
```

### UI del toggle:
```tsx
<div className="granularity-toggle">
  {(['day', 'week', 'month'] as Granularity[]).map(g => (
    <button
      key={g}
      className={`toggle-btn ${granularity === g ? 'active' : ''}`}
      onClick={() => setGranularity(g)}
    >
      {g === 'day' ? 'Días' : g === 'week' ? 'Semanas' : 'Meses'}
    </button>
  ))}
</div>
```

### Promedios según granularidad:
- **Días:** valor exacto del día
- **Semanas:** promedio de kWh/día dentro de la semana + suma total de la semana
- **Meses:** promedio de kWh/día dentro del mes + suma total del mes

---

## 7. RESUMEN DE PRIORIDADES DE IMPLEMENTACIÓN

### 🔴 Prioridad Alta (del PPTX — obligatorias)
| # | Gráfica | Estado |
|---|---------|--------|
| G-01 | Work Duration por semana (BarChart) | Implementar |
| G-02 | kWh Generados por período (BarChart) | Implementar |
| G-03 | Minutos por hora del día (AreaChart) | Implementar |
| G-04 | kWh por hora del día (AreaChart) | Implementar |
| G-05 | kWh Acumulados por hora (AreaChart) | Implementar |
| G-06 | Consumo comercial ANTES SPV (LineChart) | Implementar |
| G-07 | Consumo comercial CON SPV — Ahorro (ComposedChart) | Implementar |

### 🟠 Prioridad Media (alto valor analítico)
| # | Gráfica | CSV origen |
|---|---------|------------|
| G-08 | SOC Batería en el tiempo | `history_data.csv` |
| G-09 | Carga vs Generación Solar | `history_data.csv` |
| G-13 | Interrupciones solares por día | `solar_work_rec.csv` |
| G-14 | Timeline de alarmas | `history_alarm.csv` |
| G-18 | Energía por canal SPU | `history_data.csv` |
| G-21 | Heatmap calendárico | `solar_work_rec.csv` |

### 🟡 Prioridad Baja (enriquecimiento técnico)
| # | Gráfica | CSV origen |
|---|---------|------------|
| G-10 | Potencia por panel SPU | `history_data.csv` |
| G-11 | Temperatura SPU vs generación | `history_data.csv` |
| G-15 | SOH baterías | `history_data.csv` |
| G-16 | Voltaje DC sistema | `history_data.csv` |
| G-17 | Eficiencia MPPT heatmap | `history_data.csv` |
| G-19 | Corriente AC 3 fases | `history_data.csv` |
| G-20 | Temperatura ambiente vs generación | `history_data.csv` |
| G-22 | Gauge KPIs tiempo real | `real_data.csv` |

---

## 8. OBSERVACIONES CLAVE DEL ANÁLISIS

1. **El informe cubre 2 períodos distintos:** El Excel usa datos de Ene-Abr 2025 (93 días), mientras que el CSV bruto llega hasta Jun-2025 (124 días). El sistema debe presentar ambos rangos.

2. **La lógica de distribución horaria es el cálculo más complejo:** La fórmula del Excel (`IF(AND(HOUR(hora) >= HOUR(start), HOUR(hora) <= HOUR(end))`) marca qué horas cubre cada sesión, y luego distribuye kWh proporcionalmente. Esta lógica debe implementarse en Python en el backend.

3. **El consumo base del sitio (12.34 kWh/h) debe ser configurable:** Cada sitio tendrá un consumo base diferente. Debe ser un parámetro editable en el proyecto.

4. **La fragmentación de sesiones es un indicador de calidad solar:** Días con 4-6 sesiones = muchas nubes. El sistema debe destacar esto automáticamente.

5. **Los datos de `history_data.csv` permiten dashboards mucho más ricos** que solo `solar_work_rec.csv`. La clave es el cruce entre generación solar, carga DC, y estado de batería en el mismo eje temporal.

6. **Período de datos por sitio:** ~4-5 meses de datos históricos. Los gráficos de semanas y meses darán la perspectiva adecuada para presentar a inversionistas.
