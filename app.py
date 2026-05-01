import streamlit as st
from src.auth import render_login_ui
from src.drive_api import get_drive_service, list_projects, download_project_data, upload_file_to_drive
from src.data_processing import clean_solar_work_rec, get_daily_generation, clean_history_data
from src.visualizations import plot_daily_generation, plot_battery_soc
from src.report_generator import generate_excel, generate_pptx
from src.supabase_client import log_export_operation
import tempfile
import os
# Configuración básica de la página de Streamlit
st.set_page_config(
    page_title="Dashboard Solar",
    page_icon="☀️",
    layout="wide"
)

def main():
    # Renderizar la interfaz de login. 
    # Si el usuario no está logueado, esto detendrá la ejecución aquí.
    render_login_ui()
    
    # --- A PARTIR DE AQUÍ SOLO ACCEDEN USUARIOS AUTENTICADOS ---
    
    st.title("☀️ Dashboard de Análisis Solar")
    st.markdown("---")
    
    st.sidebar.header("Menú Principal")
    opcion = st.sidebar.selectbox("Selecciona una vista", ["Resumen", "Proyectos Drive", "Exportación"])
    
    if opcion == "Resumen":
        st.header("Resumen del Sistema")
        
        if 'project_data' not in st.session_state or not st.session_state['project_data']:
            st.info("No hay datos cargados. Por favor, ve a la pestaña 'Proyectos Drive' y carga un proyecto.")
        else:
            proyecto_actual = st.session_state.get('current_project_name', 'Desconocido')
            st.subheader(f"📊 Proyecto: {proyecto_actual}")
            
            dataframes = st.session_state['project_data']
            
            # Pestañas internas para diferentes vistas
            tab1, tab2, tab3 = st.tabs(["Generación Solar", "Baterías", "Métricas Globales"])
            
            with tab1:
                st.markdown("### Generación de Energía")
                if 'solar_work_rec' in dataframes:
                    df_solar_clean = clean_solar_work_rec(dataframes['solar_work_rec'])
                    df_daily = get_daily_generation(df_solar_clean)
                    
                    if not df_daily.empty:
                        fig_gen = plot_daily_generation(df_daily)
                        st.plotly_chart(fig_gen, use_container_width=True)
                        
                        # KPIs de generación
                        total_gen = df_daily['total_generation_kwh'].sum()
                        avg_gen = df_daily['total_generation_kwh'].mean()
                        
                        col1, col2 = st.columns(2)
                        col1.metric("Generación Total (kWh)", f"{total_gen:,.2f}")
                        col2.metric("Promedio Diario (kWh/día)", f"{avg_gen:,.2f}")
                    else:
                        st.warning("No se pudo procesar la generación diaria.")
                else:
                    st.warning("El archivo solar_work_rec.csv no se encuentra en este proyecto.")
                    
            with tab2:
                st.markdown("### Estado del Banco de Baterías")
                if 'history_data' in dataframes:
                    with st.spinner("Procesando histórico de baterías..."):
                        historicos = clean_history_data(dataframes['history_data'])
                        
                        if 'battery_soc' in historicos and not historicos['battery_soc'].empty:
                            fig_soc = plot_battery_soc(historicos['battery_soc'])
                            st.plotly_chart(fig_soc, use_container_width=True)
                        else:
                            st.info("No se encontraron datos de SOC de baterías en el histórico.")
                else:
                    st.warning("El archivo history_data.csv no se encuentra en este proyecto.")
                    
            with tab3:
                st.markdown("### Métricas Globales del Proyecto")
                # Se puede expandir con información de batt_chg_rec o alarmas
                st.info("Próximamente: Análisis de retornos de inversión y eventos del sistema.")
        
    elif opcion == "Proyectos Drive":
        st.header("Gestor de Proyectos (Google Drive)")
        
        try:
            service = get_drive_service()
            st.success("✅ Conectado a Google Drive correctamente.")
            
            # Listar proyectos
            with st.spinner("Buscando proyectos en la carpeta 'Paneles Solares'..."):
                proyectos = list_projects(service)
                
            if not proyectos:
                st.warning("No se encontraron carpetas de proyectos en 'Paneles Solares'.")
            else:
                # Diccionario para mapear nombre a ID
                proyectos_dict = {p['name']: p['id'] for p in proyectos}
                proyecto_seleccionado = st.selectbox("Selecciona un proyecto para cargar:", list(proyectos_dict.keys()))
                
                if st.button("Descargar y Procesar Datos", type="primary"):
                    with st.spinner(f"Descargando datos del proyecto {proyecto_seleccionado} a la memoria RAM..."):
                        project_id = proyectos_dict[proyecto_seleccionado]
                        dataframes = download_project_data(service, project_id)
                        
                        # Guardar los datos en el session state para usarlos en la vista de "Resumen"
                        st.session_state['current_project_name'] = proyecto_seleccionado
                        st.session_state['current_project_id'] = project_id
                        st.session_state['project_data'] = dataframes
                        
                        st.success(f"¡Datos cargados exitosamente! Se encontraron {len(dataframes)} archivos CSV relevantes.")
                        st.balloons()
                        
                        # Mostrar una vista previa rápida
                        for nombre, df in dataframes.items():
                            with st.expander(f"Vista previa: {nombre}.csv ({len(df)} filas)"):
                                st.dataframe(df.head())
                                
        except FileNotFoundError as e:
            st.error(f"Error de credenciales: {e}")
        except Exception as e:
            st.error(f"Error al conectar o descargar de Drive: {str(e)}")
        
    elif opcion == "Exportación":
        st.header("Generación de Reportes")
        
        if 'project_data' not in st.session_state or not st.session_state['project_data']:
            st.warning("No hay datos para exportar. Por favor, carga un proyecto en la pestaña 'Proyectos Drive'.")
        else:
            proyecto_actual = st.session_state.get('current_project_name')
            project_id = st.session_state.get('current_project_id')
            user_email = st.session_state.get('user', {}).get('email', 'desconocido@app.com')
            
            st.write(f"Proyecto listo para exportar: **{proyecto_actual}**")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("📊 Exportar Datos (Excel)")
                st.write("Genera un Excel multi-hoja con los datos procesados y lo sube a Drive.")
                if st.button("Generar y Subir Excel"):
                    with st.spinner("Generando Excel y subiendo a Drive..."):
                        try:
                            # 1. Generar temporal
                            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                                excel_path = tmp.name
                            
                            generate_excel(st.session_state['project_data'], excel_path)
                            
                            # 2. Subir a Drive
                            service = get_drive_service()
                            file_name = f"{proyecto_actual}_DatosProcesados.xlsx"
                            upload_file_to_drive(service, excel_path, project_id, file_name)
                            
                            # 3. Log en Supabase
                            log_export_operation(user_email, proyecto_actual, "Excel")
                            
                            st.success(f"✅ Excel subido a la carpeta del proyecto en Drive.")
                        except Exception as e:
                            st.error(f"Error: {e}")
                        finally:
                            if 'excel_path' in locals() and os.path.exists(excel_path):
                                os.remove(excel_path)
                                
            with col2:
                st.subheader("📑 Exportar Presentación (PPTX)")
                st.write("Genera una presentación con la plantilla corporativa y gráficas insertadas.")
                if st.button("Generar y Subir PPTX"):
                    with st.spinner("Generando presentación y subiendo a Drive..."):
                        try:
                            # 1. Preparar datos y gráficas (re-calculamos rápido para el PPTX)
                            dataframes = st.session_state['project_data']
                            figures = {}
                            data_summary = {}
                            
                            if 'solar_work_rec' in dataframes:
                                df_solar_clean = clean_solar_work_rec(dataframes['solar_work_rec'])
                                df_daily = get_daily_generation(df_solar_clean)
                                if not df_daily.empty:
                                    figures['Generación Diaria'] = plot_daily_generation(df_daily)
                                    data_summary['total_gen'] = df_daily['total_generation_kwh'].sum()
                                    data_summary['avg_gen'] = df_daily['total_generation_kwh'].mean()
                                    
                            if 'history_data' in dataframes:
                                historicos = clean_history_data(dataframes['history_data'])
                                if 'battery_soc' in historicos and not historicos['battery_soc'].empty:
                                    figures['Estado de Baterías'] = plot_battery_soc(historicos['battery_soc'])
                                    
                            # 2. Generar PPTX temporal
                            template_path = os.path.join('templates', 'plantilla_reporte.pptx')
                            with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
                                pptx_path = tmp.name
                                
                            generate_pptx(template_path, pptx_path, proyecto_actual, figures, data_summary)
                            
                            # 3. Subir a Drive
                            service = get_drive_service()
                            file_name = f"{proyecto_actual}_ReporteEjecutivo.pptx"
                            upload_file_to_drive(service, pptx_path, project_id, file_name)
                            
                            # 4. Log en Supabase
                            log_export_operation(user_email, proyecto_actual, "PPTX")
                            
                            st.success(f"✅ Presentación subida a la carpeta del proyecto en Drive.")
                        except Exception as e:
                            st.error(f"Error: {e}")
                        finally:
                            if 'pptx_path' in locals() and os.path.exists(pptx_path):
                                os.remove(pptx_path)

if __name__ == "__main__":
    main()
