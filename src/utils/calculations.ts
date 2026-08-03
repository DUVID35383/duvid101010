import { Project, MaterialCatalogItem, BOMItem, MaterialCategory, GlobalPricingSettings, LaborLineItem, AppDocumentSnapshot, AppDocumentSnapshotSection, ElectricalPointCategory, ElectricalPointDetail } from '../types';

export interface AreaCalculations {
  floorArea: number;
  roofArea: number;
  wallAreaGross: number;
  openingsArea: number;
  wallAreaNet: number;
  perimeter: number;
  volume: number;
  roofAreaWithOverhang: number;
}

export interface StructuralCalculations {
  spacingMeters: number;
  baseRingMeters: number;
  roofRingMeters: number;
  wallStudsMeters: number;
  joistsMeters: number;
  floorSteelNet: number;
  floorSteelWaste: number;
  floorSteelTotal: number;
  totalLinearMetersRaw: number;
  totalLinearMetersWithWaste: number;
  frameWeightKg: number;
}

export interface WeightCalculations {
  frameWeightKg: number;
  floorBaseWeightKg: number;
  floorCoveringWeightKg: number;
  wallPanelsWeightKg: number;
  roofPanelsWeightKg: number;
  openingsWeightKg: number;
  electricalAcWeightKg: number;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  recommendedLoadPerWheelKg: number;
  effectiveLoadPerWheelKg: number;
  totalWheelCapacityKg: number;
  isOverweight: boolean;
  weightDeficitKg: number;
}

export interface ClientQuoteCalculations {
  materialsCost: number;
  laborCost: number;
  laborBreakdown: LaborLineItem[];
  subtotalBeforeMargin: number;
  contractorMarginAmount: number;
  contractorMarginPercent: number;
  subtotalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalClientPrice: number;
  totalClientPriceWithVat: number;
}

// Round to 2 decimal places for precise display
const r2 = (n: number): number => Math.round(n * 100) / 100;

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  construction: 'קונסטרוקציה תחתונה',
  floor: 'תשתית וחיפוי רצפה',
  panels: 'מעטפת, פאנלים מבודדים וקירות',
  wall_cladding: 'חיפוי הקירות',
  wheels: 'גלגלים וג\'קים',
  openings: 'פתחים',
  electrical: 'חשמל',
  hvac: 'מיזוג',
  hardware: 'חומרי עזר, פרזול וסיליקון',
};

// Wizard step (1-9) -> BOM category mapping
export const STEP_CATEGORY: Record<number, MaterialCategory> = {
  1: 'construction',
  2: 'floor',
  3: 'panels',
  4: 'wall_cladding',
  5: 'wheels',
  6: 'openings',
  7: 'electrical',
  8: 'hvac',
  9: 'hardware',
};

// Wizard step (1-9) -> section toggle gating (null = always included)
const STEP_TOGGLE_KEYS: Record<number, string | null> = {
  1: 'includeBottomStructure',
  2: 'includeFloor',
  3: 'includeWallsAndRoof',
  4: 'includeInteriorCladding',
  5: 'includeWheels',
  6: null,
  7: 'includeElectrical',
  8: 'includeHVAC',
  9: null,
};

export function calculateAreas(project: Project): AreaCalculations {
  const { length, width, height } = project.dimensions;
  const floorArea = r2(length * width);
  const roofArea = floorArea;
  const wallAreaGross = r2(2 * (length + width) * height);

  let openingsArea = 0;
  if (project.openings && Array.isArray(project.openings)) {
    openingsArea = project.openings.reduce((sum, item) => {
      const wMeters = (item.widthCm || 100) / 100;
      const hMeters = (item.heightCm || 100) / 100;
      return sum + (wMeters * hMeters * item.quantity);
    }, 0);
  }
  openingsArea = r2(openingsArea);
  const wallAreaNet = Math.max(0, r2(wallAreaGross - openingsArea));
  const perimeter = r2(2 * (length + width));
  const volume = r2(length * width * height);

  const overhangCm = project.wallRoof?.roofOverhangCm ?? 0;
  const overhangM = overhangCm / 100;
  const roofAreaWithOverhang = r2((length + 2 * overhangM) * (width + 2 * overhangM));

  return { floorArea, roofArea, wallAreaGross, openingsArea, wallAreaNet, perimeter, volume, roofAreaWithOverhang };
}

export function calculateStructuralMeters(project: Project): StructuralCalculations {
  const includeBottom = project.sectionToggles?.includeBottomStructure ?? true;
  const { length, width, height } = project.dimensions;
  const spacingMeters = (project.construction.profileSpacingCm || 60) / 100;

  if (!includeBottom) {
    return {
      spacingMeters, baseRingMeters: 0, roofRingMeters: 0, wallStudsMeters: 0, joistsMeters: 0,
      floorSteelNet: 0, floorSteelWaste: 0, floorSteelTotal: 0,
      totalLinearMetersRaw: 0, totalLinearMetersWithWaste: 0, frameWeightKg: 0,
    };
  }

  // ----- FLOOR STEEL GRID (שלד רצפה - רשת קורות) -----
  // קורות אורך: מספרן נקבע לפי רוחב הרצפה, אורך כל אחת = אורך החדר
  // קורות רוחב: מספרן נקבע לפי אורך הרצפה, אורך כל אחת = רוחב החדר
  const spacingCm = project.construction.profileSpacingCm || 60;
  const widthCm = width * 100;
  const lengthCm = length * 100;

  const beamsAlongLength = Math.ceil(widthCm / spacingCm) + 1;
  const beamsAlongWidth = Math.ceil(lengthCm / spacingCm) + 1;

  // Use exact beam lengths: length-direction beams = room length, width-direction beams = room width
  const totalLengthBeams = r2(beamsAlongLength * length);
  const totalWidthBeams = r2(beamsAlongWidth * width);

  // כמות נטו
  const floorSteelNet = r2(totalLengthBeams + totalWidthBeams);

  // פחת 10% בדיוק
  const floorSteelWaste = r2(floorSteelNet * 0.1);
  const floorSteelTotal = r2(floorSteelNet + floorSteelWaste);

  // ----- BACKWARD COMPAT -----
  const perimeter = 2 * (length + width);
  const baseRingMeters = perimeter;
  const roofRingMeters = perimeter;
  const joistCount = Math.ceil(length / spacingMeters);
  const floorJoistsMeters = joistCount * width;
  const roofJoistsMeters = joistCount * width;
  const joistsMeters = floorJoistsMeters + roofJoistsMeters;

  const studsLongWalls = Math.ceil(length / spacingMeters) * 2;
  const studsShortWalls = Math.ceil(width / spacingMeters) * 2;
  const cornerStuds = 4;
  const wallStudsMeters = (studsLongWalls + studsShortWalls + cornerStuds) * height;

  const subtotalMeters = baseRingMeters + roofRingMeters + joistsMeters + wallStudsMeters;
  const totalLinearMetersRaw = subtotalMeters * 1.15;
  const totalLinearMetersWithWaste = Math.ceil(totalLinearMetersRaw * 1.10);

  const unitWeight = project.construction.unitWeightKgPerMeter || 3.8;
  const frameWeightKg = Math.round(floorSteelTotal * unitWeight);

  return {
    spacingMeters,
    baseRingMeters: r2(baseRingMeters),
    roofRingMeters: r2(roofRingMeters),
    wallStudsMeters: r2(wallStudsMeters),
    joistsMeters: r2(joistsMeters),
    floorSteelNet,
    floorSteelWaste,
    floorSteelTotal,
    totalLinearMetersRaw: Math.round(totalLinearMetersRaw),
    totalLinearMetersWithWaste,
    frameWeightKg,
  };
}

