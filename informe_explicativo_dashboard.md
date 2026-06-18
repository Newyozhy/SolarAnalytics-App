# 📊 Informe Ejecutivo: Dashboard Analítico de Sistemas Solares (ZTE SPU Solar Analytics)

El proyecto **ZTE SPU Solar Analytics** es un dashboard analítico diseñado para procesar y visualizar de manera automática los registros de operación de los sistemas solares instalados en 9 de nuestros sitios. El objetivo de este aplicativo es transformar los extensos archivos de datos puros (.csv) exportados por los equipos, en información visual, interactiva y fácil de digerir.

Esto permite a todas las áreas del equipo implicadas, evaluar el rendimiento de la inversión solar, auditar el ahorro real de energía y detectar preventivamente fallas en los equipos o baterías, sin necesidad de conocimientos profundos en análisis de datos.

Cabe destacar que el proyecto sigue estando en desarrollo, por lo que se pueden presentar inconsistencias con las gráficas o los resultados mostrados; actualmente se están realizando pruebas exhaustivas para confirmar que todo funcione correctamente.

El acceso al sitio está disponible únicamente de forma local por el momento. Su despliegue oficial está estimado para realizarse en un periodo de 1 a 2 semanas.

Además, se está trabajando activamente en las traducciones de la plataforma para los idiomas chino e inglés.


---

