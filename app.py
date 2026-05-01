import streamlit as st
from src.auth import render_login_ui
from src.drive_api import get_drive_service, find_folder_id, list_subfolders, download_project_data, upload_file_to_drive
from src.data_processing import clean_solar_work_rec, get_daily_generation, clean_history_data
from src.visualizations import plot_daily_generation, plot_battery_soc
from src.report_generator import generate_excel, generate_pptx
from src.supabase_client import log_export_operation, get_cached_project, save_project_to_cache
from src.i18n import t, render_language_selector
import tempfile
import os

st.set_page_config(
    page_title="ZTE Solar Analytics",
    page_icon="☀️",
    layout="wide"
)

def apply_zte_branding():
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        html, body, [class*="css"] {
            font-family: 'Inter', sans-serif;
        }
        
        /* Ocultar marca de agua de Streamlit */
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        header {visibility: hidden;}
        
        /* Estilos de botones primarios ZTE */
        .stButton>button[kind="primary"] {
            background-color: #005BAB !important;
            color: white !important;
            border-radius: 8px !important;
            border: none !important;
            transition: all 0.3s ease;
        }
        .stButton>button[kind="primary"]:hover {
            background-color: #00A6CE !important;
            box-shadow: 0 4px 12px rgba(0, 166, 206, 0.4);
        }
        
        /* Tarjetas de métricas */
        div[data-testid="stMetric"] {
            background-color: rgba(0, 91, 171, 0.05);
            border-left: 4px solid #005BAB;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        /* Carpetas Grid */
        .grid-folder {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            margin-bottom: 10px;
            transition: background 0.3s;
        }
        .grid-folder:hover {
            background: rgba(255,255,255,0.08);
            border-color: #00A6CE;
        }
        </style>
    """, unsafe_allow_html=True)

def main():
    apply_zte_branding()
    
    # Login UI
    render_login_ui()
    
    # --- A PARTIR DE AQUÍ SOLO ACCEDEN USUARIOS AUTENTICADOS ---
    
    # Logo ZTE en sidebar (SVG inline)
    zte_svg = """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 134.1" style="width: 150px; margin-bottom: 20px;">
        <path fill="#00A6CE" d="M12.9 13.9L133.5 13.9 133.5 35.8 55.4 100.3 135 100.3 135 120.3 11 120.3 11 99.4 89.6 34.2 12.9 34.2zM218.6 34.2L218.6 120.3 189.6 120.3 189.6 34.2 144.3 34.2 144.3 13.9 263.9 13.9 263.9 34.2zM302.2 120.3L273.2 120.3 273.2 13.9 389.9 13.9 389.9 34.2 302.2 34.2 302.2 56 384.6 56 384.6 76.4 302.2 76.4 302.2 100 391.8 100 391.8 120.3z"/>
    </svg>
    """
    st.sidebar.markdown(
        f'<div style="text-align: center;">{zte_svg}</div>',
        unsafe_allow_html=True
    )
    
    # Selector de idioma
    render_language_selector()
    st.sidebar.markdown("---")
    
    st.title(f"☀️ {t('app_title')}")
    st.markdown("---")
    
    st.sidebar.header(t("menu_title"))
    
    # Opciones traducidas
    opt_summary = t("view_summary")
    opt_drive = t("view_drive")
    opt_export = t("view_export")
    
    opcion = st.sidebar.selectbox(t("select_view"), [opt_summary, opt_drive, opt_export])
    
    if opcion == opt_summary:
        st.header(t("summary_header"))
        
        if 'project_data' not in st.session_state or not st.session_state['project_data']:
            st.info(t("no_data_info"))
        else:
            proyecto_actual = st.session_state.get('current_project_name', 'Desconocido')
            st.subheader(f"📊 {t('project_label')}: {proyecto_actual}")
            
            dataframes = st.session_state['project_data']
            
            tab1, tab2, tab3 = st.tabs([t("tab_generation"), t("tab_battery"), t("tab_global")])
            
            with tab1:
                st.markdown(f"### {t('gen_header')}")
                if 'solar_work_rec' in dataframes:
                    df_solar_clean = clean_solar_work_rec(dataframes['solar_work_rec'])
                    df_daily = get_daily_generation(df_solar_clean)
                    
                    if not df_daily.empty:
                        fig_gen = plot_daily_generation(df_daily)
                        st.plotly_chart(fig_gen, use_container_width=True)
                        
                        total_gen = df_daily['total_generation_kwh'].sum()
                        avg_gen = df_daily['total_generation_kwh'].mean()
                        
                        col1, col2 = st.columns(2)
                        col1.metric(t("total_gen_metric"), f"{total_gen:,.2f}")
                        col2.metric(t("avg_gen_metric"), f"{avg_gen:,.2f}")
                    else:
                        st.warning(t("no_daily_gen_warning"))
                else:
                    st.warning(t("missing_solar_csv"))
                    
            with tab2:
                st.markdown(f"### {t('battery_header')}")
                if 'history_data' in dataframes:
                    with st.spinner(t("processing_battery")):
                        historicos = clean_history_data(dataframes['history_data'])
                        
                        if 'battery_soc' in historicos and not historicos['battery_soc'].empty:
                            fig_soc = plot_battery_soc(historicos['battery_soc'])
                            st.plotly_chart(fig_soc, use_container_width=True)
                        else:
                            st.info(t("no_soc_data"))
                else:
                    st.warning(t("missing_history_csv"))
                    
            with tab3:
                st.markdown(f"### {t('global_metrics_header')}")
                st.info(t("coming_soon"))
        
    elif opcion == opt_drive:
        st.header(t("drive_header"))
        
        try:
            service = get_drive_service()
            
            if 'drive_path' not in st.session_state:
                with st.spinner(t("search_root")):
                    root_id = find_folder_id(service, "Paneles Solares")
                    if root_id:
                        st.session_state.drive_path = [{'id': root_id, 'name': 'Paneles Solares'}]
                    else:
                        st.warning(t("root_not_found"))
                        return
            
            current_folder = st.session_state.drive_path[-1]
            
            # --- Layout del Explorador (Mac/Windows style) ---
            
            # Navegación y Filtros (Barra superior)
            breadcrumbs = " / ".join([f"{f['name']}" for f in st.session_state.drive_path])
            st.markdown(f"### 🏠 {breadcrumbs}")
            
            col_up, col_view, _ = st.columns([2, 3, 5])
            with col_up:
                if len(st.session_state.drive_path) > 1:
                    if st.button("⬅️ " + t("btn_up_level")):
                        st.session_state.drive_path.pop()
                        st.session_state.selected_project_for_processing = None
                        st.rerun()
            with col_view:
                view_mode = st.radio(t("view_mode"), [t("view_grid"), t("view_list")], horizontal=True, label_visibility="collapsed")
            
            st.markdown("---")
            
            # Paneles de Contenido
            pane_left, pane_right = st.columns([3, 2], gap="large")
            
            with pane_left:
                with st.spinner(t("exploring_folder", folder=current_folder['name'])):
                    subcarpetas = list_subfolders(service, current_folder['id'])
                
                if not subcarpetas:
                    st.info(t("empty_folder"))
                else:
                    if view_mode == t("view_grid"):
                        # Vista Cuadrícula
                        cols = st.columns(3)
                        for i, carpeta in enumerate(subcarpetas):
                            with cols[i % 3]:
                                st.markdown(f"""
                                <div class="grid-folder">
                                    <div style="font-size: 30px;">📁</div>
                                    <div style="font-size: 14px; font-weight: 600; margin-top: 5px; color: #e0e0e0; word-wrap: break-word;">{carpeta['name']}</div>
                                </div>
                                """, unsafe_allow_html=True)
                                
                                c1, c2 = st.columns(2)
                                with c1:
                                    if st.button("Abrir", key=f"og_{carpeta['id']}", use_container_width=True):
                                        st.session_state.drive_path.append(carpeta)
                                        st.session_state.selected_project_for_processing = None
                                        st.rerun()
                                with c2:
                                    if st.button("Ver", key=f"vg_{carpeta['id']}", use_container_width=True):
                                        st.session_state.selected_project_for_processing = carpeta
                                        st.rerun()
                    else:
                        # Vista Lista
                        for carpeta in subcarpetas:
                            col_icon, col_name, col_act1, col_act2 = st.columns([1, 6, 2, 2])
                            col_icon.markdown("📁")
                            col_name.write(f"**{carpeta['name']}**")
                            with col_act1:
                                if st.button("Abrir", key=f"ol_{carpeta['id']}", use_container_width=True):
                                    st.session_state.drive_path.append(carpeta)
                                    st.session_state.selected_project_for_processing = None
                                    st.rerun()
                            with col_act2:
                                if st.button("Ver", key=f"vl_{carpeta['id']}", use_container_width=True):
                                    st.session_state.selected_project_for_processing = carpeta
                                    st.rerun()

            with pane_right:
                st.markdown("### Detalles del Proyecto")
                target_folder = st.session_state.get("selected_project_for_processing")
                
                if not target_folder:
                    target_folder = current_folder
                    st.info("Selecciona una carpeta en el explorador para ver detalles, o procesa el directorio actual.")
                else:
                    st.success(f"Proyecto Seleccionado: **{target_folder['name']}**")
                
                if st.button(t("btn_process_project"), type="primary", use_container_width=True):
                    with st.spinner(t("downloading_spinner_cache", project=target_folder['name'])):
                        # Fase 4: Caché Inteligente (Supabase Storage)
                        cached_data = get_cached_project(target_folder['id'])
                        
                        if cached_data:
                            dataframes = cached_data
                            st.success("⚡ Datos cargados al instante desde la caché (Supabase).")
                        else:
                            st.info("Descargando desde Google Drive...")
                            dataframes = download_project_data(service, target_folder['id'])
                            save_project_to_cache(target_folder['id'], dataframes)
                            st.success(t("data_loaded_success", count=len(dataframes)))
                        
                        st.session_state['current_project_name'] = target_folder['name']
                        st.session_state['current_project_id'] = target_folder['id']
                        st.session_state['project_data'] = dataframes
                        
                        st.balloons()
                        
                        for nombre, df in dataframes.items():
                            with st.expander(t("preview_expander", name=nombre, rows=len(df))):
                                st.dataframe(df.head())
                                
        except FileNotFoundError as e:
            st.error(f"Error: {e}")
        except Exception as e:
            st.error(f"Error: {str(e)}")
        
    elif opcion == opt_export:
        st.header(t("export_header"))
        
        if 'project_data' not in st.session_state or not st.session_state['project_data']:
            st.warning(t("no_export_data"))
        else:
            proyecto_actual = st.session_state.get('current_project_name')
            project_id = st.session_state.get('current_project_id')
            user_obj = st.session_state.get('user')
            user_email = user_obj.email if user_obj else 'desconocido@app.com'
            
            st.write(f"{t('project_ready_export')} **{proyecto_actual}**")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader(f"📊 {t('export_excel_subheader')}")
                st.write(t("export_excel_desc"))
                if st.button(t("btn_generate_excel"), type="primary"):
                    with st.spinner(t("excel_spinner")):
                        try:
                            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                                excel_path = tmp.name
                            
                            generate_excel(st.session_state['project_data'], excel_path)
                            
                            service = get_drive_service()
                            file_name = f"{proyecto_actual}_DatosProcesados.xlsx"
                            upload_file_to_drive(service, excel_path, project_id, file_name)
                            
                            log_export_operation(user_email, proyecto_actual, "Excel")
                            
                            st.success(f"✅ {t('excel_success')}")
                        except Exception as e:
                            st.error(f"Error: {e}")
                        finally:
                            if 'excel_path' in locals() and os.path.exists(excel_path):
                                os.remove(excel_path)
                                
            with col2:
                st.subheader(f"📑 {t('export_pptx_subheader')}")
                st.write(t("export_pptx_desc"))
                if st.button(t("btn_generate_pptx"), type="primary"):
                    with st.spinner(t("pptx_spinner")):
                        try:
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
                                    
                            template_path = os.path.join('templates', 'plantilla_reporte.pptx')
                            with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
                                pptx_path = tmp.name
                                
                            generate_pptx(template_path, pptx_path, proyecto_actual, figures, data_summary)
                            
                            service = get_drive_service()
                            file_name = f"{proyecto_actual}_ReporteEjecutivo.pptx"
                            upload_file_to_drive(service, pptx_path, project_id, file_name)
                            
                            log_export_operation(user_email, proyecto_actual, "PPTX")
                            
                            st.success(f"✅ {t('pptx_success')}")
                        except Exception as e:
                            st.error(f"Error: {e}")
                        finally:
                            if 'pptx_path' in locals() and os.path.exists(pptx_path):
                                os.remove(pptx_path)

if __name__ == "__main__":
    main()
