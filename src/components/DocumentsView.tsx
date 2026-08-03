import React, { useState } from 'react';
import { Project, MaterialCatalogItem, AppDocument, AppDocumentKind } from '../types';
import { QuotesManagementView } from './QuotesManagementView';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  Folder,
  FolderOpen,
  FileText,
  ShoppingBag,
  Receipt,
  Upload,
  ArrowRight,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  Layers,
  ExternalLink,
  Info,
  LucideIcon,
} from 'lucide-react';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const GENERAL_FOLDER_LABEL = 'מסמכים כלליים / חשבוניות נכנסות';

const KIND_CONFIG: Record<AppDocumentKind, { label: string; Icon: LucideIcon; iconClass: string; badgeText: string; badgeClass: string }> = {
  quote: {
    label: 'הצעות מחיר שהופקו (PDF/הדפסה)',
    Icon: FileText,
    iconClass: 'bg-orange-50 text-orange-600 border-orange-200',
    badgeText: 'הצעת מחיר',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  bom: {
    label: 'רשימות קניות לספקים (BOM)',
    Icon: ShoppingBag,
    iconClass: 'bg-blue-50 text-blue-600 border-blue-200',
    badgeText: 'BOM',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  receipt: {
    label: 'חשבוניות נכנסות וקבלות',
    Icon: Receipt,
    iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgeText: 'חשבונית',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  upload: {
    label: 'קבצים שהועלו ידנית',
    Icon: Upload,
    iconClass: 'bg-slate-50 text-slate-600 border-slate-200',
    badgeText: 'קובץ',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

interface DocumentsViewProps {
  projects: Project[];
  catalog: MaterialCatalogItem[];
  currentProjectId: string | null;
  documents: AppDocument[];
  initialSection: 'archive' | 'quotes';
  onSectionChange: (section: 'archive' | 'quotes') => void;
  onRegisterDocument: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => void;
  onDeleteDocument: (id: string) => void;
  onSelectProject: (id: string) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onAddProject: (newProject: Project) => void;
  onDeleteProject: (id: string) => void;
  onOpenProjectBuilder: (id: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  projects,
  catalog,
  currentProjectId,
  documents,
  initialSection,
  onSectionChange,
  onRegisterDocument,
  onDeleteDocument,
  onSelectProject,
  onUpdateProject,
  onAddProject,
  onDeleteProject,
  onOpenProjectBuilder,
}) => {
  const [section, setSection] = useState<'archive' | 'quotes'>(initialSection);
  const [view, setView] = useState<'overview' | 'folder'>('overview');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchSection = (s: 'archive' | 'quotes') => {
    setSection(s);
    onSectionChange(s);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const folderDocs = (projectId: string | null) =>
    documents.filter((d) => (d.projectId ?? null) === projectId);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatSize = (bytes?: number) => {
    if (bytes == null) return '';
    return bytes >= 1048576
      ? `${(bytes / 1048576).toFixed(1)}MB`
      : `${Math.max(1, Math.round(bytes / 1024))}KB`;
  };

  const handleUpload = (files: FileList | null, projectId: string | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    Array.from(files).forEach((file) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        setErrorMessage('קובץ גדול מדי להעלאה לארכיון המקומי (מקסימום ~3MB לקובץ). דחוס את התמונה ונסה שוב.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onRegisterDocument({
          projectId,
          kind: 'upload',
          name: file.name,
          fileName: file.name,
          mimeType: file.type,
          dataUrl: reader.result as string,
          sizeBytes: file.size,
        });
        showToast('הקובץ הועלה לארכיון בהצלחה');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (id: string) => {
    onDeleteDocument(id);
    setDeleteConfirmId(null);
    showToast('המסמך נמחק מהארכיון');
  };

  const openFolder = (projectId: string | null) => {
    setActiveFolderId(projectId);
    setView('folder');
  };

  // Quotes Management Center
  if (section === 'quotes') {
    return (
      <div className="space-y-4">
        <SectionSwitcher section={section} onSwitch={switchSection} />
        <QuotesManagementView
          projects={projects}
          catalog={catalog}
          currentProjectId={currentProjectId}
          onSelectProject={onSelectProject}
          onUpdateProject={onUpdateProject}
          onAddProject={onAddProject}
          onDeleteProject={onDeleteProject}
          onRegisterDocument={onRegisterDocument}
        />
      </div>
    );
  }

  // ============ ARCHIVE (Folders) ============
  const totalDocs = documents.length;
  const totalQuotes = documents.filter((d) => d.kind === 'quote').length;
  const totalReceipts = documents.filter((d) => d.kind === 'receipt').length;
  const totalUploads = documents.filter((d) => d.kind === 'upload').length;

  const activeProject = activeFolderId ? projects.find((p) => p.id === activeFolderId) || null : null;
  const isGeneralFolder = activeFolderId === null && view === 'folder';

  const activeFolderTitle = isGeneralFolder ? GENERAL_FOLDER_LABEL : activeProject ? activeProject.name : '';
  const activeDocs = view === 'folder' ? folderDocs(activeFolderId) : [];

  return (
    <div className="space-y-6">
      <SectionSwitcher section={section} onSwitch={switchSection} />

      {/* Toast Notification */}
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
              <h3 className="font-extrabold text-slate-900 text-lg">מחיקת מסמך מהארכיון</h3>
              <p className="text-xs text-slate-500">
                האם אתה בטוח שברצונך למחוק מסמך זה מהארכיון? פעולה זו היא לצמיתות ולא ניתן לבטלה.
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
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                מחק לצמיתות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Archive Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-600" />
            <span>ארכיון מסמכים במערכת</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            תיקיית מסמכים לכל פרויקט: הצעות מחיר שהופקו, רשימות קניות לספקים, חשבוניות נכנסות וקבצים שהועלו ידנית
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>הארכיון נשמר אוטומטית במערכת</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label={'סה"כ מסמכים'} value={totalDocs} className="text-slate-900" />
        <MetricCard label="הצעות מחיר" value={totalQuotes} className="text-orange-600" />
        <MetricCard label="חשבוניות וקבלות" value={totalReceipts} className="text-emerald-600" />
        <MetricCard label="קבצים שהועלו" value={totalUploads} className="text-blue-600" />
      </div>

      {view === 'overview' ? (
        /* ================= FOLDERS OVERVIEW ================= */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">תיקיות פרויקטים ומסמכים</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{projects.length + 1} תיקיות בארכיון</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* General Folder */}
            <button
              onClick={() => openFolder(null)}
              className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300 rounded-2xl p-5 text-right transition cursor-pointer shadow-2xs hover:shadow-xs flex flex-col gap-3 min-w-0"
              id="folder-general-btn"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-white/70 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  כללי
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-slate-900 text-sm">{GENERAL_FOLDER_LABEL}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">חשבוניות ספקים וקבלות שאינן משויכות לפרויקט ספציפי</p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-black text-amber-800 bg-white/80 border border-amber-200 rounded-full px-2.5 py-0.5">
                  {folderDocs(null).length} מסמכים
                </span>
                <span className="text-slate-400 flex items-center gap-0.5 mr-auto font-semibold">
                  <span>פתח תיקייה</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>

            {/* Project Folders */}
            {projects.map((p) => {
              const count = folderDocs(p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => openFolder(p.id)}
                  className={`bg-white border rounded-2xl p-5 text-right transition cursor-pointer shadow-2xs hover:shadow-xs flex flex-col gap-3 min-w-0 ${
                    currentProjectId === p.id ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  id={`folder-project-${p.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
                      <Folder className="w-6 h-6" />
                    </div>
                    {currentProjectId === p.id && (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full shrink-0">
                        פרויקט פעיל
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate" title={p.name}>{p.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate" dir="ltr">
                      {p.clientName || 'ללא לקוח'} | {p.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-black text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                      {count} מסמכים
                    </span>
                    <span className="text-slate-400 flex items-center gap-0.5 mr-auto font-semibold">
                      <span>פתח תיקייה</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {projects.length === 0 && (
            <div className="bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-xs">
              אין עדיין פרויקטים במערכת. צור פרויקט חדש כדי שייווצרו עבורו תיקיית מסמכים אוטומטית.
            </div>
          )}
        </div>
      ) : (
        /* ================= FOLDER DETAIL ================= */
        <div className="space-y-6">
          {/* Folder Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setView('overview')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shrink-0"
                title="חזרה לכל התיקיות"
                id="folder-back-to-overview"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 truncate">
                  <FolderOpen className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="truncate">{activeFolderTitle}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {activeDocs.length} מסמכים בתיקייה
                  {activeFolderId && activeProject && (
                    <button
                      onClick={() => onOpenProjectBuilder(activeFolderId)}
                      className="text-orange-700 hover:text-orange-900 font-extrabold underline flex items-center gap-0.5 cursor-pointer mt-1"
                      id="folder-open-project-builder"
                    >
                      <span>פתח את הפרויקט באפיון ותכנון</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </p>
              </div>
            </div>

            {/* Upload Files */}
            <div className="flex items-center gap-2">
              {errorMessage && (
                <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 max-w-[220px]">
                  {errorMessage}
                </span>
              )}
              <label className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95">
                <Upload className="w-4 h-4" />
                <span>העלאת קבצים לתיקייה</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    handleUpload(e.target.files, activeFolderId);
                    e.target.value = '';
                  }}
                  id={`folder-upload-${activeFolderId || 'general'}`}
                />
              </label>
            </div>
          </div>

          {/* Documents Grouped by Kind */}
          {activeDocs.length === 0 ? (
            <div className="bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500 space-y-2">
              <FolderOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">התיקייה ריקה</h4>
              <p className="text-xs max-w-md mx-auto">
                מסמכים יאספו כאן אוטומטית: כשתפיק הצעת מחיר (PDF), תדפיס רשימת קניות (BOM) או תסרוק חשבונית נכנסת עבור פרויקט זה.
                ניתן גם להעלות קבצים ידנית כגון תמונות תוכנית או חשבוניות ספק.
              </p>
              <button
                onClick={() => {
                  document.getElementById(`folder-upload-${activeFolderId || 'general'}`)?.click();
                }}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer mt-2"
              >
                <Upload className="w-4 h-4" />
                <span>העלה את המסמך הראשון</span>
              </button>
            </div>
          ) : (
            (Object.keys(KIND_CONFIG) as AppDocumentKind[]).map((kind) => {
              const kindDocs = activeDocs.filter((d) => d.kind === kind);
              if (kindDocs.length === 0) return null;
              const cfg = KIND_CONFIG[kind];

              return (
                <div key={kind} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <cfg.Icon className="w-4 h-4 text-slate-600" />
                      <span>{cfg.label}</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                      {kindDocs.length}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {kindDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-3 px-5 py-3 min-w-0 cursor-pointer hover:bg-slate-50/80 transition"
                        title="לחץ לתצוגה מקדימה"
                      >
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                          <cfg.Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 text-xs truncate" title={doc.name}>{doc.name}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.badgeClass}`}>
                              {cfg.badgeText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span>{formatDate(doc.createdAt)}</span>
                            {doc.sizeBytes != null && <span>{formatSize(doc.sizeBytes)}</span>}
                            {doc.kind === 'quote' && doc.meta?.totalPrice != null && (
                              <span className="font-mono font-bold text-orange-700">₪{doc.meta.totalPrice.toLocaleString()}</span>
                            )}
                            {doc.kind === 'receipt' && doc.meta?.totalAmount != null && (
                              <span className="font-mono font-bold text-emerald-700">₪{doc.meta.totalAmount.toLocaleString()}</span>
                            )}
                            {doc.notes && <span className="text-slate-400">{doc.notes}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="תצוגה מקדימה"
                            id={`doc-preview-${doc.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {doc.dataUrl && (
                            <a
                              href={doc.dataUrl}
                              download={doc.fileName || doc.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="הורד קובץ"
                              id={`doc-download-${doc.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {doc.projectId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenProjectBuilder(doc.projectId!); }}
                              className="p-2 text-slate-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                              title="פתח את הפרויקט"
                              id={`doc-open-project-${doc.id}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(doc.id); }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="מחיקת מסמך"
                            id={`doc-delete-${doc.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

function SectionSwitcher({ section, onSwitch }: { section: 'archive' | 'quotes'; onSwitch: (s: 'archive' | 'quotes') => void }) {
  return (
    <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
      <button
        onClick={() => onSwitch('archive')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
          section === 'archive'
            ? 'bg-orange-600 text-white shadow-2xs'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
        id="doc-tab-archive"
      >
        <FolderOpen className="w-4 h-4" />
        <span>ארכיון מסמכים ותיקיות</span>
      </button>
      <button
        onClick={() => onSwitch('quotes')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
          section === 'quotes'
            ? 'bg-orange-600 text-white shadow-2xs'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
        id="doc-tab-quotes"
      >
        <FileText className="w-4 h-4" />
        <span>ניהול הצעות מחיר</span>
      </button>
    </div>
  );
}

function MetricCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
      <span className="text-slate-500 text-[11px] font-semibold block mb-1">{label}</span>
      <span className={`text-2xl font-black font-mono ${className}`}>{value}</span>
    </div>
  );
}
