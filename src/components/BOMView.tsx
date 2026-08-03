import React, { useState } from 'react';
import { Project, MaterialCatalogItem, MaterialCategory, AppDocument } from '../types';
import { calculateBOM, calculateAreas, calculateStructuralMeters, calculateClientQuote, buildBOMSnapshot } from '../utils/calculations';
import { SaveDocumentModal } from './SaveDocumentModal';
import { 
  ShoppingBag, 
  Printer, 
  Copy, 
  Check, 
  Layers, 
  Footprints, 
  Home, 
  Truck, 
  DoorOpen, 
  Zap, 
  Wrench,
  PaintBucket,
  Save,
} from 'lucide-react';

interface BOMViewProps {
  project: Project;
  catalog: MaterialCatalogItem[];
  projects?: Project[];
  onBackToBuilder: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onRegisterDocument?: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => void;
}

export const BOMView: React.FC<BOMViewProps> = ({
  project,
  catalog,
  projects = [],
  onUpdateProject,
  onRegisterDocument,
}) => {
  const [copied, setCopied] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const bom = calculateBOM(project, catalog);
  const struct = calculateStructuralMeters(project);
  const areas = calculateAreas(project);

  const CATEGORY_ICONS: Record<MaterialCategory, React.ReactNode> = {
    construction: <Layers className="w-4 h-4 text-orange-600" />,
    floor: <Footprints className="w-4 h-4 text-orange-600" />,
    panels: <Home className="w-4 h-4 text-orange-600" />,
    wall_cladding: <PaintBucket className="w-4 h-4 text-orange-600" />,
    wheels: <Truck className="w-4 h-4 text-orange-600" />,
    openings: <DoorOpen className="w-4 h-4 text-orange-600" />,
    electrical: <Zap className="w-4 h-4 text-orange-600" />,
    hvac: <Wrench className="w-4 h-4 text-orange-600" />,
    hardware: <Wrench className="w-4 h-4 text-orange-600" />,
  };

  // Group items by category
  const categories = Array.from(new Set(bom.map((item) => item.category)));

  const handleCopyText = () => {
    let text = `📋 *רשימת קניות וכתב כמויות לספקים*\n`;
    text += `פרויקט: ${project.name}\n`;
    text += `מידות: ${project.dimensions.length}m x ${project.dimensions.width}m x ${project.dimensions.height}m\n`;
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
    text += `-----------------------------------\n\n`;

    categories.forEach((cat) => {
      const items = bom.filter((i) => i.category === cat);
      if (items.length > 0) {
        text += `🔹 *${items[0].categoryLabelHeb}*:\n`;
        items.forEach((item) => {
          text += `• ${item.name} | כמות: ${item.quantity} ${item.unit} | משוער: ₪${item.totalPrice.toLocaleString()}\n`;
        });
        text += `\n`;
      }
    });

    const totalCost = bom.reduce((sum, item) => sum + item.totalPrice, 0);
    text += `-----------------------------------\n`;
    text += `💰 *סה"כ עלות רכיבי גלם משוערת*: ₪${totalCost.toLocaleString()}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalBOMCost = bom.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-6 print-container">
      {/* Action Header - Hidden during print */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-orange-600" />
            <span>רשימת קניות מרוכזת לספקים (BOM)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ריכוז כמויות ברזל, פרופילים, פלטות רצפה, פאנלים, גלגלים, אלומיניום וציוד חשמל
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyText}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer border border-slate-200"
            id="copy-bom-btn"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'הועתק ללוח!' : 'העתק להודעה'}</span>
          </button>

          <button
            onClick={() => setSaveModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
            id="save-bom-to-system-btn"
          >
            <Save className="w-4 h-4" />
            <span>שמור במערכת</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
            id="print-bom-btn"
          >
            <Printer className="w-4 h-4" />
            <span>הדפס / יצא PDF</span>
          </button>
        </div>
      </div>

      {/* Printable BOM Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 print-card print:border-none print:shadow-none shadow-xs">
        
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              כתב כמויות ורשימת קניות לספקים
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              פרויקט: <strong className="text-slate-900">{project.name}</strong>
            </p>
          </div>

          <div className="text-left text-xs text-slate-600 space-y-0.5">
            <div>תאריך הפקה: <span className="font-mono text-slate-900 font-semibold">{new Date().toLocaleDateString('he-IL')}</span></div>
            <div>מידות החדר: <span className="font-bold text-slate-900">{project.dimensions.length}m x {project.dimensions.width}m x {project.dimensions.height}m</span></div>
            <div>שטח רצפה: <span className="font-bold text-slate-900">{areas.floorArea} מ"ר</span> | אורך פרופילים: <span className="font-bold text-slate-900">{struct.totalLinearMetersWithWaste} מטר רץ</span></div>
          </div>
        </div>

        {/* Categorized Tables */}
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryItems = bom.filter((i) => i.category === category);
            if (categoryItems.length === 0) return null;

            const categoryTotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  {CATEGORY_ICONS[category]}
                  <h3 className="font-bold text-sm text-slate-900">
                    {categoryItems[0].categoryLabelHeb}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5 rounded-r-lg">תיאור פריט / חומר גלם</th>
                        <th className="p-2.5">מפרט / הערות</th>
                        <th className="p-2.5 text-center">כמות נדרשת</th>
                        <th className="p-2.5 text-center">יחידה</th>
                        <th className="p-2.5 text-left">מחיר יחידה</th>
                        <th className="p-2.5 text-left rounded-l-lg">סה"כ משוער</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {categoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                          <td className="p-2.5 text-slate-500 text-[11px]">{item.specification}</td>
                          <td className="p-2.5 text-center font-extrabold text-orange-600">{item.quantity}</td>
                          <td className="p-2.5 text-center text-slate-500">{item.unit}</td>
                          <td className="p-2.5 text-left font-mono">₪{item.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-left font-bold text-slate-900 font-mono">
                            ₪{item.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold text-xs text-slate-900 border-t border-slate-200">
                        <td colSpan={5} className="p-2.5 text-left">סיכום קטגוריה:</td>
                        <td className="p-2.5 text-left font-mono text-orange-600 font-extrabold">
                          ₪{categoryTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOM Bottom Total Summary */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">
            * המחירים המצוינים בכתב כמויות זה הינם מחירי עלות גלם משוערים ויכולים להשתנות בהתאם לספק ולשינויי שוק.
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-600 block font-medium">סה"כ עלות חומרים ורכיבים:</span>
            <span className="text-2xl font-black text-orange-600 font-mono">
              ₪{totalBOMCost.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Transparent Client Quote & Labor Breakdown */}
        {(() => {
          const quote = calculateClientQuote(project, catalog);
          return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-amber-400 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-400" />
                  <span>סיכום שקוף של סעיפי העבודה והצעת המחיר ללקוח</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-slate-300 flex items-center gap-1.5">
                    <span>רווח תפעולי:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateProject({ ...project, contractorMarginPercent: project.contractorMarginPercent > 0 ? 0 : 25 })}
                      className={`text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                        project.contractorMarginPercent <= 0
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'text-amber-400 hover:bg-amber-500/20'
                      }`}
                      id="bom-margin-toggle-btn"
                    >
                      {project.contractorMarginPercent}%
                    </button>
                  </span>
                  <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-slate-300 flex items-center gap-1.5">
                    <span>מע"מ:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateProject({ ...project, vatEnabled: !(project.vatEnabled ?? true) })}
                      className={`text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition ${
                        (project.vatEnabled ?? true)
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                      id="bom-vat-toggle-btn"
                    >
                      {(project.vatEnabled ?? true) ? `${Math.round(quote.vatRate * 100)}%` : '0%'}
                    </button>
                  </span>
                </div>
              </div>

              {/* Labor Lines */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">סעיפי עבודה והרכבה מחושבים:</span>
                {quote.laborCost === 0 ? (
                  <div className="bg-slate-800/80 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300 font-medium space-y-1">
                    <div className="font-mono text-sm font-bold text-amber-200">
                      עלות חומרים: ₪{(quote.materialsCost || 0).toLocaleString()} | עלות עבודה: 0 ש"ח | סה"כ לפרויקט: ₪{(quote.subtotalBeforeMargin || 0).toLocaleString()}
                    </div>
                    <span className="block text-[11px] text-slate-400 font-normal">
                      (לא הוגדרו תעריפי עבודה במחירון – עלות העבודה חושבה כ-0 ש"ח באופן אוטומטי)
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {quote.laborBreakdown.map((item) => (
                      <div key={item.id} className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
                        <span className="font-bold text-xs text-white">{item.name}</span>
                        <span className="font-mono text-[11px] text-emerald-400 mt-1">{item.formulaText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Final Pricing Summary */}
              {(() => {
                const vatEnabled = project.vatEnabled ?? true;
                const effectiveTotal = vatEnabled ? quote.totalClientPriceWithVat : quote.totalClientPrice;
                return (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-800/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">סה"כ חומרים</span>
                      <span className="text-sm font-black text-white">₪{quote.materialsCost.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">סה"כ עבודה</span>
                      <span className="text-sm font-black text-orange-400">₪{quote.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">רווח תפעולי ({project.contractorMarginPercent}%)</span>
                      <span className="text-sm font-black text-amber-300">₪{quote.contractorMarginAmount.toLocaleString()}</span>
                    </div>
                    <div className={'p-2.5 rounded-xl ' + (vatEnabled ? 'bg-orange-600/30 border border-orange-500/50' : 'bg-slate-700/50 border border-slate-600/50')}>
                      <span className="text-[10px] block font-bold" style={{ color: vatEnabled ? '#fdba74' : '#94a3b8' }}>
                        {vatEnabled ? 'מחיר סופי ללקוח (כולל מע"מ)' : 'מחיר סופי ללקוח (ללא מע"מ)'}
                      </span>
                      <span className="text-base font-black text-white">₪{effectiveTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* Save to System Archive Modal */}
      <SaveDocumentModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        projects={projects}
        defaultName={`רשימת קניות (BOM) - ${project.name}`}
        defaultKind="bom"
        defaultProjectId={project.id}
        onSave={(payload) => {
          onRegisterDocument?.({
            projectId: payload.projectId,
            kind: payload.kind,
            name: payload.name,
            notes: payload.notes,
            meta: {
              totalPrice: totalBOMCost,
              snapshot: buildBOMSnapshot(project, catalog),
            },
          });
        }}
      />
    </div>
  );
};

