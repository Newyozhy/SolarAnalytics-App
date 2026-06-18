// API client for all analysis endpoints (Phase 2)
import { apiClient } from './client';

export type Granularity = 'day' | 'week' | 'month';
export type GenerationMetric = 'kwh' | 'duration';
export type HourlyMetric = 'minutes' | 'kwh' | 'kwh_cumulative';

export interface GenerationPeriod {
  period: string;
  label: string;
  value: number;
  avg_per_day: number;
  n_days: number;
  total_sessions: number;
  fragmented_days: number;
  max_sessions: number;
}

export interface OutlierInfo {
  date: string;
  kwh: number;
  reason: string;
  criterion: string;
}

export interface GenerationSummary {
  total_kwh: number;
  total_days: number;
  avg_kwh_per_day: number;
  period_start: string;
  period_end: string;
  fragmented_days_count: number;
  unit: string;
}

export interface GenerationResponse {
  data: GenerationPeriod[];
  outliers: OutlierInfo[];
  summary: GenerationSummary;
}

export interface HourlyPoint {
  hour: number;
  hour_label: string;
  avg_minutes: number;
  avg_kwh: number;
  total_kwh: number;
  value: number;
}

export interface HourlyProfile {
  data: HourlyPoint[];
  summary: {
    n_days: number;
    peak_hour: number;
    peak_value: number;
    metric: string;
    period_start: string;
    period_end: string;
  };
}

export interface CalendarDay {
  date: string;
  kwh: number;
  sessions: number;
  is_fragmented: boolean;
}

export interface CalendarHeatmap {
  data: CalendarDay[];
  max_kwh: number;
  avg_kwh: number;
}

export interface ConsumptionHour {
  hour: number;
  hour_label: string;
  base_consumption: number;
  solar_generation: number;
  net_consumption: number;
  saving: number;
}

export interface ConsumptionProfile {
  data: ConsumptionHour[];
  summary: {
    daily_base_kwh: number;
    daily_solar_avg_kwh: number;
    daily_net_consumption_kwh: number;
    pct_solar_autonomy: number;
    base_consumption_source: string;
    recommended_base_consumption?: number;
    has_real_load?: boolean;
  };
}

export interface SavingsPeriod {
  period: string;
  label: string;
  solar_kwh: number;
  base_kwh: number;
  net_kwh: number;
  saved_kwh: number;
  saved_usd: number;
  n_days: number;
}

export interface SavingsKpis {
  total_solar_kwh: number;
  total_base_kwh: number;
  total_saved_kwh: number;
  total_saved_usd: number;
  pct_autonomy: number;
  tariff_per_kwh: number;
  currency: string;
  recommended_base_consumption?: number;
  has_real_load?: boolean;
}

export interface SavingsResponse {
  data: SavingsPeriod[];
  kpis: SavingsKpis;
}

// Battery types (Phase 4)
export type BatteryMetric = 'soc' | 'soh' | 'voltage';

export interface BatteryRecord {
  period: string;
  label: string;
  [device: string]: number | string | null; // pivot columns per battery device
}

export interface BatteryAlert {
  device: string;
  period: string;
  soh: number;
  message: string;
}

export interface BatterySummary {
  metric: BatteryMetric;
  unit: string;
  devices: string[];
  n_periods: number;
  alert_count: number;
  thresholds?: { LLVD1: number; BLVD: number };
}

export interface BatteryResponse {
  data: BatteryRecord[];
  alerts: BatteryAlert[];
  summary: BatterySummary;
}
export interface SpuChannel {
  signal_name: string;
  total_kwh: number;
  channel: string;
}

export interface SpuWarning {
  code: string;
  channel?: string;
  kwh?: number;
  avg_kwh?: number;
  message: string;
}

export interface SpuResponse {
  data: SpuChannel[];
  warnings: SpuWarning[];
  avg_kwh: number;
}

// System Power types (Phase 5)
export interface SystemPowerTrace {
  class: 'load' | 'source' | 'temp';
  name: string;
  color: string;
  unit: string;
  data: { period: string; label: string; value: number }[];
}

export interface SystemPowerResponse {
  traces: SystemPowerTrace[];
  devices: string[];
  summary: {
    granularity: string;
    device_count?: number;
    avg_load?: number;
    max_load?: number;
    avg_source?: number;
    max_source?: number;
    avg_temp?: number;
    max_temp?: number;
  };
}

// Alarms types (Phase 5)
export interface AlarmRecord {
  device_name: string;
  signal_name: string;
  start_time: string;
  end_time: string;
  level: number;
  level_name: string;
  duration_min: number;
}

export interface AlarmsResponse {
  data: AlarmRecord[];
  kpis: {
    total?: number;
    critical?: number;
    major?: number;
    minor?: number;
    warning?: number;
    unique_devices?: number;
  };
  by_device: { device_name: string; count: number }[];
  by_level: { level_name: string; count: number }[];
}