## Índice
1. [Explicación de Gráficas y Paneles](#1-explicación-de-gráficas-y-paneles)
   - [Categoría A: Generación Solar](#categoría-a-generación-solar-️)
     - [Panel A-1: Producción Solar](#panel-a-1-producción-solar-diaria--semanal--mensual)
     - [Panel A-2: Perfil Horario de Generación](#panel-a-2-perfil-horario-de-generación)
     - [Panel A-3: Mapa de Calor Anual](#panel-a-3-mapa-de-calor-anual)
     - [Panel A-4: Duración de Trabajo Solar](#panel-a-4-duración-de-trabajo-solar-horas)

   - [Categoría B: Consumo y Ahorro Económico](#categoría-b-consumo-y-ahorro-económico-)
   - [Categoría C: Estado de Baterías](#categoría-c-estado-de-baterías-)
     - [Panel C-1: Salud y Carga de las Baterías](#panel-c-1-salud-y-carga-de-las-baterías-en-el-tiempo)
     - [Panel C-2: Ciclos de Carga y Descarga](#panel-c-2-ciclos-de-carga-y-descarga)
     - [Panel C-3: Energía Acumulada por Canal SPU](#panel-c-3-energía-acumulada-por-canal-spu)

   - [Categoría D: Rendimiento de Equipos](#categoría-d-rendimiento-de-equipos-)
   - [Categoría E: Alarmas y Disponibilidad](#categoría-e-alarmas-y-disponibilidad-)
2. [Tabla Resumen de Gráficas y Fuentes de Datos](#2-tabla-resumen-de-gráficas-y-fuentes-de-datos)
3. [Conclusiones y Beneficios para el Equipo](#3-conclusiones-y-beneficios-para-el-equipo)
4. [Glosario de Términos Técnicos](#4-glosario-de-términos-técnicos)

---

## 1. Explicación de Gráficas y Paneles

A continuación, se detalla qué refleja cada panel del aplicativo, junto con su utilidad principal. En cada sección encontrarás un espacio designado para adjuntar visualmente el panel final en la documentación interna.

### Categoría A: Generación Solar (☀️)
Esta sección se enfoca netamente en la energía que los paneles solares están logrando producir.

#### Panel A-1: Producción Solar (Diaria / Semanal / Mensual)
* **¿Qué refleja?:** Muestra la cantidad total de energía generada (medida en *kWh*) o las horas totales trabajadas por los paneles en diferentes agrupaciones de tiempo.
* **¿Para qué sirve?:** Permite ver de un vistazo si la producción de un sitio cumple con las expectativas diarias, semanales o mensuales. Es ideal para reportes ejecutivos de rendimiento histórico.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_A1.png ]
```

#### Panel A-2: Perfil Horario de Generación
* **¿Qué refleja?:** Una curva o área que indica en qué horas específicas del día el sol aporta más energía al sitio en promedio.
* **¿Para qué sirve?:** Ayuda a entender la "ventana solar" real de cada sitio, mostrando si los paneles reciben luz desde muy temprano o si hay factores en el terreno (sombras de edificios, montañas, etc.) que recortan las horas pico.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_A2.png ]
```

#### Panel A-3: Mapa de Calor Anual
* **¿Qué refleja?:** Un calendario (similar a un tablero cuadriculado) donde cada día se colorea según la cantidad de energía producida. Los días más oscuros o verdes representan alta generación.
* **¿Para qué sirve?:** De forma visual e instantánea, se pueden identificar los mejores y peores días del año, así como descubrir patrones de estaciones lluviosas o secas.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_A3.png ]
```

#### Panel A-4: Duración de Trabajo Solar (Horas)
* **¿Qué refleja?:** Detalla el tiempo total (en horas) que el sistema estuvo operando y captando energía solar durante el periodo seleccionado.
* **¿Para qué sirve?:** Permite analizar la constancia operativa del sistema. Al usar el selector de tiempo (días, semanas o meses), el equipo puede identificar si hubo jornadas con menor tiempo de actividad debido a factores climáticos o técnicos.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_A4.png ]
```


---

### Categoría B: Consumo y Ahorro Económico (⚡)
El núcleo del análisis financiero. Aquí cruzamos la información solar con la dependencia de la red eléctrica para medir el retorno de inversión.

> **💡 Característica Escencial: "Consumo Base Configurable"**
> El aplicativo cuenta con una función sumamente util donde el usuario puede editar manualmente el **Consumo Base** del sitio (estimación de cuánta energía requería el lugar de manera constante antes de poner los paneles). Esto permite que el software calcule el ahorro financiero con alta precisión, adaptándose a la realidad y tamaño operativo de cada uno de los 9 sitios sin necesidad de intervención de programación en el futuro.

#### Panel B-1: Consumo de Red Eléctrica vs. Aporte Solar
* **¿Qué refleja?:** Una gráfica comparativa que superpone el consumo habitual del sitio frente a la energía aportada por los paneles. El área resaltada representa el volumen de energía que se *dejó de consumir* de la red comercial.
* **¿Para qué sirve?:** Es la demostración visual del ahorro. Permite a los inversionistas y gerentes ver exactamente en qué momentos el sitio es autónomo energéticamente.
* **🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_B1.png ]**

#### Panel B-2: Resumen de Ahorro (KPIs)
* **¿Qué refleja?:** Indicadores clave de desempeño en tarjetas directas, como el "Total de kWh ahorrados de la red" y el porcentaje de autonomía lograda en el mes.
* **¿Para qué sirve?:** Traduce el rendimiento técnico en impacto operativo y métricas de éxito entendibles por todo el consejo directivo.
* **🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_B2.png ]**

---

### Categoría C: Estado de Baterías (🔋)
Monitoreo a detalle de la salud del sistema de almacenamiento de energía (backup).

#### Panel C-1: Salud y Carga de las Baterías en el tiempo
* **¿Qué refleja?:** Muestra las variaciones en el porcentaje de carga (*SOC*) y el estado de salud a largo plazo (*SOH*) a lo largo de los meses.
* **¿Para qué sirve?:** Útil para prevenir caídas del sitio. Permite verificar si la batería mantiene adecuadamente su carga durante la noche o si su vida útil se está degradando rápidamente.
* **🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_C1.png ]**

#### Panel C-2: Ciclos de Carga y Descarga
* **¿Qué refleja?:** Contabiliza las veces que la batería ha entregado y recibido energía diariamente.
* **¿Para qué sirve?:** Ayuda al equipo técnico a estimar la vida útil restante, permitiendo prever reemplazos con antelación y evitar paradas críticas.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_C2.png ]
```

#### Panel C-3: Energía Acumulada por Canal SPU
* **¿Qué refleja?:** Compara la producción total de energía que ha captado cada uno de los canales individuales (entradas de paneles) del sistema.
* **¿Para qué sirve?:** Es vital para detectar desbalances. Si un canal muestra significativamente menos energía acumulada que los demás, indica que ese grupo de paneles podría tener un problema físico, suciedad excesiva o sombreado permanente.

```
 🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_C3.png ]
```


---

### Categoría D: Rendimiento de Equipos (🔧)
Esta sección contiene detalles técnicos de gran valor para los ingenieros encargados del mantenimiento del sistema.

#### Panel D-1 y D-2: Eficiencia y Temperatura por Canal
* **¿Qué refleja?:** Compara la eficiencia individual de cada línea o canal de paneles solares (*SPU*), así como su temperatura operativa y efectividad del sistema de rastreo de luz (*MPPT*).
* **¿Para qué sirve?:** Identifica inmediatamente si un panel o sector específico de un sitio está sucio, sombreado o descompuesto (al notarlo más bajo comparado con los demás canales) e identifica pérdidas de potencia a causa del exceso de calor ambiental.
* **🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_D1_D2.png ]**

---

### Categoría E: Alarmas y Disponibilidad (🔔)
El registro histórico de incidentes para fines de auditoría y estabilidad.

#### Panel E-1 y E-2: Línea de tiempo de eventos y Disponibilidad
* **¿Qué refleja?:** Un diagrama de tiempo que marca por niveles de criticidad (rojo, amarillo) las fallas reportadas por el equipo, junto con el porcentaje de tiempo que el sistema estuvo operando con normalidad.
* **¿Para qué sirve?:** Elimina las suposiciones a la hora de diagnosticar fallas. Permite correlacionar de inmediato un día de baja producción energética con una alarma específica del sistema registrada ese mismo día.
* **🔍 [ 🖼️ ESPACIO PARA CAPTURA DE PANTALLA: Captura_Panel_E1_E2.png ]**

---

## 2. Tabla Resumen de Gráficas y Fuentes de Datos

Esta matriz consolida las gráficas expuestas y relaciona su construcción con los datos de origen, pensada como referencia para ingeniería e IT.

| N° | Nombre del Panel | Propósito / Descripción | Archivo `.csv` Origen |
|:---:|:---|:---|:---|
| **A-1** | Producción Solar (Periodos) | Evaluar volumen de energía generada y horas activas. | `solar_work_rec.csv` |
| **A-2** | Perfil Horario de Generación | Analizar horas de mayor exposición solar y ventanas de luz. | `solar_work_rec.csv` |
| **A-3** | Mapa de Calor Anual | Visualizar patrones históricos y días con interrupciones. | `solar_work_rec.csv` |
| **A-4** | Duración de Trabajo (h) | Medir el tiempo efectivo de operación solar por periodos. | `solar_work_rec.csv` |

| **B-1** | Consumo de Red vs. Solar | Mostrar cómo la solar mitiga el consumo de red en horas pico. | `history_data.csv` |
| **B-2** | Resumen de Ahorro (KPIs) | Resumir el impacto económico derivado de la reducción de red. | `history_data.csv` |
| **C-1** | Salud y Carga Baterías | Monitorear el estado de retención de carga (SOC) y salud (SOH). | `history_data.csv` |
| **C-2** | Eventos Carga/Descarga | Contabilizar ciclos operativos para predecir desgaste de baterías. | `batt_chg_rec.csv` / `batt_dischg_rec.csv` |
| **C-3** | Energía Acumulada (SPU) | Comparar el rendimiento total entre canales de paneles solares. | `history_data.csv` |

| **D-1** | Rendimiento por Canal SPU | Detectar problemas (sombra/suciedad) en paneles individuales. | `history_data.csv` |
| **D-2** | Temperatura vs Eficiencia | Relacionar pérdida de eficiencia por calentamiento y MPPT. | `history_data.csv` |
| **D-3** | Calidad de Energía AC | Supervisar estabilidad y fases de la corriente de red comercial. | `history_data.csv` |
| **E-1** | Timeline de Alarmas | Historial cruzado de fallas Críticas, Mayores y Menores. | `history_alarm.csv` |
| **E-2** | Disponibilidad Diaria | Cruzar fallas vs. tiempos de sol para medir el nivel de afectación. | `history_alarm.csv` / `solar_work_rec.csv` |

---

## 3. Conclusiones y Beneficios para el Equipo

La implementación del **Sistema** marca un importante salto cualitativo en la manera en que la empresa administra, supervisa y rentabiliza la infraestructura energética de los 9 sitios desplegados. De archivos masivos con más de 400,000 registros técnicos interconectados, el sistema extrae de forma automática valor procesable para todas las áreas involucradas:

1. **Visibilidad Financiera Transparente:** La directiva y el equipo administrativo ahora cuentan con evidencia gráfica, histórica e irrefutable de la reducción de dependencia de la red comercial. Gracias al cálculo preciso y moldeable de parámetros (como el consumo base), la cuantificación del retorno de inversión (ROI) es robusta y confiable.
2. **Mantenimiento Proactivo, No Reactivo:** El equipo técnico e ingenieril se equipa con una herramienta visual. Ahora es posible pronosticar el fin de la vida útil de un banco de baterías, identificar exactamente si el "Canal 3" de un sitio está sucio o sufre sombreado en las tardes, previniendo caídas totales de servicio y disminuyendo los mantenimientos en terreno innecesarios.
3. **Optimización y Estandarización de Reportes:** El aplicativo erradica por completo la necesidad de destinar valiosas horas de ingeniería manipulando inmensas hojas de Excel. Todos los miembros del equipo independientemente de su base técnica consultarán de una misma fuente estandarizada, tomando decisiones informadas con mucha mayor rapidez y precisión.

---

## 4. Glosario de Términos Técnicos

Para garantizar que todos los miembros del equipo aprovechen el informe con facilidad, definimos los siguientes términos clave empleados en este documento:

* **kWh (Kilovatio-hora):** Unidad estándar de medida para el consumo o producción de energía eléctrica en el tiempo. Es nuestra principal regla para medir el aporte de los paneles solares.
* **Consumo Base:** Es la cantidad constante de energía que requiere un sitio para funcionar. En nuestro software, es un campo editable que sirve para simular cómo era la dependencia eléctrica antes de la instalación fotovoltaica, base vital para calcular ahorros reales.
* **SPU (Solar Power Unit):** Unidad de procesamiento de poder solar. Es el componente que recibe y gestiona la energía proveniente de los módulos/paneles en el sitio.
* **SOC (State of Charge):** Estado de Carga. Indica porcentualmente qué tan llena está la batería en un momento específico (de 0% a 100%, tal como en un dispositivo móvil).
* **SOH (State of Health):** Estado de Salud. Revela la vida útil *restante* de una batería frente a su condición de fábrica (por ejemplo, por envejecimiento, su capacidad máxima de carga puede limitarse a un 80%).
* **MPPT (Maximum Power Point Tracking):** Rastreo del punto de máxima potencia. Es una tecnología inteligente en los controladores solares que busca automáticamente el ángulo y parámetro eléctrico ideal para extraer la máxima energía posible según las condiciones climáticas.
* **KPI (Key Performance Indicator):** Indicadores clave de rendimiento (Ej: total kWh ahorrados, porcentaje de autonomía). Métricas macro para medir el éxito del sistema a un nivel ejecutivo.