export function calculateEstimatedWeight(project: Project): WeightCalculations {
  const areas = calculateAreas(project);
  const struct = calculateStructuralMeters(project);

  const incBottom = project.sectionToggles?.includeBottomStructure ?? true;
  const incWheels = project.sectionToggles?.includeWheels ?? true;
  const incFloor = project.sectionToggles?.includeFloor ?? true;
  const incWalls = project.sectionToggles?.includeWallsAndRoof ?? true;
  const incElec = project.sectionToggles?.includeElectrical ?? true;
  const incHvac = project.sectionToggles?.includeHVAC ?? true;

  const hasProfileSpec = project.construction?.profileSpec && project.construction.profileSpec !== 'none';
  const frameWeightKg = incBottom && hasProfileSpec ? struct.frameWeightKg : 0;

  const basePlateId = project.floor.basePlateType;
  const hasBasePlate = basePlateId && basePlateId !== 'none';
  let basePlateUnitWeight = 0;
  if (hasBasePlate) {
    basePlateUnitWeight = 22;
    if (basePlateId === 'osb_18') basePlateUnitWeight = 12;
    if (basePlateId === 'steel_checkered_3') basePlateUnitWeight = 26;
  }
  const floorBaseWeightKg = incFloor && hasBasePlate ? Math.round(areas.floorArea * basePlateUnitWeight) : 0;

  let coveringUnitWeight = 0;
  if (project.floor.topCovering === 'granite_tiles') coveringUnitWeight = 18;
  else if (project.floor.topCovering === 'natural_wood') coveringUnitWeight = 12;
  else if (project.floor.topCovering && project.floor.topCovering !== 'none') coveringUnitWeight = 7;
  const floorCoveringWeightKg = (incFloor && project.floor.topCovering !== 'none' && project.floor.topCovering) ? Math.round(areas.floorArea * coveringUnitWeight) : 0;

  const panelTypeId = project.wallRoof.panelType;
  const hasPanelType = panelTypeId && panelTypeId !== 'none';
  let panelUnitWeight = 0;
  if (hasPanelType) {
    panelUnitWeight = 12;
    if (panelTypeId === 'rockwool_panel') panelUnitWeight = 20;
    if (project.wallRoof.panelThicknessMm === 75) panelUnitWeight += 2;
    if (project.wallRoof.panelThicknessMm === 100) panelUnitWeight += 4;
    if (project.wallRoof.panelThicknessMm === 150) panelUnitWeight += 8;
  }

  const wallPanelsWeightKg = (incWalls && hasPanelType) ? Math.round(areas.wallAreaNet * panelUnitWeight) : 0;
  const roofPanelsWeightKg = (incWalls && hasPanelType) ? Math.round(areas.roofAreaWithOverhang * panelUnitWeight) : 0;

  const totalOpeningsCount = project.openings.reduce((sum, item) => sum + item.quantity, 0);
  const openingsWeightKg = (incWalls && totalOpeningsCount > 0) ? totalOpeningsCount * 28 : 0;
  const hasAC = (project.hvac?.airConditioner && project.hvac.airConditioner !== 'none') || 
    (project.electrical?.airConditioner && project.electrical.airConditioner !== 'none');
  const electricalAcWeightKg = (incElec || incHvac) && hasAC ? 90 : 0;

  const totalNetWeightKg = frameWeightKg + floorBaseWeightKg + floorCoveringWeightKg + 
    wallPanelsWeightKg + roofPanelsWeightKg + openingsWeightKg + electricalAcWeightKg;

  const totalGrossWeightKg = Math.round(totalNetWeightKg * 1.15);

  // Recommended load per wheel: total structure weight / wheel quantity, + 25% safety factor, rounded up
  const wheelQty = incWheels ? (project.wheels.quantity || 4) : 4;
  const recommendedLoadPerWheelKg = wheelQty > 0 ? Math.ceil((totalNetWeightKg / wheelQty) * 1.25) : 0;
  const loadCapacityManual = incWheels ? !!project.wheels.loadCapacityManual : false;
  const effectiveLoadPerWheelKg = loadCapacityManual ? (project.wheels.loadCapacityPerWheelKg || 0) : recommendedLoadPerWheelKg;
  const totalWheelCapacityKg = incWheels ? wheelQty * effectiveLoadPerWheelKg : 0;
  const isOverweight = incWheels ? (totalGrossWeightKg > totalWheelCapacityKg) : false;
  const weightDeficitKg = incWheels ? Math.max(0, totalGrossWeightKg - totalWheelCapacityKg) : 0;

  return {
    frameWeightKg, floorBaseWeightKg, floorCoveringWeightKg,
    wallPanelsWeightKg, roofPanelsWeightKg, openingsWeightKg, electricalAcWeightKg,
    totalNetWeightKg, totalGrossWeightKg,
    recommendedLoadPerWheelKg, effectiveLoadPerWheelKg,
    totalWheelCapacityKg, isOverweight, weightDeficitKg,
  };
}

// Calculate quantity with waste, precise to 2 decimal places
function calcWithWaste(netQty: number, wastePercent: number): { net: number; wasteAmount: number; total: number; wastePercent: number } {
  const waste = wastePercent || 10;
  const wasteAmount = r2(netQty * (waste / 100));
  const total = r2(netQty + wasteAmount);
  return { net: r2(netQty), wasteAmount, total, wastePercent: waste };
}

function specWithWaste(label: string, netQty: number, wastePercent: number, unit: string): string {
  const c = calcWithWaste(netQty, wastePercent);
  return `${label}: ${c.net} ${unit} + ${c.wastePercent}% פחת (${c.wasteAmount} ${unit}) = סה"כ ${c.total} ${unit}`;
}

// ===== Electrical / Lighting engineering calculations =====

export interface ElectricalCalculations {
  // Lighting (engineering recommendation: 200 lux per sqm)
  lightingRecommendedLumens: number;
  lightingRecommendedFixtures: number; // 24W LED fixtures (2000 lm each)
  // Panel location & wiring distances (exact, user-entered)
  panelLocationLabel: string;        // 'פינה' | 'מרכז קיר'
  wiringDistanceMeters: number;      // avg cable length per regular point (sum of exact per-point lengths)
  powerOutletDistanceMeters: number; // avg cable length per power outlet point
  feedDistanceMeters: number;        // distance from external supply to the panel (user-entered)
  mainFeedCableMeters: number;       // supply cable length (+10% waste)
  mainConduitMeters: number;         // supply conduit length (same run)
  // Wiring & derived parts (total = sum of exact per-point cable lengths + waste)
  wagoConnectors: number;
  chainJunctionCount: number;      // שרשור: מספר נקודות שמזינות לפחות נקודה אחת (קופסאות מעבר/שרשור)
  chainWagoConnectors: number;     // מהדקי WAGO נוספים עבור קופסאות המעבר/השרשור (3 לכל נקודה מזינה)
  wiring25mmMeters: number;          // regular sockets (2.5mm²) - sum of exact point lengths
  wiring4mmMeters: number;           // power outlets - dedicated direct line (4mm²) - sum of exact point lengths
  wiring15mmMeters: number;          // lighting & switches (1.5mm²) - sum of exact point lengths
  junctionBoxes: number;
  conduitMeters: number;
  conduitClips: number;
  // Distribution board (MCB/RCD derivation)
  lightingMcbCount: number;          // 10A MCB - 1 per 10 lighting/switch points
  outletMcbCount: number;            // 16A MCB - 1 per 6 regular sockets
  powerMcbCount: number;             // dedicated MCB per power outlet
  mainMcbCount: number;              // 1
  rcdCount: number;                  // 1 RCD 30mA (2 modules)
  totalBreakers: number;
  panelModulesRequired: number;      // total DIN modules incl. RCD
  panelModulesWithReserve: number;   // +20% reserve
  panelSize: number;                 // next standard board size (8/12/16/24)
  panelSizeLabel: string;
}

const ELECTRICAL_ENGINEERING = {
  lumensPerSqm: 200,          // engineering recommendation for a workroom (lux)
  ledFixtureWattage: 24,
  ledFixtureLumens: 2000,
  dropPerPointMeters: 1.5,    // legacy: flat vertical drop (replaced by explicit per-point height + reserve)
  wiringWastePct: 15,
  mainFeedWastePct: 10,
  clipSpacingMeters: 0.4,
  lightingMcbPerPoints: 10,
  outletMcbPerSockets: 6,
  rcdModules: 2,
  mainMcbModules: 1,
  panelReservePct: 20,
  panelSizes: [8, 12, 16, 24],
} as const;

// קידומת שם לכל קטגוריית נקודות פרטניות (ללא ערכי ברירת מחדל נסתרים)
export const ELECTRICAL_POINT_DEFAULTS: Record<ElectricalPointCategory, { labelPrefix: string }> = {
  switches: { labelPrefix: 'מתג' },
  outlets: { labelPrefix: 'שקע' },
  powerOutlets: { labelPrefix: 'שקע כוח' },
  lighting: { labelPrefix: 'גוף תאורה' },
};