export const analysisApi = {
  getGeneration: (
    projectId: string,
    params: {
      granularity?: Granularity;
      metric?: GenerationMetric;
      date_from?: string;
      date_to?: string;
      include_outliers?: boolean;
    }
  ): Promise<GenerationResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/generation`, { params }).then(r => r.data),

  getHourlyProfile: (
    projectId: string,
    params: {
      metric?: HourlyMetric;
      date_from?: string;
      date_to?: string;
      include_outliers?: boolean;
    }
  ): Promise<HourlyProfile> =>
    apiClient.get(`/v1/analysis/${projectId}/hourly-profile`, { params }).then(r => r.data),

  getCalendarHeatmap: (
    projectId: string,
    params?: { include_outliers?: boolean }
  ): Promise<CalendarHeatmap> =>
    apiClient.get(`/v1/analysis/${projectId}/calendar-heatmap`, { params }).then(r => r.data),

  getConsumptionProfile: (
    projectId: string,
    params: {
      base_consumption_kwh_per_hour: number;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ConsumptionProfile> =>
    apiClient.get(`/v1/analysis/${projectId}/consumption-profile`, { params }).then(r => r.data),

  getSavings: (
    projectId: string,
    params: {
      base_consumption_kwh_per_hour: number;
      tariff_per_kwh: number;
      granularity?: 'week' | 'month';
      date_from?: string;
      date_to?: string;
    }
  ): Promise<SavingsResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/savings`, { params }).then(r => r.data),

  getBattery: (
    projectId: string,
    params: {
      metric?: BatteryMetric;
      granularity?: Granularity;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<BatteryResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/battery`, { params }).then(r => r.data),

  getSpuChannels: (
    projectId: string
  ): Promise<SpuResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/spu-channels`).then(r => r.data),

  getSystemPower: (
    projectId: string,
    params?: {
      granularity?: Granularity;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<SystemPowerResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/system-power`, { params }).then(r => r.data),

  getAlarms: (
    projectId: string,
    params?: {
      levels?: string;
      device?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
    }
  ): Promise<AlarmsResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/alarms`, { params }).then(r => r.data),

  // ── B-3: Ahorro Real Cruzado (DC Load vs Solar) ──────────────
  getRealSavings: (
    projectId: string,
    params: {
      tariff_per_kwh: number;
      granularity?: 'week' | 'month';
      site_filter?: string;
      supply_mode_zero_cost?: boolean;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<RealSavingsResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/real-savings`, { params }).then(r => r.data),

  // ── B-4: KPI de Viabilidad del Sitio ─────────────────────────
  getViabilityIndex: (
    projectId: string,
    params?: {
      granularity?: 'week' | 'month';
      site_filter?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ViabilityResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/viability-index`, { params }).then(r => r.data),

  // ── B-5: Curva de Demanda vs Envolvente de Carga ─────────────
  getDemandEnvelope: (
    projectId: string,
    params?: {
      granularity?: 'week' | 'month';
      site_filter?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<DemandEnvelopeResponse> =>
    apiClient.get(`/v1/analysis/${projectId}/demand-envelope`, { params }).then(r => r.data),
};

// ── B-3 Types ──────────────────────────────────────────────────

export interface RealSavingsPeriod {
  period: string;
  label: string;
  solar_kwh: number;
  consumption_kwh: number;
  net_kwh: number;
  saved_kwh: number;
  cost_usd: number;
  autonomy_pct: number;
  n_days: number;
}

export interface RealSavingsKpis {
  total_solar_kwh: number;
  total_consumption_kwh: number;
  total_saved_kwh: number;
  total_cost_usd: number;
  pct_autonomy: number;
  tariff_per_kwh: number;
  currency: string;
  aligned_days: number;
  supply_mode_zero_cost: boolean;
}

export interface RealSavingsResponse {
  data: RealSavingsPeriod[];
  kpis: RealSavingsKpis;
  has_real_data: boolean;
  message?: string;
  error?: string;
}

// ── B-4 Types ──────────────────────────────────────────────────

export type ViabilityStatus = 'oversized' | 'autonomous' | 'deficit';

export interface ViabilityPeriod {
  period: string;
  label: string;
  solar_kwh: number;
  consumption_kwh: number;
  viability_ratio: number;
  status: ViabilityStatus;
}

export interface ViabilitySummary {
  global_ratio: number;
  status: ViabilityStatus;
  aligned_days: number;
  interpretation: string;
}

export interface ViabilityResponse {
  data: ViabilityPeriod[];
  summary: ViabilitySummary;
  has_real_data: boolean;
  message?: string;
}

// ── B-5 Types ──────────────────────────────────────────────────

export interface DemandEnvelopePeriod {
  period: string;
  label: string;
  solar_avg_kw: number;
  avg_load_kw?: number;
  max_load_kw?: number;
  min_load_kw?: number;
  n_days: number;
  peak_exceeds_solar?: boolean;
}

export interface DemandEnvelopeSummary {
  aligned_days: number;
  avg_solar_kw: number | null;
  avg_load_kw: number | null;
}

export interface DemandEnvelopeResponse {
  data: DemandEnvelopePeriod[];
  summary: DemandEnvelopeSummary;
  has_real_data: boolean;
  message?: string;
  error?: string;
}

