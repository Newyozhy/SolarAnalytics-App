import React, { createContext, useContext, useState, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectsPage } from './pages/ProjectsPage';

// ─── Shared UI State Context ────────────────────────────────────────────────
interface UIContextValue {
  isAnalysisView: boolean;
  setIsAnalysisView: (v: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const UIContext = createContext<UIContextValue>({
  isAnalysisView: false,
  setIsAnalysisView: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});

export const useUIContext = () => useContext(UIContext);

// ─── App Root ───────────────────────────────────────────────────────────────
function App() {
  const [isAnalysisView, setIsAnalysisView] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSetAnalysisView = useCallback((v: boolean) => {
    setIsAnalysisView(v);
    if (v) {
      // Auto-collapse sidebar when entering analysis view
      setSidebarCollapsed(true);
    }
  }, []);

  return (
    <UIContext.Provider value={{ isAnalysisView, setIsAnalysisView: handleSetAnalysisView, sidebarCollapsed, setSidebarCollapsed }}>
      <div className="flex h-screen overflow-hidden w-full text-left bg-background text-foreground">
        <Sidebar />
        <ProjectsPage />
      </div>
    </UIContext.Provider>
  );
}

export default App;
