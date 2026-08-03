import React, { useState } from 'react';
import { Project, MaterialCatalogItem, CustomItem, CatalogAddOnItem } from '../types';
import { STEP_CATEGORY, CATEGORY_LABELS } from '../utils/calculations';
import { Plus, Trash2, PencilLine, Package, ExternalLink, Info, Search, X } from 'lucide-react';

interface StepAddOnsProps {
  step: number;
  project: Project;
  catalog: MaterialCatalogItem[];
  onUpdateProject: (updatedProject: Project) => void;
  onGoToCatalog?: () => void;
}

const inputClass =
  'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 transition';
const numInputClass =
  'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-extrabold text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 transition';

export const StepAddOns: React.FC<StepAddOnsProps> = ({
  step,
  project,
  catalog,
  onUpdateProject,
  onGoToCatalog,
}) => {
  const materialsCatalog = catalog.filter((i) => i.type !== 'labor' && i.itemType !== 'labor');

  const customItems: CustomItem[] = project.customItems?.[step] ?? [];
  const catalogAddOns: CatalogAddOnItem[] = project.catalogAddOns?.[step] ?? [];

  // Context-based filtering: show only catalog products matching the active step's category
  const stepCategory = STEP_CATEGORY[step];
  const stepCategoryLabel = stepCategory ? CATEGORY_LABELS[stepCategory] : '';
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const stepCatalogItems = stepCategory ? materialsCatalog.filter((i) => i.category === stepCategory) : materialsCatalog;
  const baseCatalogItems = showAllCatalog ? materialsCatalog : stepCatalogItems;
  const query = catalogSearch.trim().toLowerCase();
  const searchCatalogItems = query ? baseCatalogItems.filter((i) => i.name.toLowerCase().includes(query)) : baseCatalogItems;
  const pinnedCatalogItems = materialsCatalog.filter((m) => catalogAddOns.some((ca) => ca.catalogItemId === m.id));
  const visibleCatalogItems = Array.from(
    new Map([...pinnedCatalogItems, ...searchCatalogItems].map((i) => [i.id, i] as [string, MaterialCatalogItem])).values()
  );

  const updateCustomItems = (items: CustomItem[]) => {
    onUpdateProject({
      ...project,
      customItems: { ...(project.customItems || {}), [step]: items },
    });
  };

  const updateCatalogAddOns = (items: CatalogAddOnItem[]) => {
    onUpdateProject({
      ...project,
      catalogAddOns: { ...(project.catalogAddOns || {}), [step]: items },
    });
  };

  const addCustomItem = () => {
    updateCustomItems([
      ...customItems,
      { id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const addCatalogAddOn = () => {
    const first = visibleCatalogItems[0] || materialsCatalog[0];
    if (!first) return;
    updateCatalogAddOns([
      ...catalogAddOns,
      { id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, catalogItemId: first.id, quantity: 1 },
    ]);
  };

  const updateCustomItem = (id: string, patch: Partial<CustomItem>) => {
    updateCustomItems(customItems.map((ci) => (ci.id === id ? { ...ci, ...patch } : ci)));
  };

  const updateCatalogAddOn = (id: string, patch: Partial<CatalogAddOnItem>) => {
    updateCatalogAddOns(catalogAddOns.map((ca) => (ca.id === id ? { ...ca, ...patch } : ca)));
  };

  const removeCustomItem = (id: string) => updateCustomItems(customItems.filter((ci) => ci.id !== id));
  const removeCatalogAddOn = (id: string) => updateCatalogAddOns(catalogAddOns.filter((ca) => ca.id !== id));

  const customTotal = customItems.reduce((sum, ci) => sum + (ci.quantity || 0) * (ci.unitPrice || 0), 0);
  const addOnTotal = catalogAddOns.reduce((sum, ca) => {
    const item = materialsCatalog.find((m) => m.id === ca.catalogItemId);
    return sum + (ca.quantity || 0) * (item?.defaultUnitPrice || 0);
  }, 0);

  const colHeaderClass = 'text-[10px] font-bold text-slate-400';

  return (
    <div className="border-t border-slate-200 pt-5 space-y-5">
      {/* Auto-inclusion notice */}
      <div className="flex items-start gap-2 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          התוספות והמוצרים שנוספו כאן משוקללים אוטומטית במחיר הסופי, נכנסים לרשימת הקניות (BOM)
          ומופיעים בהצעת המחיר ללקוח ובמסמכים השמורים.
        </span>
      </div>

      {/* Section 1: Custom Item (תוספת ידנית) */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <PencilLine className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-extrabold text-slate-900">תוספת ידנית (Custom Item)</h5>
          </div>
          <button
            type="button"
            onClick={addCustomItem}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer active:scale-95"
            id={`add-custom-item-step-${step}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ הוסף תוספת ידנית</span>
          </button>
        </div>

        {customItems.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-medium">
            לא נוספו תוספות ידניות לשלב זה. הוסף תוספת עם תיאור, כמות ומחיר עלות ליחידה.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center text-xs">
              <span className={`col-span-5 ${colHeaderClass}`}>תיאור התוספת</span>
              <span className={`col-span-2 text-center ${colHeaderClass}`}>כמות</span>
              <span className={`col-span-2 text-center ${colHeaderClass}`}>מחיר עלות ליחידה (₪)</span>
              <span className={`col-span-2 text-left ${colHeaderClass}`}>סה"כ</span>
              <span className="col-span-1" />
            </div>
            {customItems.map((ci) => (
              <div key={ci.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-5 min-w-0">
                  <input
                    type="text"
                    value={ci.description}
                    onChange={(e) => updateCustomItem(ci.id, { description: e.target.value })}
                    placeholder="לדוגמה: מדף נוסף, תריס..."
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ci.quantity}
                    onChange={(e) => updateCustomItem(ci.id, { quantity: parseFloat(e.target.value) || 0 })}
                    className={numInputClass}
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ci.unitPrice}
                    onChange={(e) => updateCustomItem(ci.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className={numInputClass}
                  />
                </div>
                <div className="col-span-2 text-left font-mono font-extrabold text-slate-900">
                  ₪{((ci.quantity || 0) * (ci.unitPrice || 0)).toLocaleString()}
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeCustomItem(ci.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="הסר תוספת"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
              <span className="font-bold text-slate-500">סה"כ תוספות ידניות בשלב:</span>
              <span className="font-mono font-extrabold text-blue-700">₪{customTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Catalog Product (מוצר מהמחירון) */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-extrabold text-slate-900">מוצר מהמחירון (Catalog Product)</h5>
          </div>
          <button
            type="button"
            onClick={addCatalogAddOn}
            disabled={materialsCatalog.length === 0}
            className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer active:scale-95 ${
              materialsCatalog.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
            id={`add-catalog-product-step-${step}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ הוסף מוצר מהמחירון</span>
          </button>
        </div>

        {/* Context filter bar - revealed once the first product is added */}
        {catalogAddOns.length > 0 && materialsCatalog.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
              <span className="text-slate-500 font-medium">סינון לפי שלב:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">{stepCategoryLabel || 'הכול'}</span>
              <span className="text-slate-400 font-semibold">({searchCatalogItems.length}/{materialsCatalog.length})</span>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllCatalog}
                onChange={(e) => setShowAllCatalog(e.target.checked)}
                className="accent-orange-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>הצג את כל מוצרי המחירון</span>
            </label>
          </div>
        )}

        {/* Search box - revealed once the first product is added */}
        {catalogAddOns.length > 0 && materialsCatalog.length > 0 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="חיפוש מוצר לפי שם..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 transition"
            />
            {catalogSearch && (
              <button
                type="button"
                onClick={() => setCatalogSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="נקה חיפוש"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {materialsCatalog.length === 0 ? (
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <span className="font-medium">לא הוגדרו חומרים במחירון - יש להוסיף חומרים במחירון</span>
            {onGoToCatalog && (
              <button
                type="button"
                onClick={onGoToCatalog}
                className="text-orange-700 hover:text-orange-800 font-extrabold underline flex items-center gap-1 cursor-pointer shrink-0 mr-2"
              >
                <span>עבור למחירון להוספה</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : catalogAddOns.length === 0 ? null : visibleCatalogItems.length === 0 ? (
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap text-[11px] text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <span className="font-medium">
              אין מוצרים בקטגוריית "{stepCategoryLabel}"{query ? ' התואמים לחיפוש' : ''} במחירון.
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAllCatalog(true);
                setCatalogSearch('');
              }}
              className="text-orange-700 hover:text-orange-800 font-extrabold underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>הצג את כל מוצרי המחירון</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center text-xs">
              <span className={`col-span-5 ${colHeaderClass}`}>מוצר מהמחירון</span>
              <span className={`col-span-2 text-center ${colHeaderClass}`}>כמות</span>
              <span className={`col-span-2 text-center ${colHeaderClass}`}>מחיר יחידה (₪)</span>
              <span className={`col-span-2 text-left ${colHeaderClass}`}>סה"כ</span>
              <span className="col-span-1" />
            </div>
            {catalogAddOns.map((ca) => {
              const catItem = materialsCatalog.find((m) => m.id === ca.catalogItemId);
              const unitPrice = catItem?.defaultUnitPrice ?? 0;
              return (
                <div key={ca.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5 min-w-0">
                    <select
                      value={ca.catalogItemId}
                      onChange={(e) => updateCatalogAddOn(ca.id, { catalogItemId: e.target.value })}
                      className={inputClass}
                    >
                      {visibleCatalogItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={ca.quantity}
                      onChange={(e) => updateCatalogAddOn(ca.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className={numInputClass}
                    />
                  </div>
                  <div className="col-span-2 text-center font-mono font-bold text-slate-700">
                    ₪{unitPrice.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-left font-mono font-extrabold text-slate-900">
                    ₪{((ca.quantity || 0) * unitPrice).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeCatalogAddOn(ca.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="הסר מוצר"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
              <span className="font-bold text-slate-500">סה"כ מוצרים מהמחירון בשלב:</span>
              <span className="font-mono font-extrabold text-orange-700">₪{addOnTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
