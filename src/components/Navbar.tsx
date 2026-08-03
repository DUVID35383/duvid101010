import React from 'react';
import { 
  FolderKanban, 
  FolderOpen, 
  ShoppingBag, 
  Calculator, 
  Tags, 
  ScanLine, 
  Plus, 
  Truck, 
  AlertTriangle, 
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Project } from '../types';
import { calculateClientQuote, calculateEstimatedWeight } from '../utils/calculations';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentProject: Project | null;
  onNewProject: () => void;
  onCloseProject: () => void;
  catalog?: any[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentProject,
  onNewProject,
  onCloseProject,
  catalog = [],
}) => {
  const quote = currentProject ? calculateClientQuote(currentProject, catalog) : null;
  const weight = currentProject ? calculateEstimatedWeight(currentProject) : null;
  const vatEnabled = currentProject?.vatEnabled ?? true;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 sticky top-0 z-50 no-print shadow-xs w-full">
      {/* Top Header Bar */}
      <div className="w-full px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/15">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>חדרים ניידים על גלגלים</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  מחשבון & אומדן AI
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                מערכת תכנון, חישוב קונסטרוקציה, תמחירון והצעות מחיר
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar if project selected */}
          {currentProject && quote && weight && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">פרויקט פעיל:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[140px]" title={currentProject.name}>
                  {currentProject.name}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">משקל משוער:</span>
                <span className={`font-bold flex items-center gap-1 ${weight.isOverweight ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {weight.totalGrossWeightKg.toLocaleString()} ק"ג
                  {weight.isOverweight ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" title="חריגת משקל מכושר הגלגלים!" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" title="משקל תואם לגלגלים" />
                  )}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">עלות חומרים:</span>
                <span className="font-bold text-slate-800">
                  ₪{quote.materialsCost.toLocaleString()}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">הצעת מחיר ללקוח {vatEnabled ? '(כולל מע"מ)' : '(ללא מע"מ)'}:</span>
                <span className="font-black text-orange-600 text-sm">
                  ₪{(vatEnabled ? quote.totalClientPriceWithVat : quote.totalClientPrice).toLocaleString()}
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <button
                onClick={onCloseProject}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 px-3 py-2 rounded-lg transition cursor-pointer active:scale-95"
                id="close-project-btn"
                title="סגירת פרויקט וחזרה לרשימת הפרויקטים"
              >
                <span>סגור פרויקט / חזור לרשימה</span>
              </button>
            </div>
          )}

          {/* New Project CTA Button */}
          <button
            onClick={onNewProject}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-sm shadow-orange-600/20 transition duration-150 active:scale-95 cursor-pointer text-sm"
            id="new-project-btn"
          >
            <Plus className="w-4 h-4" />
            <span>פרויקט חדש</span>
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex items-center gap-1 mt-3 border-t border-slate-200/80 pt-2.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-tab-dashboard"
          >
            <FolderKanban className="w-4 h-4" />
            <span>פרויקטים</span>
          </button>

          <button
            onClick={() => currentProject && setActiveTab('builder')}
            disabled={!currentProject}
            title={!currentProject ? 'פתח פרויקט כדי להמשיך' : undefined}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:cursor-not-allowed ${
              activeTab === 'builder'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:hover:bg-transparent disabled:text-slate-300'
            }`}
            id="nav-tab-builder"
          >
            <Calculator className="w-4 h-4" />
            <span>אפיון ותכנון פרויקט</span>
          </button>

          <button
            onClick={() => currentProject && setActiveTab('bom')}
            disabled={!currentProject}
            title={!currentProject ? 'פתח פרויקט כדי להמשיך' : undefined}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:cursor-not-allowed ${
              activeTab === 'bom'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:hover:bg-transparent disabled:text-slate-300'
            }`}
            id="nav-tab-bom"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>רשימת קניות לספקים (BOM)</span>
          </button>

          <button
            onClick={() => setActiveTab('quote')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'quote'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-tab-quote"
          >
            <FolderOpen className="w-4 h-4" />
            <span>מסמכים במערכת</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-tab-catalog"
          >
            <Tags className="w-4 h-4" />
            <span>מחירון חומרים</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing_formula')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'pricing_formula'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-tab-pricing-formula"
          >
            <Sliders className="w-4 h-4" />
            <span>הסבר ומנגנון תמחור</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'receipts'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="nav-tab-receipts"
          >
            <ScanLine className="w-4 h-4" />
            <span>סריקת חשבוניות (Gemini AI)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