// אורך כבל/צנרת לנקודה: סכום ישיר של שדות השורה בלבד (ללא Fallback, ללא ערך מינימלי).
// עבור נקודה בשרשור (Daisy Chain) המוזנת מנקודה אחרת:
//   אורך = מרחק אופקי בין הנקודה למקור + |הפרש גבהים מהרצפה| + סרח בשני הצדדים (של הנקודה ושל המזין)
export function calcPointCableLength(
  distanceMeters: number,
  heightMeters: number,
  reserveMeters: number,
  feedHeightMeters?: number,
  feedReserveMeters?: number
): number {
  const d = Math.max(0, distanceMeters || 0);
  const h = Math.max(0, heightMeters || 0);
  const r = Math.max(0, reserveMeters || 0);
  if (feedHeightMeters !== undefined) {
    const fh = Math.max(0, feedHeightMeters || 0);
    const fr = Math.max(0, feedReserveMeters || 0);
    return r2(d + Math.abs(h - fh) + r + fr);
  }
  return r2(d + h + r);
}

// אורך אפקטיבי לנקודה - אך ורק לפי שדות השורה.
// אם כל השדות הם 0 (או ריקים), או שאין שורת נקודה, התוצאה היא 0.00 מ'.
// pointChain: שורת הנקודה המזינה (לוח/נקודה אחרת בשרשור) - משנה את אורך הכבל ל:
//   מרחק אופקי + |הפרש גבהים| + סרח בשני הצדדים (נקודה ומזין)
export function calcEffectivePointLength(
  point: ElectricalPointDetail | undefined,
  feedPoint?: ElectricalPointDetail | null
): number {
  if (!point) return 0;
  return calcPointCableLength(
    point.distanceMeters,
    point.heightMeters,
    point.reserveMeters,
    feedPoint?.heightMeters,
    feedPoint?.reserveMeters
  );
}

// מרחק אופקי ישר (על רצפת החדר) בין שתי נקודות בקנבס, לפי קנה המידה במטרים
export function calcCanvasHorizontalMeters(ax: number, ay: number, bx: number, by: number): number {
  return r2(Math.max(0, Math.hypot(bx - ax, by - ay)));
}

export interface PerimeterRoute {
  length: number;
  path: { x: number; y: number }[];
}

// ניתוב צמוד-קיר (Perimeter Wall Routing): מצייר/מחשב את קו הכבל לאורך היקף החדר בלבד,
// בזוויות ישרות (90°) מהלוח אל הנקודה. לנקודה בתוך החדר (למשל תאורה על התקרה),
// הכבל רץ על הקיר לנקודה הקרובה ביותר על היקף החדר, וממנה נמתח קו ישר אל הנקודה.
export function calcPerimeterRouteMeters(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  roomL: number,
  roomW: number
): PerimeterRoute {
  const L = Math.max(0.5, roomL || 0);
  const W = Math.max(0.5, roomW || 0);
  const eps = 1e-6;
  const onWall = (x: number, y: number) => x <= eps || x >= L - eps || y <= eps || y >= W - eps;

  const nearestWallPoint = (x: number, y: number): { x: number; y: number } => {
    const dLeft = x;
    const dRight = L - x;
    const dTop = y;
    const dBottom = W - y;
    const min = Math.min(dLeft, dRight, dTop, dBottom);
    if (min === dLeft) return { x: 0, y };
    if (min === dRight) return { x: L, y };
    if (min === dTop) return { x, y: 0 };
    return { x, y: W };
  };

  const wp = onWall(bx, by) ? { x: bx, y: by } : nearestWallPoint(bx, by);
  const ap = onWall(ax, ay) ? { x: ax, y: ay } : nearestWallPoint(ax, ay);

  // מיקום לאורך ההיקף (נגד כיוון השעון החל מהפינה התחתונה-שמאלית)
  const sOf = (x: number, y: number): number => {
    if (y <= eps) return x; // קיר תחתון
    if (x >= L - eps) return L + y; // קיר ימני
    if (y >= W - eps) return 2 * L + W - x; // קיר עליון
    return 2 * L + 2 * W - y; // קיר שמאלי
  };
  const posOf = (s: number): { x: number; y: number } => {
    if (s <= L) return { x: s, y: 0 };
    if (s <= L + W) return { x: L, y: s - L };
    if (s <= 2 * L + W) return { x: 2 * L + W - s, y: W };
    return { x: 0, y: 2 * L + 2 * W - s };
  };

  const P = 2 * (L + W);
  const sA = sOf(ap.x, ap.y);
  const sB = sOf(wp.x, wp.y);
  const ccw = (sB - sA + P) % P <= (sA - sB + P) % P;
  const wallLen = Math.min((sB - sA + P) % P, (sA - sB + P) % P);
  const leadIn = Math.hypot(ax - ap.x, ay - ap.y);
  const drop = Math.hypot(bx - wp.x, by - wp.y);

  // בניית הקו הקווי לאורך ההיקף (פוליליין של נקודות פינה)
  const pts: { x: number; y: number }[] = [];
  pts.push({ x: ax, y: ay });
  if (leadIn > 1e-9) pts.push(ap);
  const corners = [0, L, L + W, 2 * L + W, P];
  let cur = sA;
  const target = ccw ? (sB - sA + P) % P : (sA - sB + P) % P;
  let traveled = 0;
  let guard = 0;
  while (traveled < target - 1e-9 && guard < 8) {
    guard++;
    const cands = ccw
      ? corners.map((c) => (c - cur + P) % P).filter((d) => d > 1e-9)
      : corners.map((c) => (cur - c + P) % P).filter((d) => d > 1e-9);
    const dNext = Math.min(...cands);
    if (dNext >= target - traveled - 1e-9) break;
    const next = ccw ? (cur + dNext) % P : (cur - dNext + P) % P;
    pts.push(posOf(next));
    traveled += dNext;
    cur = next;
  }
  if (wallLen > 1e-9) pts.push(posOf(sB));
  if (drop > 1e-9) pts.push({ x: bx, y: by });

  return { length: r2(leadIn + wallLen + drop), path: pts };
}

