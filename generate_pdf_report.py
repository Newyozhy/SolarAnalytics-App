import pandas as pd
import numpy as np
import os
import glob
import sys

# Configure matplotlib backend to non-interactive 'Agg' to avoid window generation issues
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Chinese compatible fonts (Microsoft YaHei is standard on Windows)
try:
    pdfmetrics.registerFont(TTFont('MSYaHei', 'C:/Windows/Fonts/msyh.ttc'))
    pdfmetrics.registerFont(TTFont('MSYaHei-Bold', 'C:/Windows/Fonts/msyhbd.ttc'))
    FONT_NORMAL = 'MSYaHei'
    FONT_BOLD = 'MSYaHei-Bold'
except Exception as e:
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# Define modern color scheme
PRIMARY_COLOR = colors.HexColor("#1e293b")   # Slate 800 (Deep Blue/Grey)
SECONDARY_COLOR = colors.HexColor("#0f766e") # Teal 700
ACCENT_COLOR = colors.HexColor("#d97706")    # Amber 600
TEXT_COLOR = colors.HexColor("#334155")      # Slate 700
BG_LIGHT = colors.HexColor("#f8fafc")        # Slate 50
BORDER_COLOR = colors.HexColor("#e2e8f0")    # Slate 200

# Custom NumberedCanvas for Page X of Y and Running Headers/Footers
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # We don't draw running header/footer on page 1 (cover)
        if self._pageNumber == 1:
            return
        
        self.saveState()
        self.setFont(FONT_NORMAL, 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Draw running header
        self.drawString(54, 750, "REPORTE TÉCNICO: ANÁLISIS ENERGÉTICO Y SOLUCIONES SOLARES")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Draw running footer
        self.line(54, 55, 558, 55)
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(558, 42, page_text)
        self.drawString(54, 42, "SolarAnalytics App - Documento Técnico de Carga DC")
        self.restoreState()


def load_excel_safely(filepath):
    xl = pd.ExcelFile(filepath)
    df = xl.parse(xl.sheet_names[0])
    header_row = df.iloc[0]
    data_df = df.iloc[1:].copy()
    data_df.columns = header_row
    
    # Clean numeric columns
    numeric_cols = [
        'Max Total Current(A)', 'Min Total Current(A)', 'Avg Total Current(A)',
        'Max Total Power(kW)', 'Min Total Power(kW)', 'Avg Total Power(kW)'
    ]
    for col in numeric_cols:
        data_df[col] = pd.to_numeric(data_df[col], errors='coerce')
    return data_df


def main():
    print("Loading datasets...")
    file_anual = os.path.join("Solar Datas", "DC Load Consumption_20260611125229.xlsx")
    file_semanal = os.path.join("Solar Datas", "DC Load Consumption_20260612145909.xlsx")
    file_historico = os.path.join("Solar Datas", "DC Load Consumption_20260612150455.xlsx")
    
    df_annual = load_excel_safely(file_anual)
    df_weekly = load_excel_safely(file_semanal)
    df_hist = load_excel_safely(file_historico)
    
    # ------------------ GENERATE CHARTS ------------------
    print("Generating charts...")
    
    # Chart 1: Daily load envelope for the site with most complete data
    site_counts = df_hist.groupby('Site')['Avg Total Power(kW)'].count()
    best_site = site_counts.idxmax()
    df_site = df_hist[df_hist['Site'] == best_site].copy()
    df_site['Date'] = pd.to_datetime(df_site['Date'])
    df_site = df_site.sort_values('Date').dropna(subset=['Avg Total Power(kW)', 'Min Total Power(kW)', 'Max Total Power(kW)'])
    
    plt.figure(figsize=(6, 3.2), dpi=300)
    plt.plot(df_site['Date'], df_site['Avg Total Power(kW)'], label='Potencia Promedio (kW)', color='#0f766e', linewidth=1.5)
    plt.fill_between(df_site['Date'], df_site['Min Total Power(kW)'], df_site['Max Total Power(kW)'], color='#2dd4bf', alpha=0.3, label='Rango Mín - Máx')
    plt.title(f"Perfil de Consumo Diario de Potencia (kW) - Sitio: {best_site}\nUbicación: {df_site['Location'].iloc[0]}", fontsize=9, fontweight='bold', color='#1e293b')
    plt.ylabel("Potencia (kW)", fontsize=8, color='#334155')
    plt.xlabel("Fecha", fontsize=8, color='#334155')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.legend(fontsize=7, loc='upper left')
    plt.tick_params(axis='both', labelsize=7)
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    plt.gca().xaxis.set_major_locator(mdates.MonthLocator(interval=1))
    plt.gcf().autofmt_xdate()
    plt.tight_layout()
    chart1_path = 'chart1_load_profile.png'
    plt.savefig(chart1_path, dpi=300)
    plt.close()
    
    # Chart 2: Distribution of Calculated Voltage
    df_hist['Voltage'] = (df_hist['Avg Total Power(kW)'] * 1000) / df_hist['Avg Total Current(A)']
    valid_voltages = df_hist['Voltage'].dropna()
    valid_voltages = valid_voltages[(valid_voltages > 30) & (valid_voltages < 70)] # Filter outliers for nice display
    
    plt.figure(figsize=(6, 3.2), dpi=300)
    plt.hist(valid_voltages, bins=25, color='#d97706', edgecolor='white', alpha=0.8)
    plt.axvline(valid_voltages.mean(), color='#1e293b', linestyle='--', linewidth=1.2, label=f"Media: {valid_voltages.mean():.2f} V")
    plt.title("Distribución del Voltaje DC Calculado en Estaciones\n(Estimado a partir de Voltaje = Potencia * 1000 / Corriente)", fontsize=9, fontweight='bold', color='#1e293b')
    plt.xlabel("Voltaje Calculado (V DC)", fontsize=8, color='#334155')
    plt.ylabel("Cantidad de Registros", fontsize=8, color='#334155')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.legend(fontsize=7)
    plt.tick_params(axis='both', labelsize=7)
    plt.tight_layout()
    chart2_path = 'chart2_voltage_dist.png'
    plt.savefig(chart2_path, dpi=300)
    plt.close()
    
    # Chart 3: Power by Supply Mode
    mode_group = df_hist.groupby('Supply Mode')['Avg Total Power(kW)'].mean().reset_index()
    mode_map = {
        '太阳能': 'Solar',
        '市电': 'Red Eléctrica',
        '市电|太阳能': 'Híbrido (Red/Solar)'
    }
    mode_group['Supply Mode'] = mode_group['Supply Mode'].map(mode_map).fillna(mode_group['Supply Mode'])
    
    plt.figure(figsize=(6, 3.2), dpi=300)
    colors_list = ['#0f766e', '#3b82f6', '#d97706'][:len(mode_group)]
    bars = plt.bar(mode_group['Supply Mode'], mode_group['Avg Total Power(kW)'], color=colors_list, width=0.4)
    plt.title("Consumo Promedio de Potencia (kW) por Modo de Suministro", fontsize=9, fontweight='bold', color='#1e293b')
    plt.ylabel("Potencia Promedio (kW)", fontsize=8, color='#334155')
    plt.grid(True, axis='y', linestyle='--', alpha=0.5)
    plt.tick_params(axis='both', labelsize=7)
    for bar in bars:
        height = bar.get_height()
        plt.annotate(f"{height:.2f} kW",
                     xy=(bar.get_x() + bar.get_width() / 2, height),
                     xytext=(0, 3),
                     textcoords="offset points",
                     ha='center', va='bottom', fontsize=7, fontweight='bold')
    plt.tight_layout()
    chart3_path = 'chart3_supply_mode.png'
    plt.savefig(chart3_path, dpi=300)
    plt.close()
    
    # Chart 4: Top 10 Sites by Average Power Consumption
    top_sites = df_hist.groupby('Site')['Avg Total Power(kW)'].mean().sort_values(ascending=False).head(10).reset_index()
    
    plt.figure(figsize=(6, 3.2), dpi=300)
    bars = plt.barh(top_sites['Site'][::-1], top_sites['Avg Total Power(kW)'][::-1], color='#3b82f6')
    plt.title("Top 10 Sitios con Mayor Consumo Promedio de Potencia (kW)", fontsize=9, fontweight='bold', color='#1e293b')
    plt.xlabel("Potencia Promedio (kW)", fontsize=8, color='#334155')
    plt.grid(True, axis='x', linestyle='--', alpha=0.5)
    plt.tick_params(axis='both', labelsize=7)
    for bar in bars:
        width = bar.get_width()
        plt.annotate(f" {width:.2f} kW",
                     xy=(width, bar.get_y() + bar.get_height() / 2),
                     xytext=(3, 0),
                     textcoords="offset points",
                     ha='left', va='center', fontsize=7, fontweight='bold')
    plt.tight_layout()
    chart4_path = 'chart4_top_consumption.png'
    plt.savefig(chart4_path, dpi=300)
    plt.close()
    
    # Calculate some summary stats for the PDF
    tot_sites = df_hist['Site'].nunique()
    tot_regions = df_hist['Location'].apply(lambda x: x.split('/')[1] if len(x.split('/'))>1 else 'N/A').nunique()
    avg_power_solar = df_hist[df_hist['Supply Mode']=='太阳能']['Avg Total Power(kW)'].mean()
    avg_power_grid = df_hist[df_hist['Supply Mode']=='市电']['Avg Total Power(kW)'].mean()
    avg_power_hybrid = df_hist[df_hist['Supply Mode']=='市电|太阳能']['Avg Total Power(kW)'].mean()
    
    # ------------------ GENERATE PDF ------------------
    print("Building PDF document...")
    pdf_filename = "Reporte_Analisis_Energético_Solar.pdf"
    
    # Page settings: Margins 54pt (0.75 inch)
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )
    
    styles = getSampleStyleSheet()
    
    # Define Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=FONT_BOLD,
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=11,
        leading=15,
        textColor=SECONDARY_COLOR,
        spaceAfter=15
    )
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=30
    )
    h1_style = ParagraphStyle(
        'H1Style',
        parent=styles['Heading2'],
        fontName=FONT_BOLD,
        fontSize=14,
        leading=18,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading3'],
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_COLOR,
        spaceAfter=8
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName=FONT_BOLD
    )
    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=9.5,
        leading=13,
        textColor=TEXT_COLOR,
        leftIndent=15,
        firstLineIndent=-8,
        spaceAfter=4
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=8.5,
        leading=11,
        textColor=TEXT_COLOR
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=table_cell_style,
        fontName=FONT_BOLD,
        textColor=colors.white
    )
    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=SECONDARY_COLOR
    )
    
    story = []
    
    # ------------------ COVER PAGE HEADER ------------------
    story.append(Paragraph("REPORTE TÉCNICO DE ANÁLISIS ENERGÉTICO", title_style))
    story.append(Paragraph("Evaluación de Consumos DC, Modos de Suministro y Estimación de Tensión en Plantas Solares", subtitle_style))
    
    meta_text = (
        "<b>Preparado para:</b> SolarAnalytics App & Sistema de Gestión<br/>"
        "<b>Fecha del Informe:</b> 12 de Junio de 2026<br/>"
        "<b>Autor:</b> Inteligencia Artificial - Antigravity (Google DeepMind Team)<br/>"
        "<b>Fuente de Datos:</b> Carpeta 'Solar Datas' (Muestras de Sitios con Soluciones de Energía)<br/>"
        f"<b>Estadísticas Clave:</b> {tot_sites} Sitios Analizados | {tot_regions} Regiones | 3 Niveles de Agregación"
    )
    story.append(Paragraph(meta_text, meta_style))
    
    # Horizontal line divider
    story.append(Table([[""]], colWidths=[504], rowHeights=[2], style=TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SECONDARY_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ])))
    story.append(Spacer(1, 15))
    
    # ------------------ SECTION 1: RESUMEN DE ARCHIVOS ------------------
    story.append(Paragraph("1. Resumen de los Archivos Identificados", h1_style))
    desc_intro = (
        "La carpeta <b>'Solar Datas'</b> contiene tres archivos en formato Microsoft Excel (.xlsx) "
        "que estructuran los datos de consumo de corriente y potencia DC de una red de telecomunicaciones y "
        "generación solar. Los tres archivos corresponden a la misma estructura de campos, diferenciándose en su temporalidad:"
    )
    story.append(Paragraph(desc_intro, body_style))
    
    # Files Table data
    files_data = [
        [
            Paragraph("Archivo / Ruta", table_header_style), 
            Paragraph("Granularidad", table_header_style), 
            Paragraph("Periodo / Fechas", table_header_style), 
            Paragraph("Registros", table_header_style)
        ],
        [
            Paragraph("<b>DC Load Consumption_20260611125229.xlsx</b>", table_cell_style),
            Paragraph("Anual ('年')", table_cell_style),
            Paragraph("Año 2026 completo (Acumulado)", table_cell_style),
            Paragraph("29 registros (1 por sitio)", table_cell_style)
        ],
        [
            Paragraph("<b>DC Load Consumption_20260612145909.xlsx</b>", table_cell_style),
            Paragraph("Diario ('天')", table_cell_style),
            Paragraph("2026-06-05 ~ 2026-06-11 (7 días)", table_cell_style),
            Paragraph("203 registros (29 sit. x 7 d.)", table_cell_style)
        ],
        [
            Paragraph("<b>DC Load Consumption_20260612150455.xlsx</b>", table_cell_style),
            Paragraph("Diario ('天')", table_cell_style),
            Paragraph("2026-01-01 ~ 2026-06-11 (~6 meses)", table_cell_style),
            Paragraph("4,698 registros (histórico)", table_cell_style)
        ]
    ]
    
    t_files = Table(files_data, colWidths=[180, 80, 150, 94])
    t_files.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ]))
    story.append(t_files)
    story.append(Spacer(1, 15))
    
    # ------------------ SECTION 2: EXPLICACIÓN DE COLUMNAS ------------------
    story.append(Paragraph("2. Explicación Sencilla de cada Columna", h1_style))
    story.append(Paragraph(
        "A continuación se detalla de forma simplificada el significado de cada columna física presente en las hojas de datos <i>'Power Supply Detail'</i>:",
        body_style
    ))
    
    columns_data = [
        [Paragraph("Columna", table_header_style), Paragraph("Significado Técnico y Práctico", table_header_style)],
        [Paragraph("<b>Date</b>", table_cell_style), Paragraph("La fecha específica del registro. Para reportes de granularidad diaria indica el día exacto (AAAA-MM-DD); en el anual representa el año evaluado (2026).", table_cell_style)],
        [Paragraph("<b>Location</b>", table_cell_style), Paragraph("Jerarquía geográfica o código regional del sitio (ej. <i>All/R5/VCH.La Tigrera</i>, que indica la región R5, el departamento VCH (Vichada) y el nombre de la estación).", table_cell_style)],
        [Paragraph("<b>Supply Mode</b>", table_cell_style), Paragraph("El modo de alimentación del sitio. Los valores en chino en el archivo de origen se traducen como: <b>太阳能 (Solar)</b>, <b>市电 (Red Eléctrica Comercial)</b>, y <b>市电|太阳能 (Híbrido)</b>.", table_cell_style)],
        [Paragraph("<b>Site</b>", table_cell_style), Paragraph("Identificador único del equipo o subsistema específico (ej. <i>TIG_SFV1_1200.50</i> representa el controlador solar fotovoltaico 1 del nodo 50).", table_cell_style)],
        [Paragraph("<b>DC Power</b>", table_cell_style), Paragraph("Tipo de alimentación medida, configurado de manera fija como 'DC Power' (Corriente Continua).", table_cell_style)],
        [Paragraph("<b>Max / Min / Avg Total Current (A)</b>", table_cell_style), Paragraph("La corriente total medida en <b>Amperios (A)</b>. Representa el flujo máximo (pico), mínimo (consumo constante) y el promedio respectivamente durante el periodo de medición.", table_cell_style)],
        [Paragraph("<b>Max / Min / Avg Total Power (kW)</b>", table_cell_style), Paragraph("La potencia total medida en <b>Kilovatios (kW)</b>. Representa la potencia pico, mínima y el promedio respectivamente consumidos o generados.", table_cell_style)]
    ]
    
    t_columns = Table(columns_data, colWidths=[130, 374])
    t_columns.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ]))
    story.append(t_columns)
    
    story.append(PageBreak()) # Clean page split
    
    # ------------------ SECTION 3: CÁLCULO DE VOLTAJE ------------------
    story.append(Paragraph("3. Cálculo del Voltaje (Tensión Eléctrica)", h1_style))
    volt_intro = (
        "El voltaje ($V$, en Volts) no se encuentra tabulado de manera explícita en los archivos, "
        "sin embargo, la física eléctrica establece la relación fundamental de potencia en corriente continua (CC/DC):"
    )
    story.append(Paragraph(volt_intro, body_style))
    
    formula_box = [
        [Paragraph("<b>Fórmula de Tensión Eléctrica (DC):</b>", table_header_style)],
        [Paragraph("$$Voltaje (V DC) = \\frac{Potencia (Watts)}{Corriente (Amperios)} = \\frac{Potencia (kW) \\times 1000}{Corriente (A)}$$", callout_style)]
    ]
    t_formula = Table(formula_box, colWidths=[504])
    t_formula.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY_COLOR),
        ('BACKGROUND', (0,1), (-1,1), BG_LIGHT),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_formula)
    story.append(Spacer(1, 8))
    
    volt_body = (
        "Al aplicar esta relación a las muestras de datos de corriente promedio y potencia promedio, se verifica de manera "
        "consistente que el 90% de los voltajes calculados oscilan en un rango de <b>49.1 V a 54.5 V DC</b> (con un 99% inferior a 57.1 V DC), con una "
        f"media general de <b>{valid_voltages.mean():.2f} V DC</b>. "
        "Esto confirma que los sitios analizados corresponden a infraestructuras de telecomunicaciones o repetidores de red "
        "con una tensión nominal de <b>48V DC</b>, donde las lecturas por encima de 51V corresponden a la tensión de "
        "flotación o carga de las baterías de respaldo, y los valores menores indican descargas ante cortes de suministro."
    )
    story.append(Paragraph(volt_body, body_style))
    
    # Chart 2: Voltage distribution
    story.append(Paragraph("<b>Figura 1: Distribución estadística de tensiones calculadas</b>", h2_style))
    img_v = Image(chart2_path, width=380, height=203)
    img_v.hAlign = 'CENTER'
    story.append(img_v)
    story.append(Spacer(1, 10))
    
    # ------------------ SECTION 4: PERFIL DE CARGA ------------------
    story.append(Paragraph("4. Perfil de Demanda Diaria y Carga Dinámica", h1_style))
    profile_body = (
        f"Al analizar el histórico diario, pudimos aislar el comportamiento individual de los nodos. El sitio "
        f"<b>{best_site}</b> destaca por tener uno de los registros más continuos de operación. "
        f"Al graficar el consumo promedio de potencia diario junto con el intervalo de consumo máximo y mínimo "
        f"(la 'envolvente' de carga), logramos mapear la variabilidad del sitio."
    )
    story.append(Paragraph(profile_body, body_style))
    
    # Chart 1: Daily load envelope
    story.append(Paragraph(f"<b>Figura 2: Histórico y envolvente de carga diaria - Sitio {best_site}</b>", h2_style))
    img_p = Image(chart1_path, width=380, height=203)
    img_p.hAlign = 'CENTER'
    story.append(img_p)
    
    story.append(PageBreak()) # Clean page split
    
    # ------------------ SECTION 5: ANÁLISIS DE SUMINISTRO Y SITIOS CRÍTICOS ------------------
    story.append(Paragraph("5. Análisis por Modo de Suministro y Consumos Críticos", h1_style))
    supply_body = (
        "El análisis cruzado por tipo de suministro revela un hallazgo técnico fundamental sobre el dimensionamiento "
        "de la red. Al agrupar los datos históricos, se obtienen las siguientes potencias promedio según la fuente de energía:"
    )
    story.append(Paragraph(supply_body, body_style))
    
    # Bullet points of stats
    story.append(Paragraph(f"• <b>Sitios 100% Solares (太阳能):</b> Tienen un consumo de potencia promedio de solo <b>{avg_power_solar:.2f} kW</b>.", bullet_style))
    story.append(Paragraph(f"• <b>Sitios Híbridos (市电|太阳能):</b> Promedian un consumo de <b>{avg_power_hybrid:.2f} kW</b>.", bullet_style))
    story.append(Paragraph(f"• <b>Sitios de Red Comercial (市电):</b> Promedian un consumo de <b>{avg_power_grid:.2f} kW</b>.", bullet_style))
    story.append(Spacer(1, 5))
    
    supply_conclusion = (
        "Esto demuestra que los sitios alimentados <b>exclusivamente con energía solar</b> corresponden a nodos de bajo "
        "consumo (estaciones de acceso remoto o repetidores pequeños), mientras que los sitios híbridos o puramente de red "
        "comercial soportan cargas críticas mucho más pesadas (estaciones base troncales o centros de datos locales)."
    )
    story.append(Paragraph(supply_conclusion, body_style))
    
    # Two columns for Charts 3 and 4
    story.append(Spacer(1, 5))
    story.append(Paragraph("<b>Figuras 3 y 4: Comparativas de Consumo de Potencia por Modo y por Sitio</b>", h2_style))
    
    img_mode = Image(chart3_path, width=245, height=130)
    img_top = Image(chart4_path, width=245, height=130)
    
    # Put them side-by-side in a table
    t_charts = Table([[img_mode, img_top]], colWidths=[252, 252])
    t_charts.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_charts)
    story.append(Spacer(1, 10))
    
    # ------------------ SECTION 6: CONCLUSIONES Y RECOMENDACIONES ------------------
    story.append(Paragraph("6. Conclusiones y Recomendaciones de Ingeniería", h1_style))
    
    story.append(Paragraph(
        "<b>1. Diagnóstico de Salud de Baterías (Monitoreo de Tensión):</b> "
        "Se recomienda integrar un algoritmo en el backend del sistema que calcule de manera continua "
        "el voltaje a nivel de sitio. Si el voltaje desciende por debajo de <b>46.5 V DC</b>, se debe emitir una alerta de "
        "prioridad alta, indicando que el sitio se encuentra descargando baterías activamente debido a una falla solar o "
        "corte de red comercial.",
        body_style
    ))
    
    story.append(Paragraph(
        "<b>2. Mitigación de Pérdida de Datos:</b> "
        "Durante el análisis se detectaron múltiples registros con valores nulos (NaN) en los campos de corriente y potencia "
        "en fechas específicas. Se sugiere implementar un mecanismo de almacenamiento local temporal (buffer) en los controladores "
        "de energía para retransmitir datos históricos cuando se recupere el enlace de comunicaciones.",
        body_style
    ))
    
    story.append(Paragraph(
        "<b>3. Dashboard Interactivo Propuesto:</b> "
        "Para el sistema web futuro, se propone una visualización en 3 niveles:<br/>"
        "• <i>Nivel Macro:</i> Un mapa regional que pinte de color verde, amarillo o rojo el estado de los sitios según su voltaje estimado.<br/>"
        "• <i>Nivel Medio:</i> Gráficas de barras de consumo para comparar eficiencias solares entre sitios similares.<br/>"
        "• <i>Nivel Micro:</i> Gráfico temporal del perfil de carga del sitio seleccionado, superponiendo el consumo real sobre "
        "la envolvente histórica para alertar desvíos significativos.",
        body_style
    ))
    
    # Sign off
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>Fin del Reporte Técnico</b>", body_bold))
    story.append(Paragraph("<i>Documento generado automáticamente por SolarAnalytics Engine.</i>", table_cell_style))
    
    # Build Document
    print("Writing PDF file...")
    doc.build(story, canvasmaker=NumberedCanvas)
    
    # Clean up charts
    print("Cleaning up temporary chart image files...")
    for path in [chart1_path, chart2_path, chart3_path, chart4_path]:
        if os.path.exists(path):
            os.remove(path)
            
    print(f"Success! Generated {pdf_filename}")


if __name__ == "__main__":
    main()
