import React, { useState } from 'react';
import { Project, MaterialCatalogItem, ProjectStatus, AppDocument } from '../types';
import { calculateClientQuote, calculateAreas, buildQuoteSnapshot } from '../utils/calculations';
import { getDefaultTerms, saveDefaultTerms } from '../data/defaultTerms';
import { ClientQuoteView } from './ClientQuoteView';
import { SaveDocumentModal } from './SaveDocumentModal';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  Eye, 
  ArrowRight, 
  DollarSign, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Share2, 
  Filter, 
  Save, 
  RotateCcw,
  Building,
  Ruler,
  Clock,
  Sparkles
} from 'lucide-react';

interface QuotesManagementViewProps {
  projects: Project[];
  catalog: MaterialCatalogItem[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onAddProject: (newProject: Project) => void;
  onDeleteProject: (id: string) => void;
  onRegisterDocument?: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => void;
}

export const QuotesManagementView: React.FC<QuotesManagementViewProps> = ({
  projects,
  catalog,
  currentProjectId,
  onSelectProject,
  onUpdateProject,
  onAddProject,
  onDeleteProject,
  onRegisterDocument,
}) => {
  // Mode: 'list' (overview), 'edit' (create/edit form), 'preview' (official PDF preview)
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'preview'>('list');
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(currentProjectId || (projects[0]?.id || null));
  
  // Search & Filter state for list view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Delete confirmation modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Save to System archive modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Toast notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Get currently selected quote/project
  const selectedProject = projects.find((p) => p.id === activeQuoteId) || projects[0] || null;

  // Handler to view/preview a quote
  const handlePreviewQuote = (id: string) => {
    setActiveQuoteId(id);
    onSelectProject(id);
    setViewMode('preview');
  };

  // Handler to edit a quote
  const handleEditQuote = (id: string) => {
    setActiveQuoteId(id);
    onSelectProject(id);
    setViewMode('edit');
  };

  // Handler to delete a quote
  const handleDeleteQuote = (id: string) => {
    onDeleteProject(id);
    setDeleteConfirmId(null);
    showToast('הצעת המחיר נמחקה בהצלחה');
    if (activeQuoteId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveQuoteId(remaining[0]?.id || null);
    }
  };

  // Handler to start a new quote
  const handleCreateNewQuote = () => {
    const newId = `proj_${Date.now()}`;
    const newQuote: Project = {
      id: newId,
      name: `הצעת מחיר חדשה #${projects.length + 1}`,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      date: new Date().toISOString().split('T')[0],
      status: 'quotation',
      
      contractorMarginPercent: 25,
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
        airConditioner: 'ac_15hp',
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
        profileSpec: '80x40x2',
        unitWeightKgPerMeter: 3.8,
      },

      wheels: {
        wheelType: 'swivel_brake',
        quantity: 6,
        loadCapacityPerWheelKg: 500,
        unitPrice: 350,
      },

      floor: {
        basePlateType: 'cement_board_18',
        topCovering: 'spc_vinyl',
        insulationType: 'eps_foam',
      },

      wallRoof: {
        panelType: 'eps_panel',
        panelThicknessMm: 50,
        panelTrackType: 'panel_aluminum_tracks',
        claddingExterior: 'wpc_wood_slats',
        polymerCladding: {
          type: 'plates',
          heightMode: 'full',
          customHeightCm: 120,
        },
      },

      openings: [
        {
          id: `op_${Date.now()}_1`,
          type: 'main_door',
          title: 'דלת כניסה פרופיל קליל 2000',
          widthCm: 90,
          heightCm: 200,
          quantity: 1,
          doorProfile: 'klil_2000',
          glassType: 'triplex',
          pricePerUnit: 2200,
        },
        {
          id: `op_${Date.now()}_2`,
          type: 'window',
          title: 'חלון אלומיניום קליל 7000 הזזה',
          widthCm: 100,
          heightCm: 100,
          quantity: 2,
          glassType: 'glass_4mm',
          pricePerUnit: 850,
        },
      ],

      electrical: {
        powerOutletsCount: 6,
        heavyPowerOutletsCount: 0,
        switchesCount: 4,
        lightingPointsCount: 4,
        mainPanelType: 'single_phase_32a',
        airConditioner: 'ac_15hp',
        installationType: 'hidden_in_panel',
        panelLocation: 'corner',
        feedDistanceMeters: 3,
        powerOutletAvgDistanceMeters: 4,
      },
    };

    onAddProject(newQuote);
    setActiveQuoteId(newId);
    onSelectProject(newId);
    setViewMode('edit');
    showToast('טופס הצעת מחיר חדשה נפתח למילוי');
  };