export function calculateElectricalRequirements(project: Project): ElectricalCalculations {
  const areas = calculateAreas(project);
  const elec = project.electrical;

  const switches = elec?.switchesCount ?? 0;
  const regularOutlets = elec?.powerOutletsCount ?? 0;
  const powerOutlets = elec?.heavyPowerOutletsCount ?? 0;
  const lightingPoints = elec?.lightingPointsCount ?? 0;

  // Panel location affects the average wall run per point (no more room-perimeter average)
  const panelLocation = elec?.panelLocation === 'wall_center' ? 'wall_center' : 'corner';

  const pointDetails = elec?.pointDetails;

  // מפת שורות לפי מזהה - לצורך איתור שורת הנקודה המזינה בכל שרשור (Daisy Chain)
  const rowById = new Map<string, ElectricalPointDetail>();
  (['switches', 'outlets', 'powerOutlets', 'lighting'] as ElectricalPointCategory[]).forEach((cat) => {
    (pointDetails?.[cat] || []).forEach((row) => rowById.set(row.id, row));
  });
  const feedRowOf = (row: ElectricalPointDetail): ElectricalPointDetail | undefined =>
    row.fedFrom ? rowById.get(row.fedFrom) : undefined;

  // אורך כבל/צנרת מדויק לכל נקודה פרטנית = סכום ישיר של שדות השורה בלבד (אין Fallback).
  // נקודה בשרשור: מרחק אופקי לנקודה המזינה + |הפרש גבהים| + סרח בשני הצדדים.
  const buildPointLengths = (cat: ElectricalPointCategory, count: number): number[] => {
    const details = pointDetails?.[cat];
    const lengths: number[] = [];
    for (let i = 0; i < count; i++) {
      const row = details?.[i];
      lengths.push(row ? calcEffectivePointLength(row, feedRowOf(row)) : 0);
    }
    return lengths;
  };

  const regularLengths = buildPointLengths('outlets', regularOutlets);
  const powerLengths = buildPointLengths('powerOutlets', powerOutlets);
  const switchLengths = buildPointLengths('switches', switches);
  const lightLengths = buildPointLengths('lighting', lightingPoints);
  const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const wiring25mmNet = sumArr(regularLengths);
  const wiring4mmNet = sumArr(powerLengths);
  const wiring15mmNet = sumArr(switchLengths) + sumArr(lightLengths);

  const wiringDistanceMeters = regularOutlets > 0 ? r2(wiring25mmNet / regularOutlets) : 0;
  const powerOutletDistanceMeters = powerOutlets > 0 ? r2(wiring4mmNet / powerOutlets) : 0;

  const feedDistanceMeters = Math.max(0, elec?.feedDistanceMeters ?? 0);
  const mainFeedCableMeters = feedDistanceMeters > 0
    ? r2(feedDistanceMeters * (1 + ELECTRICAL_ENGINEERING.mainFeedWastePct / 100))
    : 0;
  const mainConduitMeters = mainFeedCableMeters;

  const floorArea = areas.floorArea;
  const lightingRecommendedLumens = Math.round(floorArea * ELECTRICAL_ENGINEERING.lumensPerSqm);
  const lightingRecommendedFixtures = Math.max(0, Math.ceil(lightingRecommendedLumens / ELECTRICAL_ENGINEERING.ledFixtureLumens));

  const totalOutletPoints = regularOutlets + powerOutlets;
  const totalLightPoints = switches + lightingPoints;

  const wagoConnectors = (regularOutlets * 3) + (totalLightPoints * 3) + 8;

  // שרשור (Daisy Chain): כל נקודה שמזינה לפחות נקודה אחת נחשבת "קופסת מעבר/שרשור",
  // לה מתווסף סט מהדקים (3 WAGO) לחיבור הכבל העובר + ההסתעפות לנקודה הבאה
  const feedingIds = new Set<string>();
  (['switches', 'outlets', 'powerOutlets', 'lighting'] as ElectricalPointCategory[]).forEach((cat) => {
    (pointDetails?.[cat] || []).forEach((row) => {
      if (row.fedFrom) feedingIds.add(row.fedFrom);
    });
  });
  const chainJunctionCount = feedingIds.size;
  const chainWagoConnectors = chainJunctionCount * 3;
  const wiring25mmMeters = r2(wiring25mmNet * (1 + ELECTRICAL_ENGINEERING.wiringWastePct / 100));
  const wiring4mmMeters = r2(wiring4mmNet * (1 + ELECTRICAL_ENGINEERING.wiringWastePct / 100));
  const wiring15mmMeters = r2(wiring15mmNet * (1 + ELECTRICAL_ENGINEERING.wiringWastePct / 100));
  const junctionBoxes = regularOutlets + powerOutlets + switches;
  const totalPoints = totalOutletPoints + totalLightPoints;
  // סה"כ הצנרת = סכום האורכים המדויקים של כל הנקודות הפרטניות + כבל ההזנה הראשית
  const conduitMeters = r2(wiring25mmNet + wiring4mmNet + wiring15mmNet + mainFeedCableMeters);
  const conduitClips = Math.ceil(conduitMeters / ELECTRICAL_ENGINEERING.clipSpacingMeters);

  const lightingMcbCount = Math.ceil(totalLightPoints / ELECTRICAL_ENGINEERING.lightingMcbPerPoints);
  const outletMcbCount = Math.ceil(regularOutlets / ELECTRICAL_ENGINEERING.outletMcbPerSockets);
  const powerMcbCount = powerOutlets; // dedicated MCB per power outlet
  const mainMcbCount = 1;
  const rcdCount = 1;
  const totalBreakers = lightingMcbCount + outletMcbCount + powerMcbCount + mainMcbCount;

  const panelModulesRequired = totalBreakers + rcdCount * ELECTRICAL_ENGINEERING.rcdModules;
  const panelModulesWithReserve = Math.ceil(panelModulesRequired * (1 + ELECTRICAL_ENGINEERING.panelReservePct / 100));

  let panelSize = 24;
  for (const size of ELECTRICAL_ENGINEERING.panelSizes) {
    if (size >= panelModulesWithReserve) {
      panelSize = size;
      break;
    }
  }

  return {
    lightingRecommendedLumens,
    lightingRecommendedFixtures,
    panelLocationLabel: panelLocation === 'wall_center' ? 'מרכז קיר' : 'פינה',
    wiringDistanceMeters,
    powerOutletDistanceMeters,
    feedDistanceMeters,
    mainFeedCableMeters,
    mainConduitMeters,
    wagoConnectors,
    chainJunctionCount,
    chainWagoConnectors,
    wiring25mmMeters,
    wiring4mmMeters,
    wiring15mmMeters,
    junctionBoxes,
    conduitMeters,
    conduitClips,
    lightingMcbCount,
    outletMcbCount,
    powerMcbCount,
    mainMcbCount,
    rcdCount,
    totalBreakers,
    panelModulesRequired,
    panelModulesWithReserve,
    panelSize,
    panelSizeLabel: `${panelSize} מקומות`,
  };
}

