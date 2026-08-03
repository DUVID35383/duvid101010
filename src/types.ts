export type ProjectStatus = 'draft' | 'quotation' | 'in_progress' | 'completed';

export interface RoomDimensions {
  length: number; // meters (e.g. 6.0)
  width: number;  // meters (e.g. 2.5)
  height: number; // meters (e.g. 2.6)
}

export type ConstructionMaterialType = 'steel' | 'aluminum' | 'timber';

export interface ConstructionConfig {
  profileSpacingCm: number; // e.g. 60cm or 50cm or 40cm
  materialType: ConstructionMaterialType;
  profileSpec: string; // e.g. '80x40x2', '50x50x3', '100x50x3'
  unitWeightKgPerMeter: number; // e.g. 3.8 kg/m
}

export type WheelType = 'fixed' | 'swivel' | 'swivel_brake' | string;

export interface WheelConfig {
  wheelType: WheelType;
  quantity: number; // e.g. 4, 6, 8, 10, 12
  loadCapacityPerWheelKg: number; // e.g. 300, 500, 1000 kg
  loadCapacityManual?: boolean; // true = manually overridden; false/undefined = auto-calculated from structure weight
  unitPrice?: number; // optional price per wheel in ₪
}

export type BasePlateType = 'cement_board_16' | 'cement_board_18' | 'osb_18' | 'marine_plywood_18' | 'steel_checkered_3' | string;
export type TopCoveringType = 'spc_vinyl' | 'laminate_ac4' | 'natural_wood' | 'pvc_industrial' | 'synthetic_turf' | 'granite_tiles' | 'none' | string;
export type InsulationType = 'eps_foam' | 'rockwool' | 'pu_foam' | 'none' | string;

export interface FloorConfig {
  basePlateType: BasePlateType;
  topCovering: TopCoveringType;
  insulationType: InsulationType;
}

export type PanelType = 'eps_panel' | 'iscorit_pu' | 'rockwool_panel' | string;
export type ExteriorCladding = 'wpc_wood_slats' | 'aluminum_siding' | 'natural_timber' | 'painted_panel' | 'decorative_metal' | 'none' | string;
export type PanelTrackType = 'panel_aluminum_tracks' | 'galvanized_drywall_tracks' | 'none' | string;

export type PolymerCladdingType = 'plates' | 'slats' | 'none' | string;
export type PolymerHeightMode = 'full' | 'half' | 'custom' | string;
export type InteriorCladdingType = 'gypsum_boards' | 'wood_nutfeder' | 'pvc_boards' | 'polymer_plates' | 'polymer_slats' | 'exposed_panel' | 'none' | string;

export interface PolymerCladdingConfig {
  type: PolymerCladdingType; // פלטות פולימריות | סרגלים פולימריים | ללא
  interiorCladdingType?: InteriorCladdingType; // גבס | עץ נוטפדר | לוחות PVC | פלטות/סרגלים | ללא
  heightMode: PolymerHeightMode; // עד התקרה | חצי גובה | גובה מותאם אישית
  customHeightCm: number; // e.g. 120 cm
}

export interface WallRoofConfig {
  panelType: PanelType; // default 'eps_panel' - לוחות קיר
  panelThicknessMm: number; // 50 to 100 mm (5 to 10 cm)
  panelTrackType?: PanelTrackType; // מסלולי אלומיניום/פח לפנל | מסלולי גבס | ללא
  claddingExterior: ExteriorCladding;
  polymerCladding: PolymerCladdingConfig;
  roofPanelType?: string; // סוג פנל גג נפרד (למשל 'iscorit_roof_panel')
  roofOverhangCm?: number; // בלט גג בס"מ מכל צד (30, 40, 50)
}

export type OpeningType = 'window' | 'main_door' | 'interior_door' | string;
export type DoorProfile = 'klil_2000' | 'klil_4500' | string;
export type GlassType = 'glass_4mm' | 'triplex' | 'antisun' | string;
export type OpeningMaterial = 'aluminum' | 'pvc' | 'wood' | string;

export interface OpeningItem {
  id: string;
  type: OpeningType;
  title: string;
  widthCm: number;  // size in cm (e.g. 100 cm)
  heightCm: number; // size in cm (e.g. 100 cm)
  width?: number;   // size in meters (e.g. 1.0)
  height?: number;  // size in meters (e.g. 1.0)
  quantity: number;
  material?: OpeningMaterial;
  doorProfile?: DoorProfile;
  glassType: GlassType; // "4mm regular", "Triplex", "Antisun"
  pricePerUnit: number; // ILS ₪
}

export type ElecInstallationType = 'hidden_in_panel' | 'exposed_conduits' | string;
export type ElecPanelLocation = 'corner' | 'wall_center' | string; // מיקום ארון החשמל במבנה

