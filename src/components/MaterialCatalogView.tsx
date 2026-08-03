import React, { useState } from 'react';
import { MaterialCatalogItem, MaterialCategory, SUB_CATEGORY_LABELS, MaterialSubCategory } from '../types';
import { Tags, Search, RefreshCw, Plus, Edit3, Check, Trash2, PackageX, X, Info } from 'lucide-react';

interface MaterialCatalogViewProps {
  catalog: MaterialCatalogItem[];
  onUpdateCatalog: (newCatalog: MaterialCatalogItem[]) => void;
  onGoToReceipts?: () => void;
}

export const MaterialCatalogView: React.FC<MaterialCatalogViewProps> = ({
  catalog,
  onUpdateCatalog,
  onGoToReceipts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<MaterialCatalogItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<MaterialCategory>('construction');
  const [editSubCategory, setEditSubCategory] = useState<string>('construction_profile');
  const [editUnit, setEditUnit] = useState<string>('מ"ר');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editWaste, setEditWaste] = useState<number>(10);
  const [editNotes, setEditNotes] = useState<string>('');

  // Password / Reset Modal State
  const [showClearModal, setShowClearModal] = useState(false);

  // New Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<MaterialCategory>('construction');
  const [newItemSubCategory, setNewItemSubCategory] = useState<string>('construction_profile');
  const [newItemUnit, setNewItemUnit] = useState<string>('מ"ר');
  const [newItemPrice, setNewItemPrice] = useState<number>(100);
  const [newItemWaste, setNewItemWaste] = useState<number>(10);
  const [newItemNotes, setNewItemNotes] = useState<string>('');

  const CATEGORY_NAMES: Record<MaterialCategory, string> = {
    construction: 'קונסטרוקציה תחתונה',
    floor: 'תשתית וחיפוי רצפה',
    panels: 'פאנלים ומעטפת',
    wall_cladding: 'חיפוי הקירות',
    wheels: 'גלגלים וג\'קים',
    openings: 'פתחים',
    electrical: 'חשמל',
    hvac: 'מיזוג',
    hardware: 'חומרי עזר ואיטום',
  };

  // Sub-category filtering by main category
  const SUBCATEGORY_BY_CATEGORY: Record<string, string[]> = {
    construction: ['profiles', 'construction_hardware', 'welding_coils'],
    floor: ['floor_base', 'floor_top', 'floor_insulation'],
    panels: ['wall_panel', 'panel_track', 'sealing_profiles_gutters'],
    wheels: ['wheels_base', 'levelling_jacks'],
    openings: ['doors', 'windows'],
    electrical: ['electrical_external', 'electrical_internal'],
    hvac: ['ac_unit', 'ventilation'],
    hardware: ['sealant_silicone', 'screws_drills'],
    wall_cladding: ['interior_cladding', 'exterior_cladding'],
  };

  const getFilteredSubCategories = (category: string): [string, string][] => {
    const allowed = SUBCATEGORY_BY_CATEGORY[category] ?? [];
    return Object.entries(SUB_CATEGORY_LABELS).filter(([k]) => allowed.includes(k));
  };

  const COMMON_UNITS = [
    'מ"ר',
    'מטר רץ',
    'יחידה',
    'סט',
    'ק"ג',
    'קופסה',
  ];

  // Start Editing Item
  const handleStartEdit = (item: MaterialCatalogItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditSubCategory(item.subCategory || 'construction_profile');
    setEditUnit(item.unit || 'מ"ר');
    setEditPrice(item.defaultUnitPrice);
    setEditWaste(item.wasteFactorPercent ?? 10);
    setEditNotes(item.notes || '');
  };

  // Save Item Edit
  const handleSaveEdit = () => {
    if (!editingItem || !editName.trim()) return;

    const updated = catalog.map((item) =>
      item.id === editingItem.id
        ? {
            ...item,
            type: 'material',
            itemType: 'material',
            name: editName.trim(),
            category: editCategory,
            subCategory: editSubCategory,
            unit: editUnit,
            defaultUnitPrice: Number(editPrice) || 0,
            wasteFactorPercent: Number(editWaste) || 0,
            notes: editNotes.trim(),
            lastUpdated: new Date().toISOString(),
          }
        : item
    );

    onUpdateCatalog(updated);
    setEditingItem(null);
  };

  // Delete Item
  const handleDeleteItem = (item: MaterialCatalogItem) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק לצמיתות את המוצר "${item.name}" מהמחירון?`)) {
      const updated = catalog.filter((c) => c.id !== item.id);
      onUpdateCatalog(updated);
    }
  };

  // Clear Catalog Entirely (Only removes material items, preserves labor pricing rules)
  const handleClearCatalog = () => {
    const laborItemsOnly = catalog.filter((item) => item.type === 'labor' || item.itemType === 'labor');
    onUpdateCatalog(laborItemsOnly);
    setShowClearModal(false);
  };

  // Add New Item
  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: MaterialCatalogItem = {
      id: `mat_custom_${Date.now()}`,
      type: 'material',
      itemType: 'material',
      name: newItemName.trim(),
      category: newItemCategory,
      subCategory: newItemSubCategory,
      unit: newItemUnit as any,
      defaultUnitPrice: Number(newItemPrice) || 0,
      wasteFactorPercent: Number(newItemWaste) || 0,
      notes: newItemNotes.trim(),
      lastUpdated: new Date().toISOString(),
    };

    onUpdateCatalog([newItem, ...catalog]);
    setShowAddModal(false);
    setNewItemName('');
    setNewItemNotes('');
    setNewItemPrice(100);
    setNewItemWaste(10);
  };

  // Filter ONLY material items (exclude any labor items)
  const materialsOnlyCatalog = catalog.filter((item) => {
    const isLabor = item.type === 'labor' || item.itemType === 'labor';
    return !isLabor;
  });

  const filteredCatalog = materialsOnlyCatalog.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategoryFilter === 'all' || item.category === activeCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Tags className="w-6 h-6 text-orange-600" />
            <span>מחירון חומרים ורכיבי בנייה</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ניהול מלא ועריכה חופשית של כל פרטי החומרים: שם, מחיר, קטגוריה, יחידת חישוב, אחוז בלאי והערות
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowClearModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer border border-slate-200"
            id="clear-catalog-btn"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>מחק/רוקן מחירון ({materialsOnlyCatalog.length})</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
            id="add-catalog-item-btn"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף מוצר חדש</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש פריט לפי שם או הערה..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
            id="catalog-search-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition whitespace-nowrap ${
              activeCategoryFilter === 'all'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            הכל ({materialsOnlyCatalog.length})
          </button>

          {Object.entries(CATEGORY_NAMES).map(([key, name]) => {
            const count = materialsOnlyCatalog.filter(c => c.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategoryFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition whitespace-nowrap ${
                  activeCategoryFilter === key
                    ? 'bg-orange-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Items Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredCatalog.length === 0 ? (
          <div className="p-12 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 m-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-xs">
              <PackageX className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                המחירון ריק. לחץ על '+ הוסף מוצר חדש' כדי להתחיל להזין חומרים
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                אף מוצר לא הוגדר במחירון. באפשרותך להוסיף מוצרים, קטגוריות, מחירי יחידה, יחידות מידה ואחוזי בלאי/פחת באופן חופשי.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
                id="empty-state-add-item-btn"
              >
                <Plus className="w-4 h-4" />
                <span>+ הוסף מוצר חדש</span>
              </button>

              {onGoToReceipts && (
                <button
                  onClick={onGoToReceipts}
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                  id="empty-state-scan-receipt-btn"
                >
                  <Search className="w-4 h-4 text-orange-600" />
                  <span>סרוק חשבונית</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">שם המוצר / רכיב</th>
                  <th className="p-3.5">קטגוריה ושיוך ב-Wizard</th>
                  <th className="p-3.5 text-center">יחידת חישוב (לפי מה)</th>
                  <th className="p-3.5 text-center">בלאי/פחת (%)</th>
                  <th className="p-3.5 text-left">מחיר יחידה (₪)</th>
                  <th className="p-3.5">הערות/מפרט</th>
                  <th className="p-3.5 text-center">עריכה / מחיקה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCatalog.map((item) => {
                  const subCatLabel = item.subCategory ? (SUB_CATEGORY_LABELS[item.subCategory as keyof typeof SUB_CATEGORY_LABELS] || item.subCategory) : null;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-900 text-sm">{item.name}</td>
                      <td className="p-3.5 space-y-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-200">
                            {CATEGORY_NAMES[item.category] || item.category}
                          </span>
                          {subCatLabel && (
                            <span className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-orange-200">
                              {subCatLabel}
                            </span>
                          )}
                          {item.subCategory === 'electrical_external' && (
                            <span className="bg-green-50 text-green-700 border-green-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold border">
                              חיצונית
                            </span>
                          )}
                          {item.subCategory === 'electrical_internal' && (
                            <span className="bg-purple-50 text-purple-700 border-purple-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold border">
                              פנימית
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700 bg-slate-50/50 rounded-lg">
                        {item.unit}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-700">
                        {item.wasteFactorPercent ?? 0}%
                      </td>
                      <td className="p-3.5 text-left font-mono">
                        <span className="font-extrabold text-orange-600 text-sm">
                          ₪{item.defaultUnitPrice.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.notes || '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
                            title="ערוך את כל פרטי המוצר"
                            id={`edit-item-btn-${item.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ערוך הכל</span>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="מחק מוצר מהמחירון"
                            id={`delete-item-btn-${item.id}`}
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

      {/* Edit Item Modal (עריכה כוללת של כל הפרטים) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-600" />
                <span>עריכה מלאה של המוצר: {editingItem.name}</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">שם המוצר / רכיב</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="הזן שם מוצר..."
                  id="edit-modal-name-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">קטגוריה</label>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      const cat = e.target.value as MaterialCategory;
                      setEditCategory(cat);
                      const filtered = getFilteredSubCategories(cat);
                      if (filtered.length > 0) setEditSubCategory(filtered[0][0]);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="edit-modal-cat-select"
                  >
                    {Object.entries(CATEGORY_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* SubCategory for Wizard drop-downs */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">שיוך לרשימה ב-Wizard</label>
                  <select
                    value={editSubCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSubCategory(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="edit-modal-subcat-select"
                  >
                    {getFilteredSubCategories(editCategory).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                {/* Unit / According to what price is written */}
                <label className="block text-slate-700 font-bold mb-1">
                  יחידת חישוב (לפי מה הסכום נכתב)
                </label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="לדוגמה: מ&quot;ר, מטר רץ, יחידה"
                  id="edit-modal-unit-input"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEditUnit(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        editUnit === u
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Price */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">מחיר יחידה (בש"ח)</label>
                  <input
                    type="number"
                    step="1"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-orange-600 font-extrabold text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="edit-modal-price-input"
                  />
                </div>

                {/* Waste */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">אחוז בלאי / פחת (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editWaste}
                    onChange={(e) => setEditWaste(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="edit-modal-waste-input"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">הערות / מפרט מוצר</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="הוסף מפרט או הערות למוצר..."
                  id="edit-modal-notes-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                id="save-modal-changes-btn"
              >
                <Check className="w-4 h-4" />
                <span>שמור שינויים</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Catalog Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <Trash2 className="w-5 h-5" />
              <span>מחיקת/ריקון המחירון</span>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              האם אתה בטוח שברצונך למחוק את כל המוצרים במחירון? המחירון יהיה ריק ותוכל להוסיף מוצרים חדשים לפי רצונך בלבד.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleClearCatalog}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-xs"
                id="confirm-clear-catalog-btn"
              >
                אשר מחיקת המחירון
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal (הוספת מוצר חדש כולל כל הפרטים) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-600" />
                <span>הוספת מוצר חדש למחירון החומרים</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">שם המוצר / רכיב *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="לדוגמה: לוח אקווסיל מיוחד"
                  autoFocus
                  id="new-item-name-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">קטגוריה</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => {
                      const cat = e.target.value as MaterialCategory;
                      setNewItemCategory(cat);
                      const filtered = getFilteredSubCategories(cat);
                      if (filtered.length > 0) {
                        setNewItemSubCategory(filtered[0][0]);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="new-item-cat-select"
                  >
                    {Object.entries(CATEGORY_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">שיוך לרשימה ב-Wizard</label>
                  <select
                    value={newItemSubCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewItemSubCategory(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="new-item-subcat-select"
                  >
                    {getFilteredSubCategories(newItemCategory).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  יחידת חישוב (לפי מה הסכום מחושב)
                </label>
                <input
                  type="text"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="מ&quot;ר / מטר רץ / יחידה"
                  id="new-item-unit-input"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setNewItemUnit(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        newItemUnit === u
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">מחיר יחידה (בש"ח)</label>
                  <input
                    type="number"
                    step="1"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-orange-600 font-extrabold text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="new-item-price-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">אחוז בלאי / פחת (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newItemWaste}
                    onChange={(e) => setNewItemWaste(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                    id="new-item-waste-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">הערות / מפרט מוצר</label>
                <textarea
                  rows={2}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  placeholder="הוסף מפרט או הערות למוצר..."
                  id="new-item-notes-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleAddItem}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                id="submit-add-item-btn"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף מוצר</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
