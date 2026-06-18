import React, { useState, useEffect } from 'react';
import { Link2, Zap, AlertCircle, Check, Loader2, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { projectsApi } from '@/api/projects';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  onLinkSuccess: () => void;
}

export function PanelConsumptionLink({ projectId, onLinkSuccess }: Props) {
  const [dcProjects, setDcProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoadingList(true);
    projectsApi.listDcLoadProjects()
      .then(res => {
        setDcProjects(res.dc_load_projects || []);
        if (res.dc_load_projects && res.dc_load_projects.length > 0) {
          setSelectedProjectId(res.dc_load_projects[0].folder_id);
        }
      })
      .catch(err => {
        console.error(err);
        setError("Error al cargar la lista de consumos provisionales.");
      })
      .finally(() => setLoadingList(false));
  }, []);

  const handleLink = async () => {
    if (!selectedProjectId) return;
    setLinking(true);
    setError(null);
    try {
      await projectsApi.linkConsumption(projectId, selectedProjectId);
      setSuccess(true);
      setTimeout(() => {
        onLinkSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Error al vincular el consumo.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 space-y-5 max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#008ED3]/10 shrink-0">
          <Link2 className="w-6 h-6 text-[#008ED3]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Asociación Manual de Consumo DC</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Este proyecto solar no tiene registros de consumo de carga real vinculados.
            Puedes asociarle cualquiera de los consumos provisionales detectados en las hojas de cálculo Excel.
          </p>
        </div>
      </div>

      {loadingList ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[#008ED3]" />
          Cargando ubicaciones de consumo disponibles...
        </div>
      ) : dcProjects.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            No se encontraron consumos provisionales disponibles en el sistema. 
            Primero procesa una carpeta que contenga archivos Excel de consumo (DC Load Consumption) para importarlos.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Seleccionar consumo de sitio
            </label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008ED3]/50"
              disabled={linking || success}
            >
              {dcProjects.map(proj => (
                <option key={proj.folder_id} value={proj.folder_id}>
                  {proj.folder_name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {success ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <Check className="w-4 h-4" />
              ¡Consumo vinculado correctamente! Recargando dashboard...
            </div>
          ) : (
            <Button
              onClick={handleLink}
              disabled={linking || !selectedProjectId}
              className="w-full h-10 gap-2 font-semibold bg-[#008ED3] text-white hover:bg-[#006FA8] transition-colors"
            >
              {linking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vinculando datos...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Vincular a este Proyecto
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