export type ElectricalPointCategory = 'switches' | 'outlets' | 'powerOutlets' | 'lighting';

// נקודה פרטנית ברשימה הדינמית של שלב 7 - אורך הכבל מחושב כסכום ישיר של השדות בלבד
// (מרחק אופקי + גובה + סרח), ללא Fallback וללא ערך מינימלי ברקע
export interface ElectricalPointDetail {
  id: string;
  label: string;              // תיאור/שם הנקודה (למשל "שקע כוח תנור", "מתג כניסה")
  distanceMeters: number;     // מרחק אופקי (במטרים) - מלוח החשמל או מהנקודה המזינה בשרשור
  heightMeters: number;       // גובה מהרצפה (במטרים - למשל 0.3, 1.1, 2.2)
  reserveMeters: number;      // מקדם סרח/רזרבה בתוך הקופסה (במטרים)
  fedFrom?: string | null;    // שרשור (Daisy Chain): מזהה נקודה/לוח שמזין אותה; null/לא מוגדר = הזנה ישירה מהלוח
}

export interface ElectricalPointDetailsMap {
  switches: ElectricalPointDetail[];      // מתגים (switchesCount)
  outlets: ElectricalPointDetail[];       // שקעים רגילים (powerOutletsCount)
  powerOutlets: ElectricalPointDetail[];  // שקעי כוח (heavyPowerOutletsCount)
  lighting: ElectricalPointDetail[];      // נקודות תאורה (lightingPointsCount)
}

// נקודה על גבי קנבס השרטוט האינטראקטיבי - מיקום במטרים ביחס לחלל החדר
export interface ElectricalCanvasPoint {
  id: string;                        // מזהה תואם לשורת הנקודה ב-pointDetails
  category: ElectricalPointCategory; // קטגוריית הנקודה
  x: number;                         // מיקום אופקי במטרים (0..אורך החדר)
  y: number;                         // מיקום עומק במטרים (0..רוחב החדר)
  fedFrom?: string | null;           // שרשור: מזהה נקודה המזינה אותה (null/לא מוגדר = ישירה מהלוח)
}

// נתוני שרטוט חשמל אינטראקטיבי (קנבס)
export interface ElectricalCanvasData {
  panel: { x: number; y: number } | null; // לוח החשמל על המפה (במטרים)
  points: ElectricalCanvasPoint[];         // כל הנקודות ששורטטו
  wiredPointIds: string[];                 // נקודות שחובר אליהן קו חיווט/צנרת מלוח החשמל
}

export interface ElectricalConfig {
  powerOutletsCount: number;      // שקעי חשמל רגילים (2 מודולים, 16A)
  heavyPowerOutletsCount: number; // שקעי כוח (מעגל ייעודי ללוח, 16A/20A)
  switchesCount: number;          // מתגים (חד-קוטביים)
  lightingPointsCount: number;    // נקודות מאור / גופי תאורה LED
  mainPanelType: 'single_phase_32a' | 'three_phase_32a' | 'heavy_duty_63a' | 'none' | string;
  airConditioner: 'ac_1hp' | 'ac_15hp' | 'ac_2hp' | 'ac_inverter_25hp' | 'none' | string;
  installationType: ElecInstallationType; // התקנה נסתרת בתוך הפנל | התקנה גלויה בתעלות
  panelLocation: ElecPanelLocation;              // מיקום ארון החשמל במבנה (פינה/מרכז קיר)
  feedDistanceMeters: number;                    // מרחק ארון החשמל מהזנה ראשית/חיצונית (מטרים)
  powerOutletAvgDistanceMeters: number;          // מרחק ממוצע של שקעי כוח מהלוח (מטרים) - legacy fallback
  pointDetails?: Partial<ElectricalPointDetailsMap>; // רשימה דינמית של נקודות פרטניות לפי קטגוריה
  canvas?: ElectricalCanvasData;                 // שרטוט חשמל אינטראקטיבי (Interactive Electrical Canvas)
}

export interface VentaConfig {
  enabled: boolean;
  quantity: number;
  diameterInch: 4 | 6 | 8;
  direction: 'exhaust' | 'intake'; // הוצאת אוויר | הכנסת אוויר
  itemId?: string; // Optional catalog item ID
}

export interface HVACConfig {
  enabled: boolean;
  airConditioner: 'ac_1hp' | 'ac_15hp' | 'ac_2hp' | 'ac_inverter_25hp' | 'none';
  venta: VentaConfig;
}

