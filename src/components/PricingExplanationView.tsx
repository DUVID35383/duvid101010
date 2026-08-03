import React, { useState, useEffect } from 'react';
import { MaterialCatalogItem, MaterialCategory, Project, GlobalPricingSettings, CategoryPricingMethod, CategoryPricingConfig, OpeningPricingSubItem, ElectricalPricingSubItem } from '../types';
import { calculateClientQuote } from '../utils/calculations';
import { 
  Sliders, 
  CheckCircle2, 
  RotateCcw, 
  Save, 
  Lock, 
  Percent, 
  TrendingUp, 
  Sparkles
} from 'lucide-react';

interface CategoryListItem {
  key: MaterialCategory;
  label: string;
  subLabel?: string;
  description: string;
  defaultMethod: CategoryPricingMethod;
  defaultQuantity?: number;
  defaultUnitPrice?: number;
}

const CATEGORY_LIST: CategoryListItem[] = [
  { key: 'construction', label: 'קונסטרוקציה תחתונה', subLabel: '', description: 'פרופילי שלד תחתון', defaultMethod: 'square_meter', defaultQuantity: 15, defaultUnitPrice: 250 },
  { key: 'floor', label: 'תשתית לריצפה', subLabel: 'כולל פרקט', description: 'תשתית וחיפוי רצפה', defaultMethod: 'square_meter', defaultUnitPrice: 180 },
  { key: 'panels', label: 'בניית מעטפת', subLabel: 'קירות', description: 'לוחות קיר וגג', defaultMethod: 'square_meter', defaultUnitPrice: 200 },
  { key: 'wall_cladding', label: 'חיפוי הקירות', description: 'חיפוי פנימי וחיצוני', defaultMethod: 'square_meter', defaultUnitPrice: 120 },
  { key: 'wheels', label: 'גלגלים וג\'קים', subLabel: '', description: 'גלגלים וג\'קים לפילוס', defaultMethod: 'square_meter', defaultUnitPrice: 200 },
  { key: 'hardware', label: 'חיפוי פולימר', subLabel: 'חיצוני', description: 'איטום, ברזים ואבזרים', defaultMethod: 'square_meter', defaultUnitPrice: 45 },
  { key: 'openings', label: 'פתחים', description: 'חלונות ודלתות', defaultMethod: 'work_hours', defaultQuantity: 16, defaultUnitPrice: 150 },
  { key: 'electrical', label: 'חשמל', description: 'מערכת חשמל', defaultMethod: 'work_hours', defaultQuantity: 16, defaultUnitPrice: 150 },
  { key: 'hvac', label: 'מיזוג', description: 'מיזוג ואוורור', defaultMethod: 'work_hours', defaultQuantity: 8, defaultUnitPrice: 200 },
];

interface PricingExplanationViewProps {
  catalog: MaterialCatalogItem[];
  globalSettings?: GlobalPricingSettings;
  onUpdateGlobalSettings?: (newSettings: GlobalPricingSettings) => void;
  sampleProject?: Project | null;
}

