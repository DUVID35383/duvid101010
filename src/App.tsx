import React, { useState, useEffect } from 'react';
import { Project, MaterialCatalogItem, GlobalPricingSettings, MaterialCategory, CategoryPricingConfig, AppDocument } from './types';
import { getDefaultTerms } from './data/defaultTerms';
import { Navbar } from './components/Navbar';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectForm } from './components/ProjectForm';
import { BOMView } from './components/BOMView';
import { ClientQuoteView } from './components/ClientQuoteView';
import { DocumentsView } from './components/DocumentsView';
import { MaterialCatalogView } from './components/MaterialCatalogView';
import { PricingExplanationView } from './components/PricingExplanationView';
import { ReceiptScannerView } from './components/ReceiptScannerView';
import { FolderKanban, Plus } from 'lucide-react';

const STORAGE_KEY_PROJECTS = 'mobile_room_calc_projects_v2';
const STORAGE_KEY_CATALOG = 'mobile_room_calc_catalog_v3';
const STORAGE_KEY_GLOBAL_SETTINGS = 'mobile_room_calc_global_settings_v1';
const STORAGE_KEY_DOCUMENTS = 'mobile_room_calc_documents_v1';

export default function App() {
  // Load Projects from localStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage:', e);
    }
    return [];
  });

  // Load Material Catalog from localStorage (default is empty array as requested)
  const [catalog, setCatalog] = useState<MaterialCatalogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATALOG);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load catalog from localStorage:', e);
    }
    return [];
  });

  // Load Global Pricing Settings from localStorage
  const [globalSettings, setGlobalSettings] = useState<GlobalPricingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GLOBAL_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to load global settings from localStorage:', e);
    }
    return {
      contractorMarginPercent: 20,
      vatRatePercent: 18,
      defaultLaborCostTotal: 8500,
      defaultConstructionWorkHours: 40,
      defaultConstructionHourlyRate: 120,
      categoryPricing: {
        construction: { method: 'square_meter', quantity: 15, unitPrice: 250 },
        floor: { method: 'square_meter', unitPrice: 180 },
        panels: { method: 'square_meter', unitPrice: 200 },
        wall_cladding: { method: 'square_meter', unitPrice: 120 },
        wheels: { method: 'square_meter', quantity: 15, unitPrice: 100 },
        openings: { method: 'work_hours', unitPrice: 150 },
        electrical: { method: 'work_hours', quantity: 16, unitPrice: 150 },
        hardware: { method: 'square_meter', unitPrice: 45 },
      } as Partial<Record<MaterialCategory, CategoryPricingConfig>>,
    };
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [documentsSection, setDocumentsSection] = useState<'archive' | 'quotes'>('archive');

  // Load System Documents Archive from localStorage
  const [documents, setDocuments] = useState<AppDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load documents from localStorage:', e);
    }
    return [];
  });

  // Save Projects to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  }, [projects]);

  // Save Catalog to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    } catch (e) {
      console.error('Failed to save catalog to localStorage:', e);
    }
  }, [catalog]);

  // Save Global Settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GLOBAL_SETTINGS, JSON.stringify(globalSettings));
    } catch (e) {
      console.error('Failed to save global settings to localStorage:', e);
    }
  }, [globalSettings]);

  // Save Documents Archive to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents to localStorage:', e);
    }
  }, [documents]);

  // Reset documents tab to archive view when leaving the tab
  useEffect(() => {
    if (activeTab !== 'quote') {
      setDocumentsSection('archive');
    }
  }, [activeTab]);

  const currentProject = projects.find((p) => p.id === currentProjectId) || null;

  // Handlers
  const handleNewProject = () => {
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: `חדר נייד חדש #${projects.length + 1}`,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      
      contractorMarginPercent: 25,
      vatEnabled: true,
      notes: '',
      termsAndWarranty: getDefaultTerms(),

      sectionToggles: {
        includeBottomStructure: true,
        includeWheels: true,
        includeFloor: true,
        includeWallsAndRoof: true,
        includeInteriorCladding: true,
        includeElectrical: true,
        includeHVAC: true,
        includeExteriorCladding: true,
      },

      hvac: {
        enabled: true,
        airConditioner: 'none',
        venta: {
          enabled: false,
          quantity: 1,
          diameterInch: 4,
          direction: 'exhaust',
        },
      },

      dimensions: {
        length: 6.0,
        width: 2.5,
        height: 2.5,
      },

      construction: {
        profileSpacingCm: 60,
        materialType: 'steel',
        profileSpec: '',
        unitWeightKgPerMeter: 3.8,
      },

      wheels: {
        wheelType: '',
        quantity: 4,
        loadCapacityPerWheelKg: 0,
        loadCapacityManual: false,
        unitPrice: 0,
      },

      floor: {
        basePlateType: '',
        topCovering: 'none',
        insulationType: 'none',
      },

      wallRoof: {
        panelType: '',
        panelThicknessMm: 50,
        panelTrackType: 'none',
        claddingExterior: 'none',
        polymerCladding: {
          type: 'none',
          heightMode: 'full',
          customHeightCm: 120,
        },
        roofPanelType: '',
        roofOverhangCm: 0,
      },

      openings: [],

      electrical: {
        powerOutletsCount: 0,
        heavyPowerOutletsCount: 0,
        switchesCount: 0,
        lightingPointsCount: 0,
        mainPanelType: '',
        airConditioner: 'none',
        installationType: 'hidden_in_panel',
        panelLocation: 'corner',
        feedDistanceMeters: 0,
        powerOutletAvgDistanceMeters: 0,
      },
    };

    setProjects([newProj, ...projects]);
    setCurrentProjectId(newProj.id);
    setActiveTab('builder');
  };

  const handleDuplicateProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    const dupProj: Project = {
      ...JSON.parse(JSON.stringify(target)),
      id: `proj_${Date.now()}`,
      name: `${target.name} (עותק)`,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
    };

    setProjects([dupProj, ...projects]);
    setCurrentProjectId(dupProj.id);
    setActiveTab('builder');
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert('לא ניתן למחוק את הפרויקט היחיד במערכת. צור פרויקט חדש תחילה.');
      return;
    }

    if (window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      setDocuments((prev) => prev.filter((d) => d.projectId !== id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setActiveTab('dashboard');
      }
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  };

  const handleAddProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
  };

  const handleCloseProject = () => {
    setCurrentProjectId(null);
    setActiveTab('dashboard');
  };

  const handleRegisterDocument = (doc: Omit<AppDocument, 'id' | 'createdAt'>) => {
    setDocuments((prev) => [
      {
        ...doc,
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateCatalog = (updatedCatalog: MaterialCatalogItem[]) => {
    setCatalog(updatedCatalog);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Assistant','Heebo',sans-serif]">
      {/* App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentProject={currentProject}
        onNewProject={handleNewProject}
        onCloseProject={handleCloseProject}
        catalog={catalog}
      />

      {/* Main View Area */}
      <main className={'flex-1 w-full min-w-0 px-6 py-6' + (activeTab === 'builder' ? ' lg:pr-[344px]' : '')}>
        {activeTab === 'dashboard' && (
          <ProjectDashboard
            projects={projects}
            catalog={catalog}
            currentProjectId={currentProjectId}
            onSelectProject={setCurrentProjectId}
            onNewProject={handleNewProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onOpenProjectBuilder={(id) => {
              setCurrentProjectId(id);
              setActiveTab('builder');
            }}
          />
        )}

        {['builder', 'bom'].includes(activeTab) && !currentProject && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4 my-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-inner">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                אין פרויקט פתוח. בחר פרויקט מהרשימה או צור פרויקט חדש
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                יש לבחור פרויקט קיים או ליצור פרויקט חדש כדי להשתמש במחולל האפיון וברשימת הקניות.
              </p>
            </div>
            <button
              onClick={handleNewProject}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20 active:scale-95"
              id="empty-project-tab-new-btn"
            >
              <Plus className="w-4 h-4" />
              <span>פרויקט חדש</span>
            </button>
          </div>
        )}

        {activeTab === 'builder' && currentProject && (
          <ProjectForm
            project={currentProject}
            catalog={catalog}
            onUpdateProject={handleUpdateProject}
            onGoToBOM={() => setActiveTab('bom')}
            onGoToQuote={() => {
              setDocumentsSection('quotes');
              setActiveTab('quote');
            }}
            onGoToCatalog={() => setActiveTab('catalog')}
            onRegisterDocument={handleRegisterDocument}
          />
        )}

        {activeTab === 'bom' && currentProject && (
          <BOMView
            project={currentProject}
            catalog={catalog}
            projects={projects}
            onBackToBuilder={() => setActiveTab('builder')}
            onUpdateProject={handleUpdateProject}
            onRegisterDocument={handleRegisterDocument}
          />
        )}

        {activeTab === 'quote' && (
          <DocumentsView
            projects={projects}
            catalog={catalog}
            currentProjectId={currentProjectId}
            documents={documents}
            initialSection={documentsSection}
            onSectionChange={setDocumentsSection}
            onRegisterDocument={handleRegisterDocument}
            onDeleteDocument={handleDeleteDocument}
            onSelectProject={setCurrentProjectId}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            onDeleteProject={(id) => {
              const remaining = projects.filter((p) => p.id !== id);
              setProjects(remaining);
              setDocuments((prev) => prev.filter((d) => d.projectId !== id));
              if (currentProjectId === id) {
                setCurrentProjectId(null);
              }
            }}
            onOpenProjectBuilder={(id) => {
              setCurrentProjectId(id);
              setActiveTab('builder');
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <MaterialCatalogView
            catalog={catalog}
            onUpdateCatalog={handleUpdateCatalog}
            onGoToReceipts={() => setActiveTab('receipts')}
          />
        )}

        {activeTab === 'pricing_formula' && (
          <PricingExplanationView
            catalog={catalog}
            globalSettings={globalSettings}
            onUpdateGlobalSettings={setGlobalSettings}
            sampleProject={currentProject}
          />
        )}

        {activeTab === 'receipts' && (
          <ReceiptScannerView
            catalog={catalog}
            onUpdateCatalog={handleUpdateCatalog}
            projects={projects}
            onRegisterDocument={handleRegisterDocument}
          />
        )}
      </main>

      {/* Global Footer - Hidden on Print */}
      <footer className={'bg-white border-t border-slate-200 text-slate-500 text-xs py-5 no-print text-center shadow-xs px-6' + (activeTab === 'builder' ? ' lg:pr-[344px]' : '')}>
        <div className="w-full">
          <span>מחשבון ואומדן לבניית חדרים ניידים על גלגלים &copy; {new Date().getFullYear()} | פיתוח והנדסת מבנים</span>
        </div>
      </footer>
    </div>
  );
}