export interface ProjectSectionToggles {
  includeBottomStructure: boolean; // 1. קונסטרוקציה תחתונה
  includeWheels: boolean;          // 1b. גלגלים תעשייתיים
  includeFloor: boolean;           // 2. רצפה וחיפוי רצפה
  includeWallsAndRoof: boolean;    // 3. בניית החדר (פנל מבודד)
  includeInteriorCladding: boolean;// 4. חיפוי פנימי
  includeElectrical: boolean;      // 5. חשמל ומתגים
  includeHVAC: boolean;            // 6. מיזוג ואוורור
  includeExteriorCladding: boolean;// 7. חיפוי חיצוני וגימורים
}

export interface GlobalCostSettings {
  defaultContractorMarginPercent: number;
  defaultCuttingWastePercent: number;
  vatRatePercent: number;
}

export interface CustomItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // ₪ cost per unit
}

export interface CatalogAddOnItem {
  id: string;
  catalogItemId: string;
  quantity: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  date: string; // YYYY-MM-DD
  status: ProjectStatus;
  
  // Financial settings
  contractorMarginPercent: number; // default e.g. 25%
  vatEnabled: boolean;             // מע"מ מופעל/מכובה
  notes: string;
  termsAndWarranty?: string; // Custom editable terms and warranty for quote

  // Per-step manual additions (custom items) and catalog products, keyed by wizard step (1-9)
  customItems?: Record<number, CustomItem[]>;
  catalogAddOns?: Record<number, CatalogAddOnItem[]>;

  // Construction pricing (managed in pricing view, not in builder)
  constructionWorkHours?: number;   // שעות עבודה בפועל לקונסטרוקציה
  constructionHourlyRate?: number;  // תעריף שעתי לקונסטרוקציה

  // Configuration sections
  sectionToggles?: ProjectSectionToggles;
  dimensions: RoomDimensions;
  construction: ConstructionConfig;
  wheels: WheelConfig;
  floor: FloorConfig;
  wallRoof: WallRoofConfig;
  openings: OpeningItem[];
  electrical: ElectricalConfig;
  hvac?: HVACConfig;
  electricalPlan?: {
    name: string;
    mimeType: string;
    dataUrl: string; // base64 של הקובץ (PDF/DWG/תמונה)
    sizeBytes: number;
    uploadedAt: string; // ISO timestamp
  } | null; // תוכנית חשמל שהועלתה בשלב 7 (נספח למסמכי המערכת)
}

export type MaterialCategory = 
  | 'construction' 
  | 'floor' 
  | 'panels' 
  | 'wall_cladding'
  | 'wheels' 
  | 'openings' 
  | 'electrical' 
  | 'hvac'
  | 'hardware';

export type MaterialSubCategory = 
  | 'construction_profile' // פרופילי שלד
  | 'profiles'              // פרופילים
  | 'construction_hardware' // פרזול ואביזרים
  | 'welding_coils'         // סלילי ריתוך
  | 'wheel_type'            // סוגי גלגלים
  | 'wheels_base'           // גלגלים בסיס
  | 'levelling_jacks'       // ג'קים לפילוס המבנה
  | 'floor_base'            // תשתית רצפה
  | 'floor_top'             // חיפוי עליון
  | 'floor_insulation'      // בידוד רצפה
  | 'wall_panel'            // סוגי פנל
  | 'panel_track'           // מסלולי פנל
  | 'interior_cladding'     // חיפוי פנימי
  | 'electrical'            // חשמל
  | 'electrical_external'   // חשמל - התקנה חיצונית
  | 'electrical_internal'   // חשמל - התקנה פנימית
  | 'ac_unit'               // סוגי מזגנים
  | 'ventilation'           // ונטות ואוורור
  | 'exterior_cladding'     // חיפוי חיצוני
  | 'openings'              // פתחים
  | 'doors'                 // דלתות
  | 'windows'               // חלונות
  | 'sealant_silicone'      // סיליקון ומסטיק
  | 'screws_drills'         // ברגים ומקדחים
  | 'sealing_profiles_gutters' // פרופילי איטום ומרזבים
  | 'labor';                // עבודה ושעות

export const SUB_CATEGORY_LABELS: Record<MaterialSubCategory, string> = {
  construction_profile: 'פרופילי שלד',
  profiles: 'פרופילים',
  construction_hardware: 'פרזול ואביזרים',
  welding_coils: 'סלילי ריתוך',
  wheel_type: 'סוגי גלגלים',
  wheels_base: 'גלגלים בסיס',
  levelling_jacks: "ג'קים לפילוס המבנה",
  floor_base: 'תשתית רצפה',
  floor_top: 'חיפוי עליון',
  floor_insulation: 'בידוד רצפה',
  wall_panel: 'סוגי פנל',
  panel_track: 'מסלולי פנל',
  interior_cladding: 'חיפוי פנימי',
  electrical: 'חשמל',
  electrical_external: 'התקנה חיצונית',
  electrical_internal: 'התקנה פנימית',
  ac_unit: 'סוגי מזגנים',
  ventilation: 'ונטות ואוורור',
  exterior_cladding: 'חיפוי חיצוני',
  openings: 'פתחים',
  doors: 'דלתות',
  windows: 'חלונות',
  sealant_silicone: 'סיליקון ומסטיק',
  screws_drills: 'ברגים ומקדחים',
  sealing_profiles_gutters: 'פרופילי איטום ומרזבים',
  labor: 'עבודה ושעות',
};