  // WhatsApp Share Helper
  const handleWhatsAppShare = (project: Project) => {
    const quote = calculateClientQuote(project, catalog);
    const vatEnabled = project.vatEnabled ?? true;
    const phone = project.clientPhone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `שלום ${project.clientName || 'לקוח יקר'},\n\n` +
      `מצורפת הצעת מחיר מס' #QU-${project.id.slice(-5)} עבור "${project.name}".\n` +
      `סה"כ לתשלום ${vatEnabled ? '(כולל מע"מ)' : '(ללא מע"מ)'}: ₪${(vatEnabled ? quote.totalClientPriceWithVat : quote.totalClientPrice).toLocaleString()}.\n\n` +
      `נשמח לעמוד לרשותך לכל שאלה והבהרה!`
    );
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Print / Export PDF (pure print - archive save is done explicitly via the green button)
  const handlePrintQuote = (project: Project) => {
    window.print();
  };

  // Filter projects/quotes for list view
  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.clientPhone || '').includes(searchTerm) ||
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Calculate high level metrics
  const totalQuotesCount = projects.length;
  const totalValueWithVat = projects.reduce((acc, p) => {
    const q = calculateClientQuote(p, catalog);
    return acc + q.totalClientPriceWithVat;
  }, 0);
  const avgQuoteValue = totalQuotesCount > 0 ? Math.round(totalValueWithVat / totalQuotesCount) : 0;

  // Status badges translation helper
  const renderStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">טיוטה</span>;
      case 'quotation':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">הצעה נשלחה</span>;
      case 'in_progress':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">בתהליך עבודה</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">הושלם</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">מחיקת הצעת מחיר</h3>
              <p className="text-xs text-slate-500">
                האם אתה בטוח שברצונך למחוק את הצעת המחיר? פעולה זו היא לצמיתות ולא ניתן לבטלה.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDeleteQuote(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                מחק לצמיתות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 1: LIST OVERVIEW ("סקירת הצעות המחיר") */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-600" />
                <span>סקירת הצעות מחיר ומסמכים רשמיים</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ניהול מרכזי של כל הצעות המחיר ללקוחות, צפייה בתצוגה מקדימה, עריכה וייצוא נקי ל-PDF
              </p>
            </div>

            <button
              onClick={handleCreateNewQuote}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20 active:scale-95"
              id="create-new-quote-btn"
            >
              <Plus className="w-4 h-4" />
              <span>יצירת הצעת מחיר חדשה</span>
            </button>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] font-semibold block mb-1">סה"כ הצעות במערכת</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{totalQuotesCount}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] font-semibold block mb-1">שווי כולל (כולל מע"מ)</span>
                <span className="text-2xl font-black text-orange-600 font-mono">₪{totalValueWithVat.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] font-semibold block mb-1">ממוצע להצעה</span>
                <span className="text-2xl font-black text-slate-900 font-mono">₪{avgQuoteValue.toLocaleString()}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חפש לפי שם לקוח, טלפון, שם פרויקט..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                id="quotes-search-input"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1 ml-1 hidden sm:flex">
                <Filter className="w-3.5 h-3.5" /> סינון:
              </span>
              {[
                { id: 'all', label: 'הכל' },
                { id: 'quotation', label: 'הצעת מחיר' },
                { id: 'draft', label: 'טיוטה' },
                { id: 'in_progress', label: 'בתהליך' },
                { id: 'completed', label: 'הושלם' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quotes List Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-slate-50/50">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">לא נמצאו הצעות מחיר</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'all'
                    ? 'נסה לשנות את מילות החיפוש או הסינון כדי למצוא את הצעת המחיר המבוקשת.'
                    : 'עדיין לא הופקו הצעות מחיר במערכת. לחץ על הכפתור למטה ליצירת הצעת מחיר ראשונה.'}
                </p>
                <button
                  onClick={handleCreateNewQuote}
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>צור הצעת מחיר חדשה</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3.5">מס' הצעה</th>
                      <th className="p-3.5">פרטי הלקוח</th>
                      <th className="p-3.5">פרויקט ומידות</th>
                      <th className="p-3.5">תאריך</th>
                      <th className="p-3.5 text-center">סטטוס</th>
                      <th className="p-3.5 text-left">מחיר סופי ללקוח</th>
                      <th className="p-3.5 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredProjects.map((p) => {
                      const q = calculateClientQuote(p, catalog);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-mono font-bold text-orange-700 whitespace-nowrap">
                            #QU-{p.id.slice(-5)}
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{p.clientName || 'לקוח ללא שם'}</div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5" dir="ltr">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{p.clientPhone || 'לא הוזן טלפון'}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            <div className="text-slate-500 text-[11px]">
                              {p.dimensions.length}m אורך x {p.dimensions.width}m רוחב
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                            {p.date}
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            {renderStatusBadge(p.status)}
                          </td>

                          <td className="p-3.5 text-left font-mono font-black text-orange-600 text-sm whitespace-nowrap">
                            ₪{((p.vatEnabled ?? true) ? q.totalClientPriceWithVat : q.totalClientPrice).toLocaleString()}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Action 1: View / Preview PDF */}
                              <button
                                onClick={() => handlePreviewQuote(p.id)}
                                className="inline-flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-2.5 py-1.5 rounded-lg border border-orange-200/80 transition cursor-pointer text-[11px]"
                                title="צפייה/הורדה כ-PDF"
                                id={`preview-quote-btn-${p.id}`}
                              >
                                <Eye className="w-3.5 h-3.5 text-orange-600" />
                                <span className="hidden sm:inline">תצוגה/PDF</span>
                              </button>

                              {/* Action 2: Edit Quote */}
                              <button
                                onClick={() => handleEditQuote(p.id)}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer text-[11px]"
                                title="ערוך פרטי הצעה"
                                id={`edit-quote-btn-${p.id}`}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                <span className="hidden sm:inline">עריכה</span>
                              </button>

                              {/* Action 3: WhatsApp Share */}
                              <button
                                onClick={() => handleWhatsAppShare(p)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer border border-transparent hover:border-emerald-200"
                                title="שתף ב-WhatsApp"
                                id={`whatsapp-quote-btn-${p.id}`}
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Action 4: Delete */}
                              <button
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="מחיקת הצעת מחיר"
                                id={`delete-quote-btn-${p.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: CREATE / EDIT FORM ("יצירת / עריכת הצעת מחיר") */}
      {viewMode === 'edit' && selectedProject && (
        <div className="space-y-6">
          {/* Edit Top Bar Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="חזרה לרשימה"
                id="back-to-list-from-edit"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>עריכת הצעת מחיר</span>
                  <span className="font-mono text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    #QU-{selectedProject.id.slice(-5)}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">עדכון פרטי לקוח, תכנון הנדסי, מרווח קבלני ותנאים כלליים</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('preview')}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
                id="save-and-preview-btn"
              >
                <Eye className="w-4 h-4" />
                <span>תצוגה מקדימה ו-PDF</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                id="save-and-close-btn"
              >
                שמור וחזור
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Inputs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Client Information */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-orange-600" />
                  <span>1. פרטי הלקוח והזמנה</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם הלקוח / חברה:</label>
                    <input
                      type="text"
                      value={selectedProject.clientName}
                      onChange={(e) => onUpdateProject({ ...selectedProject, clientName: e.target.value })}
                      placeholder="לדוגמה: ישראל ישראלי"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 transition"
                      id="edit-client-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">מספר טלפון:</label>
                    <input
                      type="text"
                      value={selectedProject.clientPhone}
                      onChange={(e) => onUpdateProject({ ...selectedProject, clientPhone: e.target.value })}
                      placeholder="050-0000000"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 transition"
                      dir="ltr"
                      id="edit-client-phone-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">כתובת אימייל:</label>
                    <input
                      type="email"
                      value={selectedProject.clientEmail}
                      onChange={(e) => onUpdateProject({ ...selectedProject, clientEmail: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 transition"
                      dir="ltr"
                      id="edit-client-email-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">כתובת / יעד אספקה:</label>
                    <input
                      type="text"
                      value={selectedProject.clientAddress}
                      onChange={(e) => onUpdateProject({ ...selectedProject, clientAddress: e.target.value })}
                      placeholder="לדוגמה: מתחם עבודה, עמק חפר"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 transition"
                      id="edit-client-address-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם הפרויקט / תיאור קצר:</label>
                    <input
                      type="text"
                      value={selectedProject.name}
                      onChange={(e) => onUpdateProject({ ...selectedProject, name: e.target.value })}
                      placeholder="לדוגמה: חדר נייד למשרד ומגורים 6x2.5"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 transition"
                      id="edit-project-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תאריך ההצעה וסטטוס:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={selectedProject.date}
                        onChange={(e) => onUpdateProject({ ...selectedProject, date: e.target.value })}
                        className="bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-2.5 py-2 text-xs text-slate-900"
                        id="edit-project-date-input"
                      />
                      <select
                        value={selectedProject.status}
                        onChange={(e) => onUpdateProject({ ...selectedProject, status: e.target.value as ProjectStatus })}
                        className="bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900"
                        id="edit-project-status-select"
                      >
                        <option value="draft">טיוטה</option>
                        <option value="quotation">הצעת מחיר</option>
                        <option value="in_progress">בתהליך עבודה</option>
                        <option value="completed">הושלם</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Dimensions & Project Specs Quick Controls */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Ruler className="w-4 h-4 text-orange-600" />
                  <span>2. מידות ופרמטרים עיקריים למבנה</span>
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">אורך (מטרים):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="15"
                      value={selectedProject.dimensions.length}
                      onChange={(e) =>
                        onUpdateProject({
                          ...selectedProject,
                          dimensions: { ...selectedProject.dimensions, length: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                      id="edit-dim-length-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">רוחב (מטרים):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={selectedProject.dimensions.width}
                      onChange={(e) =>
                        onUpdateProject({
                          ...selectedProject,
                          dimensions: { ...selectedProject.dimensions, width: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                      id="edit-dim-width-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">גובה (מטרים):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="4"
                      value={selectedProject.dimensions.height}
                      onChange={(e) =>
                        onUpdateProject({
                          ...selectedProject,
                          dimensions: { ...selectedProject.dimensions, height: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                      id="edit-dim-height-input"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>שטח רצפה:</strong> {(selectedProject.dimensions.length * selectedProject.dimensions.width).toFixed(1)} מ"ר
                  </span>
                  <span>
                    <strong>נפח פנימי:</strong> {(selectedProject.dimensions.length * selectedProject.dimensions.width * selectedProject.dimensions.height).toFixed(1)} מ"ק
                  </span>
                  <span>
                    <strong>מספר פתחים:</strong> {selectedProject.openings.length} פתחים
                  </span>
                </div>
              </div>

              {/* Section 3: Terms & Warranty Free Text Area */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span>3. תנאים כלליים, אחריות ותנאי תשלום</span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProject({ ...selectedProject, termsAndWarranty: getDefaultTerms() });
                      showToast('תנאי ברירת המחדל הוטענו');
                    }}
                    className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>טען ברירת מחדל</span>
                  </button>
                </div>

                <textarea
                  value={selectedProject.termsAndWarranty || getDefaultTerms()}
                  onChange={(e) => onUpdateProject({ ...selectedProject, termsAndWarranty: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl p-3 text-xs text-slate-900 leading-relaxed font-sans focus:outline-none transition"
                  placeholder="הזן את התנאים הכלליים, פריסת התשלומים ואחריות המבנה..."
                  id="edit-terms-textarea"
                />
              </div>

            </div>

            {/* Right 1 Col: Pricing Calculations & Margin Sidebar */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-24">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <span>חישוב ותמחר הצעת מחיר</span>
                </h3>

                {(() => {
                  const q = calculateClientQuote(selectedProject, catalog);
                  const vatEnabled = selectedProject?.vatEnabled ?? true;
                  return (
                    <div className="space-y-4 text-xs">
                      {/* Material Cost Breakdown */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span>עלות חומרים ורכיבים:</span>
                        <span className="font-mono font-bold text-slate-900">₪{q.materialsCost.toLocaleString()}</span>
                      </div>

                      {/* Labor Cost Control */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <label className="block text-slate-700 font-bold text-[11px]">עלות עבודה והרכבה (₪):</label>
                        <input
                          type="number"
                          step="500"
                          value={selectedProject.laborCostTotal}
                          onChange={(e) => onUpdateProject({ ...selectedProject, laborCostTotal: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold text-xs focus:outline-none focus:border-orange-500"
                          id="edit-sidebar-labor-input"
                        />
                      </div>

                      {/* Contractor Margin Control */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700 font-bold text-[11px]">אחוז רווח קבלני / בנייה:</span>
                          <span className="font-black text-orange-600 text-sm">{selectedProject.contractorMarginPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          step="1"
                          value={selectedProject.contractorMarginPercent}
                          onChange={(e) => onUpdateProject({ ...selectedProject, contractorMarginPercent: parseInt(e.target.value) || 0 })}
                          className="w-full accent-orange-600 cursor-pointer"
                          id="edit-sidebar-margin-slider"
                        />
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-2 text-slate-600">
                        <div className="flex justify-between">
                          <span>סה"כ לפני מע"מ:</span>
                          <span className="font-mono font-bold text-slate-900">₪{q.subtotalBeforeVat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>מע"מ {vatEnabled ? `${Math.round(q.vatRate * 100)}%` : '0% - מבוטל'}:</span>
                          <span className="font-mono font-bold text-slate-900">₪{(vatEnabled ? q.vatAmount : 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Final Price Highlight */}
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 text-center space-y-1">
                        <span className="text-orange-950 text-[11px] font-bold block">מחיר סופי ללקוח {vatEnabled ? '(כולל מע"מ)' : '(ללא מע"מ)'}</span>
                        <span className="text-2xl font-black text-orange-600 block font-mono">
                          ₪{(vatEnabled ? q.totalClientPriceWithVat : q.totalClientPrice).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => setViewMode('preview')}
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-orange-600/20"
                        id="edit-sidebar-preview-btn"
                      >
                        <Eye className="w-4 h-4" />
                        <span>הצג תצוגה מקדימה וייצוא ל-PDF</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: OFFICIAL PREVIEW & PDF EXPORT ("תצוגה מקדימה וייצוא ל-PDF") */}
      {viewMode === 'preview' && selectedProject && (
        <div className="space-y-6">
          {/* Preview Navigation Toolbar (Hidden on Print) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                id="preview-back-to-list-btn"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לרשימת הצעות</span>
              </button>

              <button
                onClick={() => setViewMode('edit')}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                id="preview-edit-quote-btn"
              >
                <Edit3 className="w-4 h-4 text-slate-600" />
                <span>ערוך פרטי הצעה זו</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleWhatsAppShare(selectedProject)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                id="preview-whatsapp-btn"
              >
                <Share2 className="w-4 h-4" />
                <span>שתף ב-WhatsApp</span>
              </button>

              <button
                onClick={() => setSaveModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                id="preview-save-to-system-btn"
              >
                <Save className="w-4 h-4" />
                <span>שמור במערכת</span>
              </button>

              <button
                onClick={() => handlePrintQuote(selectedProject)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
                id="preview-print-pdf-btn"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס / הורד כ-PDF</span>
              </button>
            </div>
          </div>

          {/* Render Full Official Client Quote Document */}
          <ClientQuoteView
            project={selectedProject}
            catalog={catalog}
            onUpdateProject={onUpdateProject}
          />
        </div>
      )}

      {/* Save to System Archive Modal */}
      <SaveDocumentModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        projects={projects}
        defaultName={`הצעת מחיר - ${selectedProject?.clientName || selectedProject?.name || ''} (#QU-${(selectedProject?.id || '').slice(-5)})`}
        defaultKind="quote"
        defaultProjectId={selectedProject?.id ?? null}
        onSave={(payload) => {
          if (selectedProject) {
            const q = calculateClientQuote(selectedProject, catalog);
            const vatEnabled = selectedProject.vatEnabled ?? true;
            onRegisterDocument?.({
              projectId: payload.projectId,
              kind: payload.kind,
              name: payload.name,
              notes: payload.notes,
              meta: {
                totalPrice: (vatEnabled ? q.totalClientPriceWithVat : q.totalClientPrice),
                status: selectedProject.status,
                snapshot: buildQuoteSnapshot(selectedProject, catalog),
              },
            });
            showToast('המסמך נשמר בארכיון בהצלחה');
          }
        }}
      />
    </div>
  );
};