export function calculateBOM(project: Project, catalog: MaterialCatalogItem[], defaultWorkHours?: number, defaultHourlyRate?: number): BOMItem[] {
  const areas = calculateAreas(project);
  const struct = calculateStructuralMeters(project);
  const items: BOMItem[] = [];

  const materialCatalog = catalog.filter((c) => c.type !== 'labor' && c.itemType !== 'labor');

  const resolveCatalogItem = (selectedId: string | undefined, subCategory: string, category: MaterialCategory): MaterialCatalogItem | null => {
    if (selectedId && selectedId !== 'none') {
      const direct = materialCatalog.find((c) => c.id === selectedId);
      if (direct) return direct;
      const subMatch = materialCatalog.find((c) => c.subCategory === selectedId || c.id.includes(selectedId));
      if (subMatch) return subMatch;
    }
    const bySub = materialCatalog.find((c) => c.subCategory === subCategory);
    if (bySub) return bySub;
    const byCat = materialCatalog.find((c) => c.category === category);
    if (byCat) return byCat;
    return null;
  };

  const toggles = {
    includeBottomStructure: project.sectionToggles?.includeBottomStructure ?? true,
    includeWheels: project.sectionToggles?.includeWheels ?? true,
    includeFloor: project.sectionToggles?.includeFloor ?? true,
    includeWallsAndRoof: project.sectionToggles?.includeWallsAndRoof ?? true,
    includeInteriorCladding: project.sectionToggles?.includeInteriorCladding ?? true,
    includeElectrical: project.sectionToggles?.includeElectrical ?? true,
    includeHVAC: project.sectionToggles?.includeHVAC ?? true,
    includeExteriorCladding: project.sectionToggles?.includeExteriorCladding ?? true,
  };

  const wallPerimeter = 2 * (project.dimensions.length + project.dimensions.width);
  const getWaste = (item: MaterialCatalogItem): number => item.wasteFactorPercent ?? 10;

  // 1. Bottom Construction Steel
  if (toggles.includeBottomStructure) {
    const item = resolveCatalogItem(project.construction?.profileSpec, 'construction_profile', 'construction');
    if (item) {
      const unit = item.unit || 'מטר רץ';

      if (unit === 'מ"ר') {
        const area = areas.floorArea;
        const price = item.defaultUnitPrice || 0;
        items.push({
          id: 'bom_construction_sqm',
          category: 'construction',
          categoryLabelHeb: CATEGORY_LABELS.construction,
          name: item.name,
          specification: `שטח רצפה: ${area} מ"ר × ₪${price} למ"ר = ₪${r2(area * price)}`,
          quantity: area,
          unit: 'מ"ר',
          unitPrice: price,
          totalPrice: r2(area * price),
        });
      } else if (unit === 'לפי שעה' || unit === 'יומית') {
        const hours = project.constructionWorkHours ?? defaultWorkHours ?? 0;
        const rate = project.constructionHourlyRate ?? defaultHourlyRate ?? item.defaultUnitPrice ?? 0;
        const total = hours * rate;
        items.push({
          id: 'bom_construction_labor',
          category: 'construction',
          categoryLabelHeb: CATEGORY_LABELS.construction,
          name: item.name,
          specification: `${hours} ${unit === 'יומית' ? 'ימים' : 'שעות'} × ₪${rate} = ₪${r2(total)}`,
          quantity: hours,
          unit: unit === 'יומית' ? 'ימים' : 'שעות',
          unitPrice: rate,
          totalPrice: r2(total),
        });
      } else {
        // Default: linear meter
        const wastePct = getWaste(item);
        const steelNet = struct.floorSteelNet;
        const steelWaste = struct.floorSteelWaste;
        const steelTotal = struct.floorSteelTotal;
        const price = item.defaultUnitPrice || 0;
        items.push({
          id: 'bom_construction_profiles',
          category: 'construction',
          categoryLabelHeb: CATEGORY_LABELS.construction,
          name: item.name,
          specification: `כמות נטו: ${steelNet} מטר רץ + ${wastePct}% פחת (${steelWaste} מטר רץ) = סה"כ ${steelTotal} מטר רץ`,
          quantity: steelTotal,
          unit: item.unit || 'מטר רץ',
          unitPrice: price,
          totalPrice: r2(steelTotal * price),
        });
      }
    }
  }

  // 2. Floor Substrate & Top Floor Covering
  if (toggles.includeFloor) {
    const baseItem = resolveCatalogItem(project.floor?.basePlateType, 'floor_base', 'floor');
    if (baseItem) {
      const wastePct = getWaste(baseItem);
      const c = calcWithWaste(areas.floorArea, wastePct);
      const price = baseItem.defaultUnitPrice || 0;
      items.push({
        id: 'bom_floor_base',
        category: 'floor',
        categoryLabelHeb: CATEGORY_LABELS.floor,
        name: baseItem.name,
        specification: specWithWaste('שטח נטו', areas.floorArea, wastePct, 'מ"ר'),
        quantity: c.total,
        unit: baseItem.unit || 'מ"ר',
        unitPrice: price,
        totalPrice: r2(c.total * price),
      });
    }

    if (project.floor?.topCovering && project.floor.topCovering !== 'none') {
      const topItem = resolveCatalogItem(project.floor.topCovering, 'floor_top', 'floor');
      if (topItem) {
        const wastePct = getWaste(topItem);
        const c = calcWithWaste(areas.floorArea, wastePct);
        const price = topItem.defaultUnitPrice || 0;
        items.push({
          id: 'bom_floor_top',
          category: 'floor',
          categoryLabelHeb: CATEGORY_LABELS.floor,
          name: topItem.name,
          specification: specWithWaste('שטח נטו', areas.floorArea, wastePct, 'מ"ר'),
          quantity: c.total,
          unit: topItem.unit || 'מ"ר',
          unitPrice: price,
          totalPrice: r2(c.total * price),
        });
      }
    }
  }

  // 3. Room Structure
  if (toggles.includeWallsAndRoof) {
    // --- 3a. Wall Panels (פנאל מבודד קיר 5 ס"מ) ---
    const panelItem = resolveCatalogItem(project.wallRoof?.panelType, 'wall_panel', 'panels');
    if (panelItem) {
      const wastePct = getWaste(panelItem);
      const c = calcWithWaste(areas.wallAreaNet, wastePct);
      const price = panelItem.defaultUnitPrice || 0;
      items.push({
        id: 'bom_panels_wall',
        category: 'panels',
        categoryLabelHeb: CATEGORY_LABELS.panels,
        name: `פנאל מבודד קיר - ${panelItem.name}`,
        specification: `שטח קירות נטו: ${areas.wallAreaNet} מ"ר (ברוטו ${areas.wallAreaGross} מ"ר פחות פתחים ${areas.openingsArea} מ"ר) + ${wastePct}% פחת (${c.wasteAmount} מ"ר) = סה"כ ${c.total} מ"ר`,
        quantity: c.total,
        unit: panelItem.unit || 'מ"ר',
        unitPrice: price,
        totalPrice: r2(c.total * price),
      });
    }

    // --- 3b. Roof Panels (פנאל איסכורית מבודד לגג) ---
    const roofPanelItem = resolveCatalogItem(project.wallRoof?.roofPanelType || project.wallRoof?.panelType, 'wall_panel', 'panels');
    if (roofPanelItem) {
      const wastePct = getWaste(roofPanelItem);
      const overhangCm = project.wallRoof?.roofOverhangCm ?? 0;
      const roofAreaNet = areas.roofAreaWithOverhang;
      const c = calcWithWaste(roofAreaNet, wastePct);
      const price = roofPanelItem.defaultUnitPrice || 0;
      const overhangDesc = overhangCm > 0 ? ` (כולל בלט גג ${overhangCm} ס"מ מכל צד)` : '';
      items.push({
        id: 'bom_panels_roof',
        category: 'panels',
        categoryLabelHeb: CATEGORY_LABELS.panels,
        name: `פנאל איסכורית מבודד לגג - ${roofPanelItem.name}`,
        specification: `שטח גג נטו: ${roofAreaNet} מ"ר${overhangDesc} + ${wastePct}% פחת (${c.wasteAmount} מ"ר) = סה"כ ${c.total} מ"ר. מידות גג עם בלט: ${project.dimensions.length + 2 * overhangCm / 100}×${project.dimensions.width + 2 * overhangCm / 100} מטר`,
        quantity: c.total,
        unit: roofPanelItem.unit || 'מ"ר',
        unitPrice: price,
        totalPrice: r2(c.total * price),
      });
    }

    if (project.wallRoof?.panelTrackType && project.wallRoof.panelTrackType !== 'none') {
      const trackItem = resolveCatalogItem(project.wallRoof.panelTrackType, 'panel_track', 'panels');
      if (trackItem) {
        const wastePct = getWaste(trackItem);
        // מסלול היקף לפנל מבודד: היקף רצפה + היקף תקרה (2×היקף) + מסלול כפול בכל 4 פינות אנכיות (4×גובה×2)
        const tracksMeters = r2(areas.perimeter * 2 + project.dimensions.height * 8);
        const wasteAmount = r2(tracksMeters * (wastePct / 100));
        const quantityTotal = r2(tracksMeters + wasteAmount);
        const specificationText = `כמות נטו: ${tracksMeters} מטר רץ = (היקף ${areas.perimeter} מטר × 2) + (גובה ${project.dimensions.height} מטר × 8) - מסלול כפול בכל 4 הפינות ליצירת חיבור L + ${wastePct}% פחת (${wasteAmount} מטר רץ) = סה"כ ${quantityTotal} מטר רץ`;

        const price = trackItem.defaultUnitPrice || 0;
        items.push({
          id: 'bom_panel_tracks',
          category: 'panels',
          categoryLabelHeb: CATEGORY_LABELS.panels,
          name: trackItem.name,
          specification: specificationText,
          quantity: quantityTotal,
          unit: trackItem.unit || 'מטר רץ',
          unitPrice: price,
          totalPrice: r2(quantityTotal * price),
        });
      }
    }

    if (project.openings && Array.isArray(project.openings)) {
      project.openings.forEach((op) => {
        const opItem = resolveCatalogItem(op.doorProfile || op.id, 'opening_item', 'openings');
        const name = opItem ? opItem.name : op.title;
        const price = opItem ? opItem.defaultUnitPrice : op.pricePerUnit || 0;
        const unit = opItem ? opItem.unit : 'יחידה';
        const qty = op.quantity || 1;
        items.push({
          id: `bom_opening_${op.id}`,
          category: 'openings',
          categoryLabelHeb: CATEGORY_LABELS.openings,
          name,
          specification: `${op.widthCm || 100}x${op.heightCm || 100} ס"מ`,
          quantity: qty,
          unit,
          unitPrice: price,
          totalPrice: r2(qty * price),
        });
      });
    }
  }

  // 4. Interior Cladding
  if (toggles.includeInteriorCladding) {
    if (project.wallRoof?.polymerCladding?.interiorCladdingType &&
        project.wallRoof.polymerCladding.interiorCladdingType !== 'none' &&
        project.wallRoof.polymerCladding.interiorCladdingType !== 'exposed_panel') {
      const intItem = resolveCatalogItem(project.wallRoof.polymerCladding.interiorCladdingType, 'interior_cladding', 'wall_cladding');
      if (intItem) {
        const hMode = project.wallRoof.polymerCladding.heightMode || 'full';
        const roomH = project.dimensions.height;
        let cladHeight = roomH;
        let heightDesc = 'עד התקרה';
        if (hMode === 'half') { cladHeight = r2(roomH / 2); heightDesc = `חצי גובה (${cladHeight} מטר)`; }
        else if (hMode === 'custom') { cladHeight = (project.wallRoof.polymerCladding.customHeightCm || 120) / 100; heightDesc = `גובה מותאם אישית ${project.wallRoof.polymerCladding.customHeightCm} ס"מ`; }

        const claddingAreaNeeded = r2(wallPerimeter * cladHeight);
        const wastePct = getWaste(intItem);
        const c = calcWithWaste(claddingAreaNeeded, wastePct);
        const price = intItem.defaultUnitPrice || 0;
        items.push({
          id: 'bom_interior_cladding',
          category: 'panels',
          categoryLabelHeb: CATEGORY_LABELS.panels,
          name: intItem.name,
          specification: `חיפוי קירות פנימי, ${heightDesc} | ${specWithWaste('שטח נטו', claddingAreaNeeded, wastePct, 'מ"ר')}`,
          quantity: c.total,
          unit: intItem.unit || 'מ"ר',
          unitPrice: price,
          totalPrice: r2(c.total * price),
        });
      }
    }
  }

  // 5. Wheels
  if (toggles.includeWheels) {
    const wheelItem = resolveCatalogItem(project.wheels?.wheelType, 'wheel_type', 'wheels');
    if (wheelItem) {
      const qty = project.wheels?.quantity || 4;
      const price = project.wheels?.unitPrice || wheelItem.defaultUnitPrice || 0;
      const estWeight = calculateEstimatedWeight(project);
      items.push({
        id: 'bom_wheels',
        category: 'wheels',
        categoryLabelHeb: CATEGORY_LABELS.wheels,
        name: wheelItem.name,
        specification: `גלגלים תעשייתיים לעומס כבד (כושר נשיאה: ${estWeight.effectiveLoadPerWheelKg} ק"ג לגלגל, לפי משקל מבנה כולל ${estWeight.totalGrossWeightKg} ק"ג)`,
        quantity: qty,
        unit: wheelItem.unit || 'יחידה',
        unitPrice: price,
        totalPrice: r2(qty * price),
      });
    }
  }

  // 6. Electrical & Lighting (engineering derivation)
  if (toggles.includeElectrical) {
    const elecCalc = calculateElectricalRequirements(project);
    const elecCounts = {
      switches: project.electrical?.switchesCount ?? 0,
      regularOutlets: project.electrical?.powerOutletsCount ?? 0,
      powerOutlets: project.electrical?.heavyPowerOutletsCount ?? 0,
      lighting: project.electrical?.lightingPointsCount ?? 0,
    };

    const findElecItem = (pred: (c: MaterialCatalogItem) => boolean): MaterialCatalogItem | undefined =>
      materialCatalog.find((c) => (c.category === 'electrical' || c.subCategory === 'electrical' || c.subCategory === 'electrical_internal' || c.subCategory === 'electrical_external') && pred(c));

    const pushElecItem = (id: string, name: string, specification: string, qty: number, unit: string, pred: (c: MaterialCatalogItem) => boolean) => {
      if (qty <= 0) return;
      const item = findElecItem(pred);
      const price = item?.defaultUnitPrice || 0;
      items.push({ id, category: 'electrical', categoryLabelHeb: CATEGORY_LABELS.electrical, name: item ? item.name : name, specification, quantity: qty, unit: item?.unit || unit, unitPrice: price, totalPrice: r2(qty * price) });
    };

    // Points (counted quantities)
    pushElecItem('bom_elec_switches', 'מתגים', `מתגים חד-קוטביים (${elecCounts.switches} יח')`, elecCounts.switches, 'יחידה', (c) => c.name.includes('מתג'));
    pushElecItem('bom_elec_outlets', 'שקעי חשמל רגילים', `שקעים סטנדרטיים 16A (${elecCounts.regularOutlets} יח')`, elecCounts.regularOutlets, 'יחידה', (c) => c.name.includes('שקע') && !c.name.includes('כוח'));
    pushElecItem('bom_elec_power_outlets', 'שקעי כוח', `שקעי כוח במעגל ייעודי ללוח (${elecCounts.powerOutlets} יח')`, elecCounts.powerOutlets, 'יחידה', (c) => c.name.includes('כוח') || c.name.includes('16A') || c.name.includes('20A'));
    pushElecItem('bom_elec_lighting', 'גופי תאורה LED', `גופי תאורה LED 24W (${elecCounts.lighting} יח')`, elecCounts.lighting, 'יחידה', (c) => c.name.includes('תאורה') || c.name.includes('LED') || c.name.includes('מאור'));

    // Distribution board: MCBs + RCD
    pushElecItem('bom_elec_mcb_lighting', 'מאז"ר תאורה 10A', `1 יח' לכל ${ELECTRICAL_ENGINEERING.lightingMcbPerPoints} נקודות תאורה/מתג (${elecCalc.lightingMcbCount} יח')`, elecCalc.lightingMcbCount, 'יחידה', (c) => c.name.includes('10A') || c.name.includes('תאורה'));
    pushElecItem('bom_elec_mcb_outlets', 'מאז"ר שקעים 16A', `1 יח' לכל ${ELECTRICAL_ENGINEERING.outletMcbPerSockets} שקעים רגילים (${elecCalc.outletMcbCount} יח')`, elecCalc.outletMcbCount, 'יחידה', (c) => c.name.includes('16A'));
    pushElecItem('bom_elec_mcb_power', 'מאז"ר ייעודי שקעי כוח 16A/20A', 'מאז"ר ייעודי לכל שקע כוח', elecCalc.powerMcbCount, 'יחידה', (c) => c.name.includes('20A') || c.name.includes('כוח'));
    pushElecItem('bom_elec_main_mcb', 'מאז"ר ראשי', 'מפסק ראשי ללוח', elecCalc.mainMcbCount, 'יחידה', (c) => c.name.includes('ראשי'));
    pushElecItem('bom_elec_rcd', 'מפסק פחת 30mA', 'מפסק מגן דו-קוטבי 30mA', elecCalc.rcdCount, 'יחידה', (c) => c.name.includes('פחת') || c.name.includes('מגן'));

    // Panel cabinet (sized from derived modules)
    const panelSize = String(elecCalc.panelSize);
    let panelItem = materialCatalog.find((c) => (c.category === 'electrical' || c.subCategory === 'electrical') && (c.name.includes(panelSize) || c.name.includes(`${elecCalc.panelSize} מקומות`)));
    if (!panelItem && project.electrical?.mainPanelType && project.electrical.mainPanelType !== 'none') {
      panelItem = materialCatalog.find((c) => c.id === project.electrical.mainPanelType);
    }
    const panelPrice = panelItem?.defaultUnitPrice || 0;
    items.push({
      id: 'bom_elec_panel',
      category: 'electrical',
      categoryLabelHeb: CATEGORY_LABELS.electrical,
      name: panelItem ? panelItem.name : `ארון חשמל ${elecCalc.panelSizeLabel}`,
      specification: `ארון חשמל ${elecCalc.panelSizeLabel}: נדרש ${elecCalc.panelModulesRequired} בלוקים (${elecCalc.totalBreakers} מאז"רים + מפסק פחת) + 20% רזרבה = ${elecCalc.panelModulesWithReserve} בלוקים`,
      quantity: 1,
      unit: panelItem?.unit || 'יחידה',
      unitPrice: panelPrice,
      totalPrice: panelPrice,
    });

    // Main feed (distance from external supply to the panel)
    pushElecItem('bom_elec_main_feed_cable', 'כבל הזנה ראשית', `מהזנה חיצונית לארון: ${elecCalc.feedDistanceMeters} מ' + 10% פחת = ${elecCalc.mainFeedCableMeters} מ'`, elecCalc.mainFeedCableMeters, 'מטר', (c) => c.name.includes('הזנה') || c.name.includes('3×') || c.name.includes('3x') || c.name.includes('כבל'));
    pushElecItem('bom_elec_main_conduit', 'צנרת הזנה ראשית', `צנרת מובילה מההזנה אל ארון החשמל = ${elecCalc.mainConduitMeters} מ'`, elecCalc.mainConduitMeters, 'מטר', (c) => c.name.includes('צינור') || c.name.includes('שרשורי'));

    // Small parts (derived shopping list - exact distances)
    pushElecItem('bom_elec_wago', 'מהדקים מהירים WAGO / שוקולדים', `שקעים×3 + (מתגים+תאורה)×3 + 8 לחיבורי לוח = ${elecCalc.wagoConnectors}`, elecCalc.wagoConnectors, 'יחידה', (c) => c.name.includes('WAGO') || c.name.includes('שוקולד') || c.name.includes('מהדק'));
    if (elecCalc.chainJunctionCount > 0) {
      pushElecItem('bom_elec_wago_chain', 'מהדקי WAGO לקופסת מעבר/שרשור', `שרשור (Daisy Chain): ${elecCalc.chainJunctionCount} נקודות מזינות × 3 מהדקים = ${elecCalc.chainWagoConnectors}`, elecCalc.chainWagoConnectors, 'יחידה', (c) => c.name.includes('WAGO') || c.name.includes('שוקולד') || c.name.includes('מהדק'));
    }
    pushElecItem('bom_elec_wiring25', 'חיווט 2.5 מ"מ (שקעים רגילים)', `סכום אורכי ${elecCounts.regularOutlets} שקעים פרטניים (מרחק+גובה+סרח) + 15% פחת = ${elecCalc.wiring25mmMeters} מ'`, elecCalc.wiring25mmMeters, 'מטר', (c) => c.name.includes('2.5') || c.name.includes('2.5 מ"מ'));
    pushElecItem('bom_elec_wiring4', 'חיווט 4 מ"מ (שקעי כוח - קו ישיר)', `קו נפרד וישיר לכל שקע כוח: סכום אורכי ${elecCounts.powerOutlets} שקעי כוח פרטניים (מרחק+גובה+סרח) + 15% פחת = ${elecCalc.wiring4mmMeters} מ'`, elecCalc.wiring4mmMeters, 'מטר', (c) => c.name.includes('4') && c.name.includes('מ"מ'));
    pushElecItem('bom_elec_wiring15', 'חיווט 1.5 מ"מ (תאורה ומתגים)', `סכום אורכי ${elecCounts.switches + elecCounts.lighting} נקודות תאורה/מתגים פרטניות (מרחק+גובה+סרח) + 15% פחת = ${elecCalc.wiring15mmMeters} מ'`, elecCalc.wiring15mmMeters, 'מטר', (c) => c.name.includes('1.5') || c.name.includes('1.5 מ"מ'));
    pushElecItem('bom_elec_boxes', 'קופסאות חיבור (גביס/הרכבה)', `קופסה לכל שקע/מתג = ${elecCalc.junctionBoxes}`, elecCalc.junctionBoxes, 'יחידה', (c) => c.name.includes('גביס') || c.name.includes('קופסה'));
    pushElecItem('bom_elec_conduit', 'צינור חשמל (שרשורי/PVC)', `צנרת = סכום אורכי כל הנקודות הפרטניות (מרחק+גובה+סרח) + הזנה ראשית = ${elecCalc.conduitMeters} מ'`, elecCalc.conduitMeters, 'מטר', (c) => c.name.includes('צינור') || c.name.includes('שרשורי'));
    pushElecItem('bom_elec_clips', 'תפסנים לקיבוע צינור', `תפסן כל ${Math.round(ELECTRICAL_ENGINEERING.clipSpacingMeters * 100)} ס"מ = ${elecCalc.conduitClips}`, elecCalc.conduitClips, 'יחידה', (c) => c.name.includes('תפסן') || c.name.includes('קליפס'));
  }

  // 7. HVAC
  if (toggles.includeHVAC) {
    const ac = project.hvac?.airConditioner || project.electrical?.airConditioner;
    if (ac && ac !== 'none') {
      const acItem = resolveCatalogItem(ac, 'ac_unit', 'hvac');
      if (acItem) {
        const price = acItem.defaultUnitPrice || 0;
        items.push({ id: 'bom_ac_unit', category: 'electrical', categoryLabelHeb: CATEGORY_LABELS.electrical, name: acItem.name, specification: 'יחידת מיזוג אוויר', quantity: 1, unit: acItem.unit || 'יחידה', unitPrice: price, totalPrice: price });
      }
    }
    if (project.hvac?.venta?.enabled) {
      const ventaItem = resolveCatalogItem(project.hvac.venta.itemId, 'ventilation', 'hvac');
      if (ventaItem) {
        const qty = project.hvac.venta.quantity || 1;
        const price = ventaItem.defaultUnitPrice || 0;
        items.push({ id: 'bom_venta', category: 'electrical', categoryLabelHeb: CATEGORY_LABELS.electrical, name: ventaItem.name, specification: 'ונטה למבנה', quantity: qty, unit: ventaItem.unit || 'יחידה', unitPrice: price, totalPrice: r2(qty * price) });
      }
    }
  }

  // 8. Exterior Cladding
  if (toggles.includeExteriorCladding) {
    if (project.wallRoof?.claddingExterior && project.wallRoof.claddingExterior !== 'none') {
      const extItem = resolveCatalogItem(project.wallRoof.claddingExterior, 'exterior_cladding', 'wall_cladding');
      if (extItem) {
        const wastePct = getWaste(extItem);
        const c = calcWithWaste(areas.wallAreaNet, wastePct);
        const price = extItem.defaultUnitPrice || 0;
        items.push({ id: 'bom_cladding_ext',           category: 'wall_cladding',
          categoryLabelHeb: CATEGORY_LABELS.wall_cladding, name: extItem.name, specification: specWithWaste('שטח נטו', areas.wallAreaNet, wastePct, 'מ"ר'), quantity: c.total, unit: extItem.unit || 'מ"ר', unitPrice: price, totalPrice: r2(c.total * price) });
      }
    }
  }

  // 9. Hardware
  const hardwareItems = materialCatalog.filter((c) => c.category === 'hardware' || c.subCategory === 'hardware' || c.subCategory === 'fasteners' || c.subCategory === 'sealant');
  hardwareItems.forEach((hw, idx) => {
    const wastePct = getWaste(hw);
    const c = calcWithWaste(1, wastePct);
    const price = hw.defaultUnitPrice || 0;
    items.push({ id: `bom_hardware_${hw.id}_${idx}`, category: 'hardware', categoryLabelHeb: CATEGORY_LABELS.hardware, name: hw.name, specification: hw.notes || 'חומרי עזר, פרזול ואיטום היקפי', quantity: c.total, unit: hw.unit || 'יחידה', unitPrice: price, totalPrice: r2(c.total * price) });
  });

  // 10. Per-step manual additions (custom items) & catalog products
  items.push(...calculateStepAddOns(project, materialCatalog));

  return items;
}