export const PricingExplanationView: React.FC<PricingExplanationViewProps> = ({
  catalog,
  globalSettings = { contractorMarginPercent: 20, vatRatePercent: 18 },
  onUpdateGlobalSettings,
  sampleProject,
}) => {
  // Local editable copy of global settings
  const [localSettings, setLocalSettings] = useState<GlobalPricingSettings>(globalSettings);

  useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);

  // Password Protection Modal for Reset
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Category Names
  const CATEGORY_NAMES: Record<MaterialCategory, string> = {
    construction: 'קונסטרוקציה תחתונה',
    floor: 'תשתית וחיפוי רצפה',
    panels: 'מעטפת, פאנלים וקירות',
    wall_cladding: 'חיפוי הקירות',
    wheels: 'גלגלים וג\'קים',
    openings: 'פתחים',
    electrical: 'חשמל',
    hvac: 'מיזוג',
    hardware: 'פרזול, ברגים ואיטום',
  };

  // Handle Global Settings Change
  const handleGlobalSettingChange = (field: keyof GlobalPricingSettings, value: number) => {
    const updated = {
      ...localSettings,
      [field]: Math.max(0, value),
    };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) {
      onUpdateGlobalSettings(updated);
    }
  };

  // Handle Category Pricing Method Change
  const handleCategoryMethodChange = (category: MaterialCategory, method: CategoryPricingMethod) => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing[category] ?? {};
    currentCategoryPricing[category] = { ...current, method, manualOverride: false } as CategoryPricingConfig;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Handle Category Pricing Field Change (quantity or unitPrice)
  const handleCategoryFieldChange = (category: MaterialCategory, field: 'quantity' | 'unitPrice', value: number) => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing[category] ?? {};
    const updatedEntry: CategoryPricingConfig = {
      ...current,
      [field]: Math.max(0, value),
    } as CategoryPricingConfig;
    if (field === 'quantity') updatedEntry.manualOverride = true;
    currentCategoryPricing[category] = updatedEntry;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Reset manual quantity override via Escape key
  const handleQuantityEscapeReset = (category: MaterialCategory) => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing[category] ?? {};
    currentCategoryPricing[category] = { ...current, manualOverride: false } as CategoryPricingConfig;
    delete currentCategoryPricing[category]?.quantity;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Extract opening sub-items from project data
  const getOpeningSubItems = (): OpeningPricingSubItem[] => {
    const items = sampleProject?.openings;
    if (!items || !Array.isArray(items) || items.length === 0) return [
      { type: 'doors', label: 'דלתות', qty: 0, hours: 4, globalPrice: 350 },
      { type: 'series7000', label: 'חלונות סדרה 7000', qty: 0, hours: 2, globalPrice: 250 },
      { type: 'fold', label: 'חלונות קיפ/דריי-קיפ', qty: 0, hours: 3, globalPrice: 300 },
    ];
    let doors = 0, series7000 = 0, fold = 0;
    items.forEach(op => {
      if (!op) return;
      const q = op.quantity || 1;
      if (op.type === 'main_door' || op.type === 'interior_door') doors += q;
      else if (op.type === 'window') {
        const t = (op.title || '').toLowerCase();
        if (t.includes('קיפ') || t.includes('דריי') || t.includes('tilt') || t.includes('fold')) fold += q;
        else series7000 += q;
      }
    });
    return [
      { type: 'doors', label: 'דלתות', qty: doors, hours: 4, globalPrice: 350 },
      { type: 'series7000', label: 'חלונות סדרה 7000', qty: series7000, hours: 2, globalPrice: 250 },
      { type: 'fold', label: 'חלונות קיפ/דריי-קיפ', qty: fold, hours: 3, globalPrice: 300 },
    ];
  };

  // Extract electrical sub-items from project data
  const getElectricalSubItems = (): ElectricalPricingSubItem[] => {
    const el = sampleProject?.electrical;
    const toggles = sampleProject?.sectionToggles;
    const hvac = sampleProject?.hvac;
    const items: ElectricalPricingSubItem[] = [];

    // Main panel
    if (el?.mainPanelType && el.mainPanelType !== 'none') {
      items.push({ key: 'panel', label: 'ארון חשמל + חציבה', qty: 1, hours: 8, unitPrice: 800 });
    }

    // Power outlets (regular + power)
    if (((el?.powerOutletsCount ?? 0) + (el?.heavyPowerOutletsCount ?? 0)) > 0) {
      items.push({ key: 'outlets', label: 'נקודות כוח / שקעים', qty: (el!.powerOutletsCount ?? 0) + (el!.heavyPowerOutletsCount ?? 0), hours: 0.5, unitPrice: 60 });
    }

    // Lighting points + switches
    if (((el?.lightingPointsCount ?? 0) + (el?.switchesCount ?? 0)) > 0) {
      items.push({ key: 'lighting', label: 'תאורה ומתגים', qty: (el!.lightingPointsCount ?? 0) + (el!.switchesCount ?? 0), hours: 0.5, unitPrice: 50 });
    }

    // AC unit
    const ac = hvac?.airConditioner || el?.airConditioner;
    if (ac && ac !== 'none') {
      items.push({ key: 'ac', label: 'מזגן', qty: 1, hours: 6, unitPrice: 600 });
    }

    // Venta
    if (hvac?.venta?.enabled) {
      items.push({ key: 'venta', label: 'ונטה / אוורור', qty: hvac.venta.quantity || 1, hours: 2, unitPrice: 250 });
    }

    return items;
  };

  // Handle opening sub-item field change
  const handleOpeningSubItemChange = (subType: 'doors' | 'series7000' | 'fold', field: 'hours' | 'globalPrice', value: number) => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing.openings ?? {};
    const subItems = [...(current.subItems ?? getOpeningSubItems())];
    const idx = subItems.findIndex(s => s.type === subType);
    if (idx >= 0) {
      subItems[idx] = { ...subItems[idx], [field]: Math.max(0, value) };
    }
    currentCategoryPricing.openings = { ...current, subItems, manualTotal: undefined } as CategoryPricingConfig;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Reset openings manual total via Escape key
  const handleOpeningEscapeReset = () => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing.openings ?? {};
    currentCategoryPricing.openings = { ...current, manualTotal: undefined } as CategoryPricingConfig;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Handle electrical sub-item field change
  const handleElectricalSubItemChange = (key: string, field: 'hours' | 'unitPrice', value: number) => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing.electrical ?? {};
    const subItems = [...(current.electricalSubItems ?? getElectricalSubItems())];
    const idx = subItems.findIndex(s => s.key === key);
    if (idx >= 0) {
      subItems[idx] = { ...subItems[idx], [field]: Math.max(0, value) };
    }
    currentCategoryPricing.electrical = { ...current, electricalSubItems: subItems, manualTotal: undefined } as CategoryPricingConfig;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Reset electrical manual total via Escape key
  const handleElectricalEscapeReset = () => {
    const currentCategoryPricing = { ...(localSettings.categoryPricing ?? {}) };
    const current = currentCategoryPricing.electrical ?? {};
    currentCategoryPricing.electrical = { ...current, manualTotal: undefined } as CategoryPricingConfig;
    const updated = { ...localSettings, categoryPricing: currentCategoryPricing };
    setLocalSettings(updated);
    if (onUpdateGlobalSettings) onUpdateGlobalSettings(updated);
  };

  // Batch Save Changes
  const handleSaveChanges = () => {
    if (onUpdateGlobalSettings) {
      onUpdateGlobalSettings(localSettings);
    }
    showToast('כל פרמטרי התמחור וההגדרות הגלובליות נשמרו ועודכנו בזמן אמת!');
  };

  // Password-protected Reset (Only resets labor items, preserves material items)
  const handleConfirmResetDefaults = () => {
    if (passwordInput === '1234' || passwordInput === 'admin') {
      const resetSettings: GlobalPricingSettings = {
        contractorMarginPercent: 20,
        vatRatePercent: 18,
        defaultConstructionWorkHours: 40,
        defaultConstructionHourlyRate: 120,
        categoryPricing: {
          construction: { method: 'square_meter', quantity: 15, unitPrice: 250 },
          wheels: { method: 'square_meter', quantity: 15, unitPrice: 100 },
          floor: { method: 'square_meter', unitPrice: 180 },
          panels: { method: 'square_meter', unitPrice: 200 },
          openings: { method: 'work_hours', unitPrice: 150 },
          electrical: { method: 'work_hours', quantity: 16, unitPrice: 150 },
          hardware: { method: 'square_meter', unitPrice: 45 },
          wall_cladding: { method: 'square_meter', unitPrice: 120 },
        } as Partial<Record<MaterialCategory, CategoryPricingConfig>>,
      };
      setLocalSettings(resetSettings);
      if (onUpdateGlobalSettings) onUpdateGlobalSettings(resetSettings);

      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
      showToast('הגדרות התמחור אופסו בהצלחה');
    } else {
      setPasswordError(true);
    }
  };

  // Calculate live preview quote on sample project or dummy project
  const dummyProject: Project = sampleProject || {
    id: 'sample_preview',
    name: 'חדר נייד לדוגמה',
    clientName: 'לקוח לדוגמה',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    contractorMarginPercent: localSettings.contractorMarginPercent,
    notes: '',
    dimensions: { length: 6.0, width: 2.5, height: 2.5 },
    construction: { profileSpacingCm: 60, materialType: 'steel', profileSpec: '80x40x2', unitWeightKgPerMeter: 3.8 },
    wheels: { wheelType: 'swivel_brake', quantity: 6, loadCapacityPerWheelKg: 500, unitPrice: 350 },
    floor: { basePlateType: 'cement_board_18', topCovering: 'spc_vinyl', insulationType: 'eps_foam' },
    wallRoof: { panelType: 'eps_panel', panelThicknessMm: 50, panelTrackType: 'panel_aluminum_tracks', claddingExterior: 'none', polymerCladding: { type: 'none', heightMode: 'full', customHeightCm: 120 } },
    openings: [],
    electrical: { powerOutletsCount: 4, heavyPowerOutletsCount: 0, switchesCount: 2, lightingPointsCount: 2, mainPanelType: 'single_phase_32a', airConditioner: 'ac_15hp', installationType: 'hidden_in_panel', panelLocation: 'corner', feedDistanceMeters: 3, powerOutletAvgDistanceMeters: 4 },
  };

  const sampleQuote = calculateClientQuote(dummyProject, catalog, localSettings);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Password Protection Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
              <Lock className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">איפוס מנגנון התמחור</h3>
              <p className="text-xs text-slate-500">
                פעולה זו תאפס ותנקה לחלוטין את הפרמטרים והמחירון (0 מוצרים). הזן סיסמת מנהל (1234):
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="הזן סיסמה..."
                className={`w-full bg-slate-50 border ${
                  passwordError ? 'border-rose-500' : 'border-slate-200'
                } rounded-xl px-4 py-2.5 text-center font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition`}
                autoFocus
              />
              {passwordError && (
                <p className="text-[11px] text-rose-600 font-bold text-center">
                  סיסמה שגויה. הקלד 1234 או admin
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmResetDefaults}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-sm transition"
              >
                אשר איפוס
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-orange-600" />
            <span>לוח בקרת תמחור ופרמטרים פעיל (Active Pricing Control Panel)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ערוך פרמטרים, תעריפי עבודה, יחידות מידה, אחוזי פחת, רווח קבלני ומע"מ לקבלת חישובים מדויקים בזמן אמת ב-Wizard ובכל הצעות המחיר.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer border border-slate-200"
            id="reset-pricing-defaults-btn"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
            <span>איפוס הגדרות</span>
          </button>

          <button
            onClick={handleSaveChanges}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20 active:scale-95"
            id="save-pricing-changes-btn"
          >
            <Save className="w-4 h-4" />
            <span>שמור שינויים בלוח</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: GLOBAL CONTROLS (% Profit, % VAT, Base Labor)   */}
      {/* ========================================================= */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              הגדרות רווח, מע"מ ועבודה גלובליות (Global Controls)
            </h3>
          </div>
          <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            סנכרון בזמן אמת
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input 1: Contractor / Operational Profit Margin % */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span>% רווח קבלני / תפעולי</span>
              </label>
              <span className="text-xs font-black text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md">
                {localSettings.contractorMarginPercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              מרווח רווח תפעולי המתווסף מעל עלויות החומרים והעבודה
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={localSettings.contractorMarginPercent}
                onChange={(e) => handleGlobalSettingChange('contractorMarginPercent', parseFloat(e.target.value) || 0)}
                className="w-24 bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-3 py-1.5 text-center font-extrabold text-slate-900 text-sm focus:outline-none shadow-2xs"
                id="global-profit-margin-input"
              />
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={localSettings.contractorMarginPercent}
                onChange={(e) => handleGlobalSettingChange('contractorMarginPercent', parseFloat(e.target.value) || 0)}
                className="flex-1 accent-orange-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Input 2: VAT Rate % */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-600" />
                <span>% מע"מ (VAT)</span>
              </label>
              <span className="text-xs font-black text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">
                {localSettings.vatRatePercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              שיעור מס ערך מוסף (ברירת מחדל 18%, ניתן לשינוי)
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min="0"
                max="30"
                step="1"
                value={localSettings.vatRatePercent}
                onChange={(e) => handleGlobalSettingChange('vatRatePercent', parseFloat(e.target.value) || 0)}
                className="w-24 bg-white border border-slate-300 focus:border-orange-500 rounded-lg px-3 py-1.5 text-center font-extrabold text-slate-900 text-sm focus:outline-none shadow-2xs"
                id="global-vat-rate-input"
              />
              <span className="text-xs font-bold text-slate-500">
                שיעור המע"מ הנוכחי בחוק
              </span>
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <h4 className="font-extrabold text-sm text-amber-300">
                סימולציית מחיר סופי ללקוח (חישוב בזמן אמת למבנה לדוגמה 6.0×2.5 מ')
              </h4>
            </div>
            <p className="text-xs text-slate-300 dir-rtl">
              עלות חומרים: ₪{(sampleQuote.materialsCost || 0).toLocaleString()} | עלות עבודה: ₪{(sampleQuote.laborCost || 0).toLocaleString()} | סה"כ לפרויקט: ₪{(sampleQuote.subtotalBeforeMargin || 0).toLocaleString()}
            </p>
            {sampleQuote.laborCost === 0 ? (
              <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300 font-medium space-y-0.5">
                <div className="font-mono font-bold text-amber-200">
                  עלות חומרים: ₪{(sampleQuote.materialsCost || 0).toLocaleString()} | עלות עבודה: 0 ש"ח | סה"כ לפרויקט: ₪{(sampleQuote.subtotalBeforeMargin || 0).toLocaleString()}
                </div>
                <span className="block text-[10px] text-slate-400">
                  (עמוד התמחור ריק מסעיפי עבודה – עלות העבודה מחושבת כ-0 ש"ח)
                </span>
              </div>
            ) : (
              sampleQuote.laborBreakdown && sampleQuote.laborBreakdown.length > 0 && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 space-y-1">
                  <span className="text-[11px] font-bold text-orange-400 block">פירוט עבודות שקוף בסימולציה:</span>
                  {sampleQuote.laborBreakdown.map((item) => (
                    <div key={item.id} className="text-[11px] text-slate-200 flex items-center justify-between gap-2">
                      <span>• {item.name}:</span>
                      <span className="font-mono text-emerald-300">{item.formulaText}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="bg-orange-600/20 border border-orange-500/40 px-5 py-2.5 rounded-xl text-center shrink-0 self-center">
            <span className="text-[10px] text-orange-300 font-bold block uppercase tracking-wider">מחיר סופי ללקוח (כולל מע"מ)</span>
            <span className="text-2xl font-black text-white">
              ₪{sampleQuote.totalClientPriceWithVat.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 1b: CATEGORY PRICING METHODS                      */}
      {/* ========================================================= */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              הגדרות תמחור לקטגוריות
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            קובע כיצד מחושבת כל קטגוריה בכתב הכמויות
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORY_LIST.map((cat) => {
            const config = (localSettings.categoryPricing ?? {})[cat.key] ?? {
              method: cat.defaultMethod as CategoryPricingMethod,
              quantity: cat.defaultQuantity,
              unitPrice: cat.defaultUnitPrice,
            };
            const isSquareMeter = config.method === 'square_meter';
            const isWorkHours = config.method === 'work_hours';
            const autoArea = sampleProject
              ? Math.ceil((() => {
                  const d = sampleProject.dimensions;
                  if (cat.key === 'panels') return (d.length + d.width) * 2 * d.height;
                  if (cat.key === 'wheels') {
                    const overhangM = (sampleProject.wallRoof?.roofOverhangCm ?? 40) / 100;
                    return (d.length + overhangM * 2) * (d.width + overhangM * 2);
                  }
                  if (cat.key === 'hardware') {
                    return (d.length + d.width) * 2 * d.height;
                  }
                  return d.length * d.width;
                })() * 10) / 10
              : 15;
            const isManual = config.manualOverride === true;
            const quantityLabel = isSquareMeter ? (isManual ? 'מ"ר (ידני)' : 'מ"ר (מחושב אוטומטית)') : 'שעות עבודה';
            const unitLabel = isSquareMeter ? '₪/מ"ר' : '₪/שעה';
            const displayQuantity = isSquareMeter && !isManual ? autoArea : (config.quantity ?? cat.defaultQuantity ?? 0);

            return cat.key === 'openings' ? (
              <div key="openings" className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                {/* Header: title + method + hourly rate */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-slate-900">{cat.label}</span>
                    {cat.subLabel && <span className="text-xs text-slate-500 font-semibold">{cat.subLabel}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">שיטת תמחור:</span>
                    <select
                      value={config.method}
                      onChange={(e) => handleCategoryMethodChange(cat.key, e.target.value as CategoryPricingMethod)}
                      className="bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1 text-sm font-bold text-slate-900 focus:outline-none shadow-2xs"
                    >
                      <option value="work_hours">שעות עבודה</option>
                      <option value="global_install">התקנה גלובלית</option>
                    </select>
                    {config.method !== 'global_install' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">תעריף שעתי:</span>
                        <div className="relative w-20">
                          <span className="absolute right-1 top-1 text-slate-400 font-bold text-[9px]">₪</span>
                          <input type="number" min="0" step="5" value={config.unitPrice ?? cat.defaultUnitPrice ?? 150}
                            onChange={e => handleCategoryFieldChange('openings', 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg pr-4 pl-1.5 py-1 font-bold text-slate-900 text-center text-xs focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3-column grid for opening types */}
                {(() => {
                  const defaultSubItems = getOpeningSubItems();
                  const subItems = config.subItems ?? defaultSubItems;
                  const isGlobal = config.method === 'global_install';
                  const hourlyRate = config.unitPrice ?? cat.defaultUnitPrice ?? 150;
                  let autoTotal = 0;
                  const rows = subItems.map(item => {
                    const ih = item.hours ?? defaultSubItems.find(s => s.type === item.type)?.hours ?? 2;
                    const ig = item.globalPrice ?? defaultSubItems.find(s => s.type === item.type)?.globalPrice ?? 250;
                    const sub = isGlobal ? item.qty * ig : item.qty * ih * hourlyRate;
                    autoTotal += sub;
                    return { ...item, itemHours: ih, itemGlobal: ig, subtotal: sub };
                  });
                  const isTotalManual = config.manualTotal !== undefined;
                  const displayTotal = isTotalManual ? config.manualTotal! : autoTotal;

                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {rows.map(row => (
                          <div key={row.type} className="bg-white rounded-lg border border-slate-200 px-3 py-2 space-y-1.5 text-center shadow-2xs">
                            <div className="text-xs font-bold text-slate-800">{row.label}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{row.qty} יח'</div>
                            <div className="flex justify-center">
                              {isGlobal ? (
                                <div className="relative w-full max-w-[90px]">
                                  <span className="absolute right-1 top-1 text-slate-400 font-bold text-[8px]">₪</span>
                                  <input type="number" min="0" step="10" value={row.itemGlobal}
                                    onChange={e => handleOpeningSubItemChange(row.type, 'globalPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-md pr-3.5 pl-1.5 py-0.5 font-bold text-slate-900 text-center text-xs focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <input type="number" min="0" step="0.5" value={row.itemHours}
                                  onChange={e => handleOpeningSubItemChange(row.type, 'hours', parseFloat(e.target.value) || 0)}
                                  className="w-full max-w-[90px] bg-white border border-blue-200 focus:border-blue-500 rounded-md px-1.5 py-0.5 font-bold text-slate-900 text-center text-xs focus:outline-none"
                                />
                              )}
                            </div>
                            <div className="text-xs font-bold text-emerald-700">₪{row.subtotal.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary row */}
                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                        <div />
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold ${isTotalManual ? 'text-amber-600' : 'text-blue-600'}`}>
                            {isTotalManual ? 'ידני' : 'אוטומטי'}
                          </span>
                          <div className="relative w-28">
                            <input type="number" min="0" step="100" value={displayTotal}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                const ccp = { ...(localSettings.categoryPricing ?? {}) };
                                const cp = ccp.openings ?? {};
                                ccp.openings = { ...cp, manualTotal: val } as CategoryPricingConfig;
                                const upd = { ...localSettings, categoryPricing: ccp };
                                setLocalSettings(upd);
                                if (onUpdateGlobalSettings) onUpdateGlobalSettings(upd);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); handleOpeningEscapeReset(); }
                              }}
                              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-md py-0.5 font-black text-slate-900 text-sm text-center focus:outline-none pr-6 pl-1.5"
                            />
                            <span className="absolute left-1.5 top-1 text-emerald-700 font-black text-sm pointer-events-none">₪</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : cat.key === 'electrical' ? (
              <div key="electrical" className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                {/* Header: title + method + hourly rate */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-slate-900">{cat.label}</span>
                    {cat.subLabel && <span className="text-xs text-slate-500 font-semibold">{cat.subLabel}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">שיטת תמחור:</span>
                    <select
                      value={config.method}
                      onChange={(e) => handleCategoryMethodChange(cat.key, e.target.value as CategoryPricingMethod)}
                      className="bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1 text-sm font-bold text-slate-900 focus:outline-none shadow-2xs"
                    >
                      <option value="work_hours">שעות עבודה</option>
                      <option value="global_install">התקנה גלובלית</option>
                    </select>
                    {config.method !== 'global_install' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">תעריף שעתי:</span>
                        <div className="relative w-20">
                          <span className="absolute right-1 top-1 text-slate-400 font-bold text-[9px]">₪</span>
                          <input type="number" min="0" step="5" value={config.unitPrice ?? cat.defaultUnitPrice ?? 150}
                            onChange={e => handleCategoryFieldChange('electrical', 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg pr-4 pl-1.5 py-1 font-bold text-slate-900 text-center text-xs focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3-column grid for electrical items */}
                {(() => {
                  const defaultSubItems = getElectricalSubItems();
                  const subItems = config.electricalSubItems ?? defaultSubItems;
                  const isGlobal = config.method === 'global_install';
                  const hourlyRate = config.unitPrice ?? cat.defaultUnitPrice ?? 150;
                  let autoTotal = 0;
                  const rows = subItems.map(item => {
                    const ih = item.hours ?? defaultSubItems.find(s => s.key === item.key)?.hours ?? 4;
                    const ip = item.unitPrice ?? defaultSubItems.find(s => s.key === item.key)?.unitPrice ?? 200;
                    const sub = isGlobal ? item.qty * ip : item.qty * ih * hourlyRate;
                    autoTotal += sub;
                    return { ...item, itemHours: ih, itemUnitPrice: ip, subtotal: sub };
                  });
                  const isTotalManual = config.manualTotal !== undefined;
                  const displayTotal = isTotalManual ? config.manualTotal! : autoTotal;

                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {rows.map(row => (
                          <div key={row.key} className="bg-white rounded-lg border border-slate-200 px-3 py-2 space-y-1.5 text-center shadow-2xs">
                            <div className="text-xs font-bold text-slate-800">{row.label}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{row.qty} יח'</div>
                            <div className="flex justify-center">
                              {isGlobal ? (
                                <div className="relative w-full max-w-[90px]">
                                  <span className="absolute right-1 top-1 text-slate-400 font-bold text-[8px]">₪</span>
                                  <input type="number" min="0" step="10" value={row.itemUnitPrice}
                                    onChange={e => handleElectricalSubItemChange(row.key, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-md pr-3.5 pl-1.5 py-0.5 font-bold text-slate-900 text-center text-xs focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <input type="number" min="0" step="0.5" value={row.itemHours}
                                  onChange={e => handleElectricalSubItemChange(row.key, 'hours', parseFloat(e.target.value) || 0)}
                                  className="w-full max-w-[90px] bg-white border border-blue-200 focus:border-blue-500 rounded-md px-1.5 py-0.5 font-bold text-slate-900 text-center text-xs focus:outline-none"
                                />
                              )}
                            </div>
                            <div className="text-xs font-bold text-emerald-700">₪{row.subtotal.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary row */}
                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                        <div />
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold ${isTotalManual ? 'text-amber-600' : 'text-blue-600'}`}>
                            {isTotalManual ? 'ידני' : 'אוטומטי'}
                          </span>
                          <div className="relative w-28">
                            <input type="number" min="0" step="100" value={displayTotal}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                const ccp = { ...(localSettings.categoryPricing ?? {}) };
                                const cp = ccp.electrical ?? {};
                                ccp.electrical = { ...cp, manualTotal: val } as CategoryPricingConfig;
                                const upd = { ...localSettings, categoryPricing: ccp };
                                setLocalSettings(upd);
                                if (onUpdateGlobalSettings) onUpdateGlobalSettings(upd);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); handleElectricalEscapeReset(); }
                              }}
                              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-md py-0.5 font-black text-slate-900 text-sm text-center focus:outline-none pr-6 pl-1.5"
                            />
                            <span className="absolute left-1.5 top-1 text-emerald-700 font-black text-sm pointer-events-none">₪</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div
                key={cat.key}
                className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-slate-900">{cat.label}</span>
                    {cat.subLabel && (
                      <span className="text-xs text-slate-500 font-semibold">{cat.subLabel}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{cat.description}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">שיטת תמחור:</span>
                  <select
                    value={config.method}
                    onChange={(e) => handleCategoryMethodChange(cat.key, e.target.value as CategoryPricingMethod)}
                    className="flex-1 bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none shadow-2xs"
                  >
                    <option value="square_meter">מטר רבוע (מ"ר)</option>
                    <option value="work_hours">שעות עבודה</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 relative">
                    <span className="absolute right-2.5 top-2.5 text-slate-400 font-bold text-[10px] pointer-events-none">{quantityLabel}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={displayQuantity}
                      onChange={(e) =>
                        handleCategoryFieldChange(cat.key, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          (e.target as HTMLInputElement).blur();
                          handleQuantityEscapeReset(cat.key);
                        }
                      }}
                      className={`w-full bg-white border border-slate-300 rounded-lg py-1.5 font-extrabold text-slate-900 text-sm focus:outline-none shadow-2xs text-center ${isSquareMeter ? 'pr-36 pl-14' : 'focus:border-blue-500 pr-16 pl-3'}`}
                    />
                    {isSquareMeter && (
                      <span className={`absolute left-2.5 top-2.5 text-[9px] font-bold pointer-events-none ${isManual ? 'text-amber-600' : 'text-blue-600'}`}>
                        {isManual ? 'ידני' : 'אוטומטי'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute right-2.5 top-2.5 text-slate-400 font-bold text-[10px] pointer-events-none">{unitLabel}</span>
                    <input
                      type="number"
                      min="0"
                      step={isWorkHours ? '5' : '1'}
                      value={config.unitPrice ?? cat.defaultUnitPrice ?? 0}
                      onChange={(e) =>
                        handleCategoryFieldChange(cat.key, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg py-1.5 font-extrabold text-slate-900 text-sm text-center focus:outline-none shadow-2xs pr-12 pl-3"
                    />
                  </div>
                  <div className="shrink-0 text-center">
                    <span className="text-[10px] text-slate-400 block">=</span>
                    <span className="font-black text-sm text-emerald-700 whitespace-nowrap">
                      ₪{(displayQuantity * (config.unitPrice ?? cat.defaultUnitPrice ?? 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          הנתונים נשמרים אוטומטית וישמשו בעתיד לאיסוף סטטיסטי ובקרה על תמחור הקטגוריות.
        </p>
      </section>
    </div>
  );
};
