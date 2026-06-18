# 📊 Executive Report: Solar Systems Analytical Dashboard (ZTE SPU Solar Analytics)

The **ZTE SPU Solar Analytics** project is an analytical dashboard designed to automatically process and visualize the operation logs of the solar systems installed at 9 of our sites. The goal of this application is to transform the extensive raw data files (.csv) exported by the equipment into visual, interactive, and easily digestible information.

This allows all involved areas of the team to evaluate the performance of the solar investment, audit the real energy savings, and preventively detect faults in the equipment or batteries, without needing deep knowledge in data analysis.

Please note that the project is currently in active development. As a result, certain inconsistencies may appear in the graphs or the data displayed; rigorous testing is currently underway to validate and ensure the accuracy of all results.

Currently, the application is accessible only through local environments. We estimate a complete deployment to the cloud environment within the next 1 to 2 weeks.

Additionally, we are actively working on expanding the platform's multi-language support, specifically focused on completing translations for Chinese and English.


---

## Index
1. [Explanation of Graphs and Panels](#1-explanation-of-graphs-and-panels)
   - [Category A: Solar Generation](#category-a-solar-generation-️)
     - [Panel A-1: Solar Production](#panel-a-1-solar-production-daily--weekly--monthly)
     - [Panel A-2: Generation Hourly Profile](#panel-a-2-generation-hourly-profile)
     - [Panel A-3: Annual Heat Map](#panel-a-3-annual-heat-map)
     - [Panel A-4: Solar Work Duration](#panel-a-4-solar-work-duration-hours)

   - [Category B: Consumption and Economic Savings](#category-b-consumption-and-economic-savings-)
   - [Category C: Battery Status](#category-c-battery-status-)
     - [Panel C-1: Health and Charge of Batteries](#panel-c-1-health-and-charge-of-batteries-over-time)
     - [Panel C-2: Charge and Discharge Cycles](#panel-c-2-charge-and-discharge-cycles)
     - [Panel C-3: Accumulated Energy per SPU Channel](#panel-c-3-accumulated-energy-per-spu-channel)

   - [Category D: Equipment Performance](#category-d-equipment-performance-)
   - [Category E: Alarms and Availability](#category-e-alarms-and-availability-)
2. [Summary Table of Graphs and Data Sources](#2-summary-table-of-graphs-and-data-sources)
3. [Conclusions and Benefits for the Team](#3-conclusions-and-benefits-for-the-team)
4. [Glossary of Technical Terms](#4-glossary-of-technical-terms)

---

## 1. Explanation of Graphs and Panels

Below is a detailed explanation of what each panel of the application reflects, along with its main utility. In each section, you will find a designated space to visually attach the final panel in the internal documentation.

### Category A: Solar Generation (☀️)
This section focuses entirely on the energy that the solar panels are managing to produce.

#### Panel A-1: Solar Production (Daily / Weekly / Monthly)
* **What it reflects:** Shows the total amount of energy generated (measured in *kWh*) or the total hours worked by the panels in different time groupings.
* **What it is used for:** Allows seeing at a glance if a site's production meets the daily, weekly, or monthly expectations. It is ideal for executive reports of historical performance.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_A1.png ]
```

#### Panel A-2: Generation Hourly Profile
* **What it reflects:** A curve or area indicating at which specific hours of the day the sun provides the most energy to the site on average.
* **What it is used for:** Helps to understand the real "solar window" of each site, showing if the panels receive light from very early or if there are factors in the terrain (shadows from buildings, mountains, etc.) that cut down the peak hours.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_A2.png ]
```

#### Panel A-3: Annual Heat Map
* **What it reflects:** A calendar (similar to a checkerboard) where each day is colored according to the amount of energy produced. Darker or greener days represent high generation.
* **What it is used for:** Visually and instantly, the best and worst days of the year can be identified, as well as discovering patterns of rainy or dry seasons.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_A3.png ]
```

#### Panel A-4: Solar Work Duration (Hours)
* **What it reflects:** Details the total time (in hours) that the system was operating and capturing solar energy during the selected period.
* **What it is used for:** Allows analyzing the system's operational consistency. By using the time selector (days, weeks, or months), the team can identify if there were days with less activity time due to weather or technical factors.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_A4.png ]
```


---

### Category B: Consumption and Economic Savings (⚡)
The core of the financial analysis. Here we cross the solar information with the dependence on the electrical grid to measure the return on investment.

> **💡 Essential Feature: "Configurable Base Consumption"**
> The application has a highly useful function where the user can manually edit the **Base Consumption** of the site (estimation of how much energy the place required constantly before installing the panels). This allows the software to calculate the financial savings with high precision, adapting to the reality and operational size of each of the 9 sites without the need for future programming intervention.

#### Panel B-1: Electrical Grid Consumption vs. Solar Contribution
* **What it reflects:** A comparative graph that superimposes the usual consumption of the site against the energy provided by the panels. The highlighted area represents the volume of energy that was *no longer consumed* from the commercial grid.
* **What it is used for:** It is the visual demonstration of the savings. It allows investors and managers to see exactly at what times the site is energetically autonomous.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_B1.png ]
```

#### Panel B-2: Savings Summary (KPIs)
* **What it reflects:** Key performance indicators in direct cards, such as the "Total kWh saved from the grid" and the percentage of autonomy achieved in the month.
* **What it is used for:** Translates technical performance into operational impact and success metrics understandable by the entire board of directors.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_B2.png ]
```

---

### Category C: Battery Status (🔋)
Detailed monitoring of the health of the energy storage system (backup).

#### Panel C-1: Health and Charge of Batteries over time
* **What it reflects:** Shows the variations in the state of charge (*SOC*) percentage and the long-term state of health (*SOH*) over the months.
* **What it is used for:** Useful to prevent site downtimes. Allows verifying if the battery adequately maintains its charge overnight or if its lifespan is degrading rapidly.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_C1.png ]
```

#### Panel C-2: Charge and Discharge Cycles
* **What it reflects:** Counts the times the battery has delivered and received energy daily.
* **What it is used for:** Helps the technical team estimate the remaining lifespan, allowing to foresee replacements in advance and avoid critical stops.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_C2.png ]
```

#### Panel C-3: Accumulated Energy per SPU Channel
* **What it reflects:** Compares the total energy production captured by each of the individual channels (panel inputs) of the system.
* **What it is used for:** It is vital for detecting imbalances. If one channel shows significantly less accumulated energy than the others, it indicates that that group of panels might have a physical problem, excessive dirt, or permanent shading.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_C3.png ]
```
---

### Category D: Equipment Performance (🔧)
This section contains technical details of great value for the engineers in charge of system maintenance.

#### Panel D-1 and D-2: Efficiency and Temperature per Channel
* **What it reflects:** Compares the individual efficiency of each solar panel line or channel (*SPU*), as well as its operational temperature and effectiveness of the light tracking system (*MPPT*).
* **What it is used for:** Immediately identifies if a specific panel or sector of a site is dirty, shaded, or broken (by noticing it is lower compared to the other channels) and identifies power losses due to excess ambient heat.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_D1_D2.png ]
```

---

### Category E: Alarms and Availability (🔔)
The historical record of incidents for audit and stability purposes.

#### Panel E-1 and E-2: Event Timeline and Availability
* **What it reflects:** A time diagram that marks by levels of criticality (red, yellow) the faults reported by the equipment, along with the percentage of time the system was operating normally.
* **What it is used for:** Eliminates guesswork when diagnosing faults. Allows immediately correlating a day of low energy production with a specific system alarm recorded that same day.

```
 🔍 [ 🖼️ SCREENSHOT SPACE: Capture_Panel_E1_E2.png ]
```

---

## 2. Summary Table of Graphs and Data Sources

This matrix consolidates the exposed graphs and relates their construction to the source data, designed as a reference for engineering and IT.

| N° | Panel Name | Purpose / Description | Source `.csv` File |
|:---:|:---|:---|:---|
| **A-1** | Solar Production (Periods) | Evaluate volume of generated energy and active hours. | `solar_work_rec.csv` |
| **A-2** | Generation Hourly Profile | Analyze hours of highest solar exposure and light windows. | `solar_work_rec.csv` |
| **A-3** | Annual Heat Map | Visualize historical patterns and days with interruptions. | `solar_work_rec.csv` |
| **A-4** | Work Duration (h) | Measure the effective solar operation time by periods. | `solar_work_rec.csv` |

| **B-1** | Grid vs. Solar Consumption | Show how solar mitigates grid consumption during peak hours. | `history_data.csv` |
| **B-2** | Savings Summary (KPIs) | Summarize the economic impact derived from grid reduction. | `history_data.csv` |
| **C-1** | Battery Health and Charge | Monitor charge retention status (SOC) and health (SOH). | `history_data.csv` |
| **C-2** | Charge/Discharge Events | Count operational cycles to predict battery wear. | `batt_chg_rec.csv` / `batt_dischg_rec.csv` |
| **C-3** | Accumulated Energy (SPU) | Compare total performance between solar panel channels. | `history_data.csv` |

| **D-1** | Performance per SPU Channel | Detect problems (shade/dirt) in individual panels. | `history_data.csv` |
| **D-2** | Temperature vs Efficiency | Relate efficiency loss due to heating and MPPT. | `history_data.csv` |
| **D-3** | AC Power Quality | Supervise stability and phases of commercial grid current. | `history_data.csv` |
| **E-1** | Alarms Timeline | Crossed history of Critical, Major, and Minor faults. | `history_alarm.csv` |
| **E-2** | Daily Availability | Cross faults vs. sun times to measure the level of impact. | `history_alarm.csv` / `solar_work_rec.csv` |

---

## 3. Conclusions and Benefits for the Team

The implementation of the **System** marks an important qualitative leap in the way the company manages, supervises, and monetizes the energy infrastructure of the 9 deployed sites. From massive files with more than 400,000 interconnected technical records, the system automatically extracts actionable value for all involved areas:

1. **Transparent Financial Visibility:** The board and the administrative team now have graphic, historical, and irrefutable evidence of the reduction of dependence on the commercial grid. Thanks to the precise and moldable calculation of parameters (such as base consumption), the quantification of the return on investment (ROI) is robust and reliable.
2. **Proactive, Not Reactive Maintenance:** The technical and engineering team is equipped with a visual tool. It is now possible to predict the end of a battery bank's lifespan, identify exactly if "Channel 3" of a site is dirty or suffers from shading in the afternoons, preventing total service outages and reducing unnecessary on-site maintenance.
3. **Optimization and Standardization of Reports:** The application completely eradicates the need to allocate valuable engineering hours manipulating immense Excel sheets. All team members, regardless of their technical background, will consult from the same standardized source, making informed decisions with much greater speed and precision.

---

## 4. Glossary of Technical Terms

To guarantee that all team members take advantage of the report with ease, we define the following key terms used in this document:

* **kWh (Kilowatt-hour):** Standard unit of measurement for the consumption or production of electrical energy over time. It is our main rule to measure the contribution of the solar panels.
* **Base Consumption:** It is the constant amount of energy that a site requires to operate. In our software, it is an editable field used to simulate what the electrical dependence was like before the photovoltaic installation, a vital basis for calculating real savings.
* **SPU (Solar Power Unit):** Solar power processing unit. It is the component that receives and manages the energy coming from the modules/panels on site.
* **SOC (State of Charge):** Indicates in percentage how full the battery is at a specific moment (from 0% to 100%, just like on a mobile device).
* **SOH (State of Health):** Reveals the *remaining* lifespan of a battery compared to its factory condition (for example, due to aging, its maximum charge capacity may be limited to 80%).
* **MPPT (Maximum Power Point Tracking):** It is an intelligent technology in solar controllers that automatically searches for the ideal angle and electrical parameter to extract the maximum possible energy according to the weather conditions.
* **KPI (Key Performance Indicator):** Macro metrics to measure the success of the system at an executive level (e.g., total kWh saved, autonomy percentage).
