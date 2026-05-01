import json
import os
import streamlit as st

def load_locales():
    locales = {}
    locales_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'locales')
    for lang in ['es', 'en', 'zh']:
        try:
            with open(os.path.join(locales_dir, f"{lang}.json"), 'r', encoding='utf-8') as f:
                locales[lang] = json.load(f)
        except Exception as e:
            print(f"Error loading locale {lang}: {e}")
            locales[lang] = {}
    return locales

# Cargar una sola vez
LOCALES = load_locales()

def init_language():
    if 'language' not in st.session_state:
        st.session_state.language = 'es'

def t(key, **kwargs):
    """
    Traduce una clave al idioma actual de session_state.
    Permite formateo dinámico con kwargs.
    Ej: t("preview_expander", name="solar_work_rec", rows=100)
    """
    lang = st.session_state.get('language', 'es')
    text = LOCALES.get(lang, LOCALES.get('es', {})).get(key, key)
    
    if kwargs:
        try:
            return text.format(**kwargs)
        except Exception:
            return text
    return text

def render_language_selector():
    init_language()
    
    # Crear un contenedor en la parte superior de la sidebar para el selector de idioma
    lang_options = {'es': '🇪🇸 Español', 'en': '🇺🇸 English', 'zh': '🇨🇳 中文'}
    
    # Encontrar el índice del idioma actual para setearlo por defecto
    lang_keys = list(lang_options.keys())
    current_index = lang_keys.index(st.session_state.language)
    
    selected_lang_name = st.selectbox(
        t("lang_selector"), 
        options=list(lang_options.values()), 
        index=current_index,
        key='_lang_selector_ui'
    )
    
    # Determinar qué clave se seleccionó
    for k, v in lang_options.items():
        if v == selected_lang_name:
            if st.session_state.language != k:
                st.session_state.language = k
                st.rerun()
            break