export type MaterialUnit = 'מ"ר' | 'מטר רץ' | 'יחידה' | 'סט' | 'ק"ג' | 'קופסה';

export type CategoryPricingMethod = 'square_meter' | 'work_hours' | 'global_install';

export interface OpeningPricingSubItem {
  type: 'doors' | 'series7000' | 'fold';
  label: string;
  qty: number;
  hours?: number;
  globalPrice?: number;
}

export interface ElectricalPricingSubItem {
  key: string;
  label: string;
  qty: number;
  hours?: number;
  unitPrice?: number;
}

export interface CategoryPricingConfig {
  method: CategoryPricingMethod;
  quantity?: number;   // hours / sqm / linear meters
  unitPrice?: number;  // per-unit cost (per hour / per sqm / per linear meter)
  manualOverride?: boolean; // true if user manually entered quantity
  subItems?: OpeningPricingSubItem[];
  electricalSubItems?: ElectricalPricingSubItem[];
  manualTotal?: number;
}

export interface GlobalPricingSettings {
  contractorMarginPercent: number; // e.g. 20
  vatRatePercent: number;          // e.g. 18
  defaultConstructionWorkHours?: number;   // e.g. 40
  defaultConstructionHourlyRate?: number;  // e.g. 120
  categoryPricing?: Partial<Record<MaterialCategory, CategoryPricingConfig>>;
}

export interface MaterialCatalogItem {
  id: string;
  type?: 'material' | 'labor';     // Primary discriminator: "material" or "labor"
  itemType?: 'material' | 'labor'; // Compatibility discriminator: "material" or "labor"
  targetMetric?: 'floorArea' | 'wallArea' | 'perimeter' | 'totalVolume' | 'fixed' | 'hours' | 'days';
  category: MaterialCategory;
  subCategory?: MaterialSubCategory | string;
  installationType?: 'external' | 'internal'; // סוג התקנה לחשמל: חיצונית/פנימית
  name: string;
  unit: MaterialUnit;
  defaultUnitPrice: number; // ₪
  wasteFactorPercent?: number; // e.g. 10 for 10%
  notes?: string;
  lastUpdated?: string;
  defaultWidthCm?: number;  // מידות ברירת מחדל לפתחים (רוחב בס"מ)
  defaultHeightCm?: number; // מידות ברירת מחדל לפתחים (גובה בס"מ)
}

export interface LaborLineItem {
  id: string;
  name: string;
  category: MaterialCategory;
  formulaText: string; // e.g., "15 מ"ר × 250 ש"ח = 3,750 ש"ח"
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface BOMItem {
  id: string;
  category: MaterialCategory;
  categoryLabelHeb: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ScannedReceiptItem {
  item: string;
  category: MaterialCategory;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ScannedReceiptResult {
  supplierName: string;
  date: string;
  totalAmount: number;
  confidenceScore: number;
  items: ScannedReceiptItem[];
  notes?: string;
}

export type AppDocumentKind = 'quote' | 'bom' | 'receipt' | 'upload';

export interface AppDocumentSnapshotRow {
  name: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface AppDocumentSnapshotSection {
  title: string;
  rows: AppDocumentSnapshotRow[];
}

export interface AppDocumentSnapshot {
  projectName?: string;
  clientName?: string;
  date?: string;
  dimensions?: string;
  quoteNumber?: string;
  items?: AppDocumentSnapshotRow[];
  sections: AppDocumentSnapshotSection[];
  summary: { label: string; value: number; highlight?: boolean }[];
}

export interface AppDocumentMeta {
  totalPrice?: number;
  status?: string;
  supplierName?: string;
  totalAmount?: number;
  confidenceScore?: number;
  snapshot?: AppDocumentSnapshot;
}

export interface AppDocument {
  id: string;
  projectId: string | null; // null = general folder (מסמכים כלליים / חשבוניות נכנסות)
  kind: AppDocumentKind;
  name: string;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string; // base64 content (uploads / scanned receipts)
  sizeBytes?: number;
  createdAt: string; // ISO date
  notes?: string;
  meta?: AppDocumentMeta;
}