// Manual additions (custom items) & catalog products added per wizard step.
// Automatically included in the BOM, final project price and saved documents.
export function calculateStepAddOns(project: Project, catalog: MaterialCatalogItem[]): BOMItem[] {
  const materialCatalog = catalog.filter((c) => c.type !== 'labor' && c.itemType !== 'labor');
  const items: BOMItem[] = [];

  const toggles = {
    includeBottomStructure: project.sectionToggles?.includeBottomStructure ?? true,
    includeWheels: project.sectionToggles?.includeWheels ?? true,
    includeFloor: project.sectionToggles?.includeFloor ?? true,
    includeWallsAndRoof: project.sectionToggles?.includeWallsAndRoof ?? true,
    includeInteriorCladding: project.sectionToggles?.includeInteriorCladding ?? true,
    includeElectrical: project.sectionToggles?.includeElectrical ?? true,
    includeHVAC: project.sectionToggles?.includeHVAC ?? true,
    includeExteriorCladding: project.sectionToggles?.includeExteriorCladding ?? true,
  };

  const stepIncluded = (step: number): boolean => {
    const key = STEP_TOGGLE_KEYS[step];
    return key ? !!toggles[key as keyof typeof toggles] : true;
  };

  Object.entries(project.customItems || {}).forEach(([stepKey, customList]) => {
    const step = parseInt(stepKey, 10);
    const cat = STEP_CATEGORY[step];
    if (!cat || !stepIncluded(step)) return;
    (customList || []).forEach((ci) => {
      const qty = ci.quantity || 0;
      const price = ci.unitPrice || 0;
      if (!ci.description || qty <= 0 || price <= 0) return;
      items.push({
        id: `bom_custom_${ci.id}`,
        category: cat,
        categoryLabelHeb: CATEGORY_LABELS[cat],
        name: ci.description,
        specification: 'תוספת ידנית שהוזנה בשלב התכנון',
        quantity: qty,
        unit: 'יחידה',
        unitPrice: price,
        totalPrice: r2(qty * price),
      });
    });
  });

  Object.entries(project.catalogAddOns || {}).forEach(([stepKey, addOnList]) => {
    const step = parseInt(stepKey, 10);
    const cat = STEP_CATEGORY[step];
    if (!cat || !stepIncluded(step)) return;
    (addOnList || []).forEach((addOn) => {
      const catItem = materialCatalog.find((c) => c.id === addOn.catalogItemId);
      if (!catItem) return;
      const qty = addOn.quantity || 0;
      if (qty <= 0) return;
      const price = catItem.defaultUnitPrice || 0;
      items.push({
        id: `bom_addon_${addOn.id}`,
        category: cat,
        categoryLabelHeb: CATEGORY_LABELS[cat],
        name: catItem.name,
        specification: 'מוצר שנוסף מהמחירון בשלב התכנון',
        quantity: qty,
        unit: catItem.unit || 'יחידה',
        unitPrice: price,
        totalPrice: r2(qty * price),
      });
    });
  });

  return items;
}

