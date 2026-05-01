import streamlit as st
from .supabase_client import supabase
from .i18n import t

def init_session_state():
    if "user" not in st.session_state:
        st.session_state.user = None

def login():
    st.title(t("app_title"))
    st.subheader(t("login_title"))
    
    if supabase is None:
        st.error("Error de configuración de la base de datos.")
        return

    with st.form("login_form"):
        email = st.text_input(t("email_label"))
        password = st.text_input(t("password_label"), type="password")
        submit_button = st.form_submit_button(t("login_btn"))
        
        if submit_button:
            try:
                response = supabase.auth.sign_in_with_password({"email": email.strip(), "password": password})
                if response.user:
                    st.session_state.user = response.user
                    st.success("¡Inicio de sesión exitoso!")
                    st.rerun()
            except Exception as e:
                st.error(f"Error al iniciar sesión: Credenciales incorrectas. (Detalle: {str(e)})")

def logout():
    if supabase:
        supabase.auth.sign_out()
    st.session_state.user = None
    st.rerun()

def render_login_ui():
    init_session_state()
    
    if st.session_state.user is None:
        login()
        st.stop() # Detiene la ejecución del resto de la aplicación hasta que se inicie sesión
    else:
        # El usuario está logueado, mostrar el botón de cerrar sesión en la barra lateral
        with st.sidebar:
            st.write(f"**{t('user_label')}**: {st.session_state.user.email}")
            if st.button(t("logout_btn")):
                logout()
