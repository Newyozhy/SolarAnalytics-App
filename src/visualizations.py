import plotly.express as px
import plotly.graph_objects as go

def plot_daily_generation(daily_df):
    """
    Crea un gráfico de barras de la generación solar diaria.
    """
    if daily_df is None or daily_df.empty:
        return go.Figure()
        
    fig = px.bar(
        daily_df, 
        x='date', 
        y='total_generation_kwh',
        title='Generación Solar Diaria (kWh)',
        labels={'date': 'Fecha', 'total_generation_kwh': 'Energía Generada (kWh)'},
        color='total_generation_kwh',
        color_continuous_scale='solar'
    )
    
    fig.update_layout(
        xaxis_title="Fecha",
        yaxis_title="Energía (kWh)",
        template="plotly_white",
        margin=dict(l=20, r=20, t=50, b=20)
    )
    return fig

def plot_battery_soc(soc_df):
    """
    Crea un gráfico de líneas del SOC de las baterías a lo largo del tiempo.
    """
    if soc_df is None or soc_df.empty:
        return go.Figure()
        
    fig = px.line(
        soc_df,
        x='save_time',
        y='value',
        color='device_name',
        title='Estado de Carga de Baterías (SOC %)',
        labels={'save_time': 'Tiempo', 'value': 'Nivel de Carga (%)', 'device_name': 'Batería'}
    )
    
    fig.update_layout(
        xaxis_title="Fecha y Hora",
        yaxis_title="Nivel de Carga (%)",
        yaxis_range=[0, 105],
        template="plotly_white",
        margin=dict(l=20, r=20, t=50, b=20)
    )
    return fig