export function calculateClientQuote(project: Project, catalog: MaterialCatalogItem[], globalSettings?: GlobalPricingSettings): ClientQuoteCalculations {
  const materialCatalog = catalog.filter((c) => c.type !== 'labor' && c.itemType !== 'labor');
  const bom = calculateBOM(project, materialCatalog, globalSettings?.defaultConstructionWorkHours, globalSettings?.defaultConstructionHourlyRate);
  const materialsCost = bom.reduce((sum, item) => sum + item.totalPrice, 0);

  const areas = calculateAreas(project);
  const totalElecPoints = (project.electrical?.powerOutletsCount ?? 0) + (project.electrical?.lightingPointsCount ?? 0) + (project.electrical?.switchesCount ?? 0) + (project.electrical?.heavyPowerOutletsCount ?? 0);
  const totalOpeningsCount = project.openings ? project.openings.reduce((sum, op) => sum + (op.quantity || 1), 0) : 0;

  const toggles = {
    includeBottomStructure: project.sectionToggles?.includeBottomStructure ?? true,
    includeWheels: project.sectionToggles?.includeWheels ?? true,
    includeFloor: project.sectionToggles?.includeFloor ?? true,
    includeWallsAndRoof: project.sectionToggles?.includeWallsAndRoof ?? true,
    includeInteriorCladding: project.sectionToggles?.includeInteriorCladding ?? true,
    includeElectrical: project.sectionToggles?.includeElectrical ?? true,
    includeHVAC: project.sectionToggles?.includeHVAC ?? true,
    includeExteriorCladding: project.sectionToggles?.includeExteriorCladding ?? true,
  };

  const laborCatalogItems = catalog.filter((c) => c.type === 'labor' || c.itemType === 'labor');
  const laborBreakdown: LaborLineItem[] = [];

  if (laborCatalogItems.length > 0) {
    laborCatalogItems.forEach((item) => {
      const cat = item.category as string;
      const name = item.name || '';
      if ((cat === 'construction' || name.includes('קונסטרוקציה') || name.includes('מסגרות') || name.includes('שלד')) && !toggles.includeBottomStructure) return;
      if ((cat === 'floor' || name.includes('רצפה')) && !toggles.includeFloor) return;
      if ((cat === 'panels' || cat === 'wallRoof' || name.includes('פנל') || name.includes('מעטפת') || name.includes('קיר')) && !toggles.includeWallsAndRoof) return;
      if ((cat === 'interior_cladding' || name.includes('חיפוי פנימי') || name.includes('גבס')) && !toggles.includeInteriorCladding) return;
      if ((cat === 'electrical' || name.includes('חשמל') || name.includes('תאורה')) && !toggles.includeElectrical) return;
      if ((cat === 'hvac' || name.includes('מיזוג') || name.includes('מזגן') || name.includes('אוורור')) && !toggles.includeHVAC) return;
      if ((cat === 'exterior_cladding' || name.includes('חיפוי חיצוני')) && !toggles.includeExteriorCladding) return;
      if ((cat === 'openings' || name.includes('פתחים') || name.includes('חלון') || name.includes('דלת')) && totalOpeningsCount === 0) return;

      let qty = 1;
      let metricLabel: string = item.unit || 'יחידה';
      if (item.unit === 'מ"ר') {
        if (item.targetMetric === 'wallArea' || cat === 'panels' || cat === 'wallRoof' || cat === 'interior_cladding' || cat === 'exterior_cladding' || name.includes('פנל') || name.includes('קיר')) {
          qty = areas.wallAreaGross || 0; metricLabel = `${qty} מ"ר קירות`;
        } else { qty = areas.floorArea || 0; metricLabel = `${qty} מ"ר רצפה`; }
      } else if (item.unit === 'מטר רץ') { qty = areas.perimeter || 0; metricLabel = `${qty} מטר רץ היקף`; }
      else if ((item.unit as string) === 'נקודה' || (cat === 'electrical' && item.unit === 'יחידה')) { qty = totalElecPoints || 0; metricLabel = `${qty} נקודות חשמל ותאורה`; }
      else if (cat === 'openings' && item.unit === 'יחידה') { qty = totalOpeningsCount || 0; metricLabel = `${qty} פתחים`; }
      else if (item.unit === 'לפי שעה') { qty = 56; metricLabel = `${qty} שעות`; }
      else if (item.unit === 'יומית') { qty = 7; metricLabel = `${qty} ימים`; }
      else if (item.unit === 'גלובלי' || item.unit === 'יחידה' || item.unit === 'סט') { qty = 1; metricLabel = `פיקס גלובלי`; }

      const wasteMultiplier = item.wasteFactorPercent ? 1 + item.wasteFactorPercent / 100 : 1;
      const unitPrice = item.defaultUnitPrice || 0;
      const totalPrice = Math.round((qty || 0) * unitPrice * wasteMultiplier) || 0;
      laborBreakdown.push({ id: item.id, name: item.name, category: item.category, formulaText: `${metricLabel} × ₪${unitPrice.toLocaleString()}${item.wasteFactorPercent ? ` (+${item.wasteFactorPercent}% פחת)` : ''} = ₪${totalPrice.toLocaleString()}`, quantity: qty, unit: item.unit, unitPrice, totalPrice });
    });
  }

  const laborCost = Math.max(0, Math.round(laborBreakdown.reduce((sum, item) => sum + (item.totalPrice || 0), 0))) || 0;
  const subtotalBeforeMargin = (materialsCost || 0) + (laborCost || 0);
  const contractorMarginPercent = globalSettings?.contractorMarginPercent ?? project?.contractorMarginPercent ?? 20;
  const contractorMarginAmount = Math.round(subtotalBeforeMargin * ((contractorMarginPercent || 0) / 100)) || 0;
  const subtotalBeforeVat = subtotalBeforeMargin + contractorMarginAmount;
  const vatRatePercent = globalSettings?.vatRatePercent ?? 18;
  const vatRate = (vatRatePercent || 0) / 100;
  const vatAmount = Math.round(subtotalBeforeVat * vatRate) || 0;
  const totalClientPrice = subtotalBeforeVat;
  const totalClientPriceWithVat = subtotalBeforeVat + vatAmount;

  return { materialsCost, laborCost, laborBreakdown, subtotalBeforeMargin, contractorMarginAmount, contractorMarginPercent, subtotalBeforeVat, vatRate, vatAmount, totalClientPrice, totalClientPriceWithVat };
}

