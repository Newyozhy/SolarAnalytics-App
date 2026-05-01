import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectsPage } from './pages/ProjectsPage';

function App() {
  return (
    <div className="flex h-screen overflow-hidden w-full text-left bg-background text-foreground">
      <Sidebar />
      <ProjectsPage />
    </div>
  );
}

export default App;