// Build a frozen snapshot of a BOM document for the system archive preview
export function buildBOMSnapshot(project: Project, catalog: MaterialCatalogItem[]): AppDocumentSnapshot {
  const bom = calculateBOM(project, catalog);
  const categories = Array.from(new Set(bom.map((i) => i.category)));
  const sections: AppDocumentSnapshotSection[] = categories.map((cat) => ({
    title: bom.find((i) => i.category === cat)?.categoryLabelHeb || cat,
    rows: bom
      .filter((i) => i.category === cat)
      .map((i) => ({
        name: i.name,
        specification: i.specification,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
  }));
  const totalCost = bom.reduce((sum, i) => sum + i.totalPrice, 0);
  return {
    projectName: project.name,
    clientName: project.clientName,
    date: project.date,
    dimensions: `${project.dimensions.length}x${project.dimensions.width}x${project.dimensions.height} מטר`,
    items: sections.flatMap((s) => s.rows),
    sections,
    summary: [{ label: 'סה"כ עלות חומרים', value: totalCost, highlight: true }],
  };
}

// Build a frozen snapshot of a quote document for the system archive preview
export function buildQuoteSnapshot(project: Project, catalog: MaterialCatalogItem[], globalSettings?: GlobalPricingSettings): AppDocumentSnapshot {
  const bom = calculateBOM(project, catalog, globalSettings?.defaultConstructionWorkHours, globalSettings?.defaultConstructionHourlyRate);
  const q = calculateClientQuote(project, catalog, globalSettings);

  const sections: AppDocumentSnapshotSection[] = [];
  const categories = Array.from(new Set(bom.map((i) => i.category)));
  if (categories.length > 0) {
    categories.forEach((cat) => {
      const catItems = bom.filter((i) => i.category === cat);
      if (catItems.length === 0) return;
      sections.push({
        title: catItems[0].categoryLabelHeb || cat,
        rows: catItems.map((i) => ({
          name: i.name,
          specification: i.specification,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      });
    });
  }

  if (q.laborBreakdown.length > 0) {
    sections.push({
      title: 'עלות עבודה והתקנה',
      rows: q.laborBreakdown.map((l) => ({
        name: l.name,
        specification: l.formulaText,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
      })),
    });
  }

  return {
    projectName: project.name,
    clientName: project.clientName,
    date: project.date,
    dimensions: `${project.dimensions.length}x${project.dimensions.width}x${project.dimensions.height} מטר`,
    quoteNumber: `QU-${project.id.slice(-5)}`,
    items: sections.flatMap((s) => s.rows),
    sections,
    summary: [
      { label: 'סה"כ חומרים', value: q.materialsCost },
      { label: 'סה"כ עבודה', value: q.laborCost },
      { label: 'סה"כ לפני רווח תפעולי', value: q.subtotalBeforeMargin },
      { label: `רווח תפעולי (${q.contractorMarginPercent}%)`, value: q.contractorMarginAmount },
      { label: 'מע"מ', value: q.vatAmount },
      { label: 'סה"כ ללא מע"מ', value: q.totalClientPrice },
      { label: 'סה"כ לתשלום (כולל מע"מ)', value: q.totalClientPriceWithVat, highlight: true },
    ],
  };
}