import React, { useState, useEffect, useMemo } from 'react';
import { 
  Project, 
  ConstructionMaterialType, 
  WheelType, 
  BasePlateType, 
  TopCoveringType, 
  InsulationType, 
  PanelType, 
  PanelTrackType,
  ExteriorCladding, 
  OpeningItem, 
  OpeningType, 
  InteriorCladdingType,
  ProjectStatus,
  MaterialCatalogItem,
  AppDocument,
  ElectricalConfig,
  ElectricalPointCategory,
  ElectricalPointDetail,
  ElectricalCanvasData,
  ElectricalCanvasPoint,
} from '../types';
import { calculateAreas, calculateStructuralMeters, calculateEstimatedWeight, calculateClientQuote, calculateElectricalRequirements, calcEffectivePointLength, calcPerimeterRouteMeters, ELECTRICAL_POINT_DEFAULTS } from '../utils/calculations';
import { StepAddOns } from './StepAddOns';
import { 
  Ruler, 
  Layers, 
  Truck, 
  Footprints, 
  Home, 
  DoorOpen, 
  Zap, 
  Wind,
  ShieldCheck,
  PaintBucket,
  Wrench,
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  FileText,
  Calculator,
  ExternalLink,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { ElectricalCanvas, CanvasTool } from './ElectricalCanvas';

interface ProjectFormProps {
  project: Project;
  catalog?: MaterialCatalogItem[];
  onUpdateProject: (updatedProject: Project) => void;
  onGoToBOM: () => void;
  onGoToQuote: () => void;
  onGoToCatalog?: () => void;
  onRegisterDocument?: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => void;
}

const NO_MATERIALS_MESSAGE = "לא הוגדרו חומרים במחירון - יש להוסיף חומרים במחירון";

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  catalog = [],
  onUpdateProject,
  onGoToBOM,
  onGoToQuote,
  onGoToCatalog,
  onRegisterDocument,
}) => {
  // Wizard Step State (1 to 9)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Detailed point breakdown accordion state (which point category is expanded)
  const [openPointCategory, setOpenPointCategory] = useState<ElectricalPointCategory | null>(null);

  // Interactive Electrical Canvas state (tool + selected point)
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('select');
  const [selectedCanvasPointId, setSelectedCanvasPointId] = useState<string | null>(null);

  // Point categories: display labels and the matching count field in ElectricalConfig
  const POINT_CATEGORY_LABELS: Record<ElectricalPointCategory, string> = {
    switches: 'מתגים',
    outlets: 'שקעים רגילים',
    powerOutlets: 'שקעי כוח',
    lighting: 'נקודות תאורה',
  };
  const POINT_COUNT_FIELDS: Record<ElectricalPointCategory, keyof ElectricalConfig> = {
    switches: 'switchesCount',
    outlets: 'powerOutletsCount',
    powerOutlets: 'heavyPowerOutletsCount',
    lighting: 'lightingPointsCount',
  };
  // צבעים לקטגוריות נקודות בקנבס ובחלונית המאפיינים
  const POINT_CATEGORY_COLORS: Record<ElectricalPointCategory, string> = {
    switches: '#f97316',
    outlets: '#2563eb',
    powerOutlets: '#7c3aed',
    lighting: '#eab308',
  };

  // General & Dimensions header collapsible state
  const [showGeneralDetails, setShowGeneralDetails] = useState<boolean>(true);

  // Live Calculations using active catalog from props
  const areas = calculateAreas(project);
  const struct = calculateStructuralMeters(project);
  const weight = calculateEstimatedWeight(project);
  const quote = calculateClientQuote(project, catalog);
  const elecCalc = calculateElectricalRequirements(project);

  // Dynamic Catalog Queries by Category/SubCategory (Materials only: type !== 'labor')
  const materialsCatalog = catalog.filter((i) => i.type !== 'labor' && i.itemType !== 'labor');

  const constructionProfiles = materialsCatalog.filter(
    (i) => i.subCategory === 'profiles' || i.subCategory === 'construction_hardware' || i.subCategory === 'welding_coils' || i.subCategory === 'construction_profile' || i.category === 'construction'
  );
  const wheelTypes = materialsCatalog.filter(
    (i) => i.subCategory === 'wheels_base' || i.subCategory === 'levelling_jacks' || i.subCategory === 'wheel_type' || i.category === 'wheels'
  );
  const floorBases = materialsCatalog.filter(
    (i) => i.subCategory === 'floor_base' || (i.category === 'floor' && i.subCategory !== 'floor_top' && i.subCategory !== 'floor_insulation')
  );
  const floorTops = materialsCatalog.filter(
    (i) => i.subCategory === 'floor_top' || (i.category === 'floor' && i.subCategory === 'floor_top')
  );
  const floorInsulations = materialsCatalog.filter(
    (i) => i.subCategory === 'floor_insulation'
  );
  const wallPanels = materialsCatalog.filter(
    (i) => i.subCategory === 'wall_panel' || (i.category === 'panels' && i.subCategory !== 'panel_track')
  );
  const panelTracks = materialsCatalog.filter((i) => i.subCategory === 'panel_track');
  const openingItems = materialsCatalog.filter(
    (i) => i.subCategory === 'doors' || i.subCategory === 'windows' || i.subCategory === 'openings' || i.category === 'openings'
  );
  const interiorCladdings = materialsCatalog.filter((i) => i.subCategory === 'interior_cladding');
  const electricalPanels = materialsCatalog.filter(
    (i) => i.subCategory === 'electrical' || (i.category === 'electrical' && i.subCategory !== 'ac_unit' && i.subCategory !== 'ventilation')
  );
  const acUnits = materialsCatalog.filter((i) => i.subCategory === 'ac_unit');
  const ventilations = materialsCatalog.filter((i) => i.subCategory === 'ventilation');
  const exteriorCladdings = materialsCatalog.filter((i) => i.subCategory === 'exterior_cladding');
  const hardwareItems = materialsCatalog.filter(
    (i) => i.category === 'hardware' || i.subCategory === 'sealant_silicone' || i.subCategory === 'screws_drills' || i.subCategory === 'sealing_profiles_gutters' || i.subCategory === 'construction_hardware' || i.subCategory === 'welding_coils'
  );

  // Auto-sync empty wizard selections to first catalog item if available
  useEffect(() => {
    let changed = false;
    const updated = { ...project };

    if (!updated.construction?.profileSpec && constructionProfiles.length > 0) {
      updated.construction = { ...updated.construction, profileSpec: constructionProfiles[0].id };
      changed = true;
    }
    if (!updated.wheels?.wheelType && wheelTypes.length > 0) {
      updated.wheels = { ...updated.wheels, wheelType: wheelTypes[0].id, unitPrice: wheelTypes[0].defaultUnitPrice };
      changed = true;
    }
    if (!updated.floor?.basePlateType && floorBases.length > 0) {
      updated.floor = { ...updated.floor, basePlateType: floorBases[0].id };
      changed = true;
    }
    if (!updated.wallRoof?.panelType && wallPanels.length > 0) {
      updated.wallRoof = { ...updated.wallRoof, panelType: wallPanels[0].id };
      changed = true;
    }
    if (!updated.electrical?.mainPanelType && electricalPanels.length > 0) {
      updated.electrical = { ...updated.electrical, mainPanelType: electricalPanels[0].id };
      changed = true;
    }

    if (changed) {
      onUpdateProject(updated);
    }
  }, [catalog]);

  // Helper notice when catalog category has 0 items
  const EmptyCatalogNotice: React.FC<{ categoryLabel: string }> = ({ categoryLabel }) => (
    <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
      <span className="font-medium">לא הוגדרו חומרים בקטגוריה זו ({categoryLabel}) - אנא הוסף חומר במחירון</span>
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
  );

  // Ensure toggles state exists
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

  const updateToggle = (key: keyof typeof toggles, value: boolean) => {
    onUpdateProject({
      ...project,
      sectionToggles: {
        ...toggles,
        [key]: value,
      },
    });
  };

  // Field change handlers
  const handleDimensionsChange = (field: keyof typeof project.dimensions, value: number) => {
    onUpdateProject({
      ...project,
      dimensions: {
        ...project.dimensions,
        [field]: Math.max(0.1, value),
      },
    });
  };

  const handleConstructionChange = (field: keyof typeof project.construction, value: any) => {
    onUpdateProject({
      ...project,
      construction: {
        ...project.construction,
        [field]: value,
      },
    });
  };

  const handleWheelsChange = (field: keyof typeof project.wheels, value: any) => {
    onUpdateProject({
      ...project,
      wheels: {
        ...project.wheels,
        [field]: value,
      },
    });
  };

  const handleFloorChange = (field: keyof typeof project.floor, value: any) => {
    onUpdateProject({
      ...project,
      floor: {
        ...project.floor,
        [field]: value,
      },
    });
  };

  const handleWallRoofChange = (field: keyof typeof project.wallRoof, value: any) => {
    onUpdateProject({
      ...project,
      wallRoof: {
        ...project.wallRoof,
        [field]: value,
      },
    });
  };

  const handleElectricalChange = (field: keyof typeof project.electrical, value: any) => {
    onUpdateProject({
      ...project,
      electrical: {
        ...project.electrical,
        [field]: value,
      },
    });
  };

  // Point detail rows: helper to create a new (empty) point row - all fields start at 0,
  // so nothing is added to the cable length unless the user explicitly enters values.
  const createPointRow = (cat: ElectricalPointCategory, index: number): ElectricalPointDetail => ({
    id: `pt_${cat}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
    label: `${ELECTRICAL_POINT_DEFAULTS[cat].labelPrefix} ${index + 1}`,
    distanceMeters: 0,
    heightMeters: 0,
    reserveMeters: 0,
  });

  // Sync point detail rows to the entered quantities.
  // Changes upward add default rows; changes downward trim the tail rows only -
  // data of existing points is never overwritten. Also migrates legacy projects.
  useEffect(() => {
    const details = project.electrical?.pointDetails;
    const countMap: Record<ElectricalPointCategory, number> = {
      switches: project.electrical?.switchesCount ?? 0,
      outlets: project.electrical?.powerOutletsCount ?? 0,
      powerOutlets: project.electrical?.heavyPowerOutletsCount ?? 0,
      lighting: project.electrical?.lightingPointsCount ?? 0,
    };
    let changed = false;
    const next: Partial<Record<ElectricalPointCategory, ElectricalPointDetail[]>> = {};
    (Object.keys(countMap) as ElectricalPointCategory[]).forEach((cat) => {
      const current = details?.[cat];
      const target = countMap[cat];
      if ((current?.length || 0) === target) return;
      const rows = current ? current.slice(0, target) : [];
      while (rows.length < target) {
        rows.push(createPointRow(cat, rows.length));
      }
      next[cat] = rows;
      changed = true;
    });
    if (changed) {
      onUpdateProject({
        ...project,
        electrical: {
          ...project.electrical,
          pointDetails: { ...(details || {}), ...next },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.electrical?.switchesCount, project.electrical?.powerOutletsCount, project.electrical?.heavyPowerOutletsCount, project.electrical?.lightingPointsCount]);

  // Edit a single field of one detailed point row
  const handlePointDetailChange = (
    cat: ElectricalPointCategory,
    index: number,
    field: 'label' | 'distanceMeters' | 'heightMeters' | 'reserveMeters',
    value: any
  ) => {
    const rows = [...(project.electrical?.pointDetails?.[cat] || [])];
    if (!rows[index]) return;
    rows[index] = { ...rows[index], [field]: value };
    onUpdateProject({
      ...project,
      electrical: {
        ...project.electrical,
        pointDetails: { ...(project.electrical?.pointDetails || {}), [cat]: rows },
      },
    });
  };

  // Add one detailed point row (increments the matching count field)
  const handleAddPoint = (cat: ElectricalPointCategory) => {
    const rows = [...(project.electrical?.pointDetails?.[cat] || [])];
    rows.push(createPointRow(cat, rows.length));
    const electrical: ElectricalConfig = {
      ...project.electrical,
      pointDetails: { ...(project.electrical?.pointDetails || {}), [cat]: rows },
    };
    electrical[POINT_COUNT_FIELDS[cat]] = rows.length;
    onUpdateProject({ ...project, electrical });
  };

  // Remove a single detailed point row (decrements the matching count field)
  const handleRemovePoint = (cat: ElectricalPointCategory, index: number) => {
    const rows = [...(project.electrical?.pointDetails?.[cat] || [])];
    rows.splice(index, 1);
    const electrical: ElectricalConfig = {
      ...project.electrical,
      pointDetails: { ...(project.electrical?.pointDetails || {}), [cat]: rows },
    };
    electrical[POINT_COUNT_FIELDS[cat]] = rows.length;
    onUpdateProject({ ...project, electrical });
  };

  // === Interactive Electrical Canvas: state accessors, helpers & handlers ===

  // נתוני הקנבס הנוכחיים (ברירת מחדל ריקה לפרויקטים ישנים ללא שרטוט)
  const canvasData: ElectricalCanvasData = project.electrical?.canvas || { panel: null, points: [], wiredPointIds: [] };

  // תוויות נקודות מתוך שורות pointDetails - מוצגות על הקנבס
  const canvasLabelsById = useMemo(() => {
    const map: Record<string, string> = {};
    const d = project.electrical?.pointDetails;
    (['switches', 'outlets', 'powerOutlets', 'lighting'] as ElectricalPointCategory[]).forEach((cat) => {
      (d?.[cat] || []).forEach((r) => {
        map[r.id] = r.label;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.electrical?.pointDetails]);

  // הנקודה הנבחרת בקנבס + שורתה הרלוונטית (לחלונית המאפיינים)
  const selectedCanvasPoint = selectedCanvasPointId
    ? canvasData.points.find((p) => p.id === selectedCanvasPointId) || null
    : null;
  const selectedCanvasRow =
    selectedCanvasPoint && project.electrical?.pointDetails
      ? (project.electrical.pointDetails[selectedCanvasPoint.category] || []).find((r) => r.id === selectedCanvasPoint.id) || null
      : null;
  const selectedCanvasRowIndex =
    selectedCanvasPoint && project.electrical?.pointDetails
      ? (project.electrical.pointDetails[selectedCanvasPoint.category] || []).findIndex((r) => r.id === selectedCanvasPoint.id)
      : -1;

  // שורת הנקודה המזינה (בשרשור Daisy Chain) עבור חישוב אורך כבל מודע שרשור.
  // מקור הערך העיקרי הוא נקודת הקנבס (מקור האמת לחיווט), וגיבוי לשורת pointDetails המסונכרנת.
  const feedRowFor = (row: ElectricalPointDetail): ElectricalPointDetail | undefined => {
    const fedId = canvasData.points.find((p) => p.id === row.id)?.fedFrom || row.fedFrom || null;
    if (!fedId) return undefined;
    const fp = canvasData.points.find((p) => p.id === fedId);
    if (!fp) return undefined;
    return (project.electrical?.pointDetails?.[fp.category] || []).find((r) => r.id === fp.id);
  };

  // חישוב מחדש של distanceMeters בכל השורות שתואמות לנקודות בקנבס, לפי ניתוב צמוד-הקיר
  // מהנקודה המזינה (אם הנקודה בשרשור Daisy Chain) או מלוח החשמל.
  // החזרה של אותו אובייקט (elec) מעידה שלא היה שינוי.
  const recomputePointDistances = (
    elec: ElectricalConfig,
    panel: { x: number; y: number } | null,
    points: ElectricalCanvasPoint[]
  ): ElectricalConfig => {
    if (!panel) return elec;
    const details = elec.pointDetails || {};
    const roomL = Math.max(1, project.dimensions.length);
    const roomW = Math.max(1, project.dimensions.width);
    let changed = false;
    const next: typeof details = {};
    points.forEach((cp) => {
      const arr = details[cp.category];
      if (!arr) return;
      const idx = arr.findIndex((r) => r.id === cp.id);
      if (idx < 0) return;
      const feed = cp.fedFrom ? points.find((f) => f.id === cp.fedFrom) : null;
      const src = feed ?? panel;
      const d = calcPerimeterRouteMeters(src.x, src.y, cp.x, cp.y, roomL, roomW).length;
      if (arr[idx].distanceMeters !== d) {
        next[cp.category] = arr.map((r, i) => (i === idx ? { ...r, distanceMeters: d } : r));
        changed = true;
      }
    });
    return changed ? { ...elec, pointDetails: { ...details, ...next } } : elec;
  };

  // מיקום ברירת מחדל לנקודות חדשות: רווחים שווים לאורך היקף הקירות (הליכה בכיוון השעון מקיר לקיר)
  const defaultCanvasPosition = (index: number, total: number) => {
    const roomL = Math.max(1, project.dimensions.length);
    const roomW = Math.max(1, project.dimensions.width);
    const margin = Math.min(0.6, roomL * 0.15, roomW * 0.15);
    const usableL = Math.max(0.4, roomL - 2 * margin);
    const usableW = Math.max(0.4, roomW - 2 * margin);
    const perimeter = 2 * usableL + 2 * usableW;
    const count = Math.max(1, total);
    const t = perimeter * ((index + 0.5) / count); // אמצעי של n חטיבות שוות סביב ההיקף
    let acc = 0;
    if (t < acc + usableL) return { x: margin + t, y: margin }; // קיר תחתון
    acc += usableL;
    if (t < acc + usableW) return { x: margin + usableL, y: margin + (t - acc) }; // קיר ימני
    acc += usableW;
    if (t < acc + usableL) return { x: margin + usableL - (t - acc), y: margin + usableW }; // קיר עליון
    acc += usableL;
    return { x: margin, y: margin + usableW - (t - acc) }; // קיר שמאלי
  };

  // הנחת לוח חשמל בקנבס + עדכון בלייב של מרחקי כל הנקודות
  const handleCanvasPlacePanel = (x: number, y: number) => {
    const canvas: ElectricalCanvasData = { ...canvasData, panel: { x, y } };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    elec = recomputePointDistances(elec, canvas.panel, canvas.points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // הצבת נקודה חדשה בקנבס (יוצרת שורת pointDetails תואמת + מעדכנת את שדה הכמות)
  const handleCanvasPlacePoint = (cat: ElectricalPointCategory, x: number, y: number) => {
    let panel = canvasData.panel;
    if (!panel) panel = { x: Math.min(0.6, Math.max(0.1, project.dimensions.length - 0.1)), y: 0 }; // הנחת לוח אוטומטית על הקיר התחתון
    const rows = [...(project.electrical?.pointDetails?.[cat] || [])];
    const row: ElectricalPointDetail = {
      ...createPointRow(cat, rows.length),
      distanceMeters: calcPerimeterRouteMeters(panel.x, panel.y, x, y, Math.max(1, project.dimensions.length), Math.max(1, project.dimensions.width)).length,
    };
    rows.push(row);
    const canvas: ElectricalCanvasData = {
      ...canvasData,
      panel,
      points: [...canvasData.points, { id: row.id, category: cat, x, y }],
      wiredPointIds: [...canvasData.wiredPointIds, row.id],
    };
    const electrical: ElectricalConfig = {
      ...project.electrical,
      canvas,
      pointDetails: { ...(project.electrical?.pointDetails || {}), [cat]: rows },
    };
    electrical[POINT_COUNT_FIELDS[cat]] = rows.length;
    onUpdateProject({ ...project, electrical });
    setSelectedCanvasPointId(row.id);
  };

  // הזזת נקודה בקנבס - עדכון בלייב של מרחק הכבל שלה לאורך הקירות מהלוח
  const handleCanvasMovePoint = (id: string, x: number, y: number) => {
    const points = canvasData.points.map((p) => (p.id === id ? { ...p, x, y } : p));
    const canvas: ElectricalCanvasData = { ...canvasData, points };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    if (canvas.panel) elec = recomputePointDistances(elec, canvas.panel, points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // הזזת לוח החשמל בקנבס - עדכון בלייב של מרחקי כל הנקודות
  const handleCanvasMovePanel = (x: number, y: number) => {
    const panel = { x, y };
    const canvas: ElectricalCanvasData = { ...canvasData, panel };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    elec = recomputePointDistances(elec, panel, canvas.points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // שרשור (Daisy Chain): הגדרת נקודת היעד כ"מוזנת משרשור" מהנקודה המזינה.
  // לחיצה נוספת על אותו צמד (אותה נקודה מזינה) מבטלת את השרשור וחוזרת להזנה ישירה מהלוח.
  const handleCanvasChainPoints = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const existing = canvasData.points.find((p) => p.id === toId)?.fedFrom || null;
    let points = canvasData.points;
    let wiredPointIds = canvasData.wiredPointIds;
    if (existing === fromId) {
      // ביטול השרשור הקיים - הנקודה חוזרת להזנה ישירה מהלוח
      points = points.map((p) => (p.id === toId ? { ...p, fedFrom: null } : p));
      if (!wiredPointIds.includes(toId)) wiredPointIds = [...wiredPointIds, toId];
    } else {
      points = points.map((p) => (p.id === toId ? { ...p, fedFrom: fromId } : p));
      wiredPointIds = wiredPointIds.filter((w) => w !== toId);
    }
    const canvas: ElectricalCanvasData = { ...canvasData, points, wiredPointIds };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    if (canvas.panel) elec = recomputePointDistances(elec, canvas.panel, canvas.points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // הגדרת מקור ההזנה מהחלונית: feedId = מזהה נקודה מזינה, או null ללוח החשמל (הזנה ישירה)
  const handleCanvasSetFedFrom = (id: string, feedId: string | null) => {
    let points = canvasData.points.map((p) => (p.id === id ? { ...p, fedFrom: feedId || null } : p));
    let wiredPointIds = canvasData.wiredPointIds;
    if (feedId) {
      wiredPointIds = wiredPointIds.filter((w) => w !== id);
    } else if (!wiredPointIds.includes(id)) {
      wiredPointIds = [...wiredPointIds, id];
    }
    const canvas: ElectricalCanvasData = { ...canvasData, points, wiredPointIds };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    if (canvas.panel) elec = recomputePointDistances(elec, canvas.panel, canvas.points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // חיבור אוטומטי של נקודה אל לוח החשמל (בשרשור הרציף בלחיצה הראשונה):
  // אם הנקודה אינה מוזנת ואינה ברשימת החוטים - הוספתה לחוטים ועדכון מרחקה מהלוח
  const handleCanvasEnsurePanelFeed = (id: string) => {
    const point = canvasData.points.find((p) => p.id === id);
    if (!point) return;
    if (point.fedFrom) return; // כבר מוזנת מנקודה אחרת בשרשור
    if (canvasData.wiredPointIds.includes(id)) return; // כבר מחוברת ללוח
    const canvas: ElectricalCanvasData = {
      ...canvasData,
      points: canvasData.points.map((p) => (p.id === id ? { ...p, fedFrom: null } : p)),
      wiredPointIds: [...canvasData.wiredPointIds, id],
    };
    let elec: ElectricalConfig = { ...project.electrical, canvas };
    if (canvas.panel) elec = recomputePointDistances(elec, canvas.panel, canvas.points);
    onUpdateProject({ ...project, electrical: elec });
  };

  // מחיקת נקודה מהקנבס (גם שורת pointDetails וגם שדה הכמות).
  // נקודות שהוזנו בשרשור מהנקודה הנמחקת חוזרות להזנה ישירה מהלוח.
  const handleCanvasErasePoint = (id: string) => {
    const cp = canvasData.points.find((p) => p.id === id);
    if (!cp) return;
    const rows = (project.electrical?.pointDetails?.[cp.category] || []).filter((r) => r.id !== id);
    const affected = canvasData.points.filter((p) => p.fedFrom === id);
    let wired = canvasData.wiredPointIds.filter((w) => w !== id);
    affected.forEach((a) => {
      if (!wired.includes(a.id)) wired.push(a.id);
    });
    const electrical: ElectricalConfig = {
      ...project.electrical,
      canvas: {
        ...canvasData,
        points: canvasData.points.filter((p) => p.id !== id).map((p) => (p.fedFrom === id ? { ...p, fedFrom: null } : p)),
        wiredPointIds: wired,
      },
      pointDetails: { ...(project.electrical?.pointDetails || {}), [cp.category]: rows },
    };
    electrical[POINT_COUNT_FIELDS[cp.category]] = rows.length;
    onUpdateProject({ ...project, electrical });
    setSelectedCanvasPointId(null);
  };

  // סנכרון דו-כיווני בין שורות pointDetails לקנבס השרטוט, ועדכון מרחקים בלייב
  useEffect(() => {
    const canvas = canvasData;
    const details = project.electrical?.pointDetails;
    const categories: ElectricalPointCategory[] = ['switches', 'outlets', 'powerOutlets', 'lighting'];

    // 1) הסרת נקודות קנבס שאין עבורן שורת נקודה
    let nextPoints = canvas.points.filter((p) => {
      const rows = details?.[p.category] || [];
      return rows.some((r) => r.id === p.id);
    });

    // 2) הוספת נקודת קנבס לכל שורה שאין לה ייצוג בשרטוט, ברווחים שווים לאורך הקירות
    const totalRows = categories.reduce((sum, cat) => sum + (details?.[cat]?.length || 0), 0);
    let nextIndex = 0;
    categories.forEach((cat) => {
      (details?.[cat] || []).forEach((row) => {
        if (!nextPoints.some((p) => p.id === row.id)) {
          const pos = defaultCanvasPosition(nextIndex, totalRows);
          nextPoints.push({ id: row.id, category: cat, x: pos.x, y: pos.y });
          nextIndex++;
        }
      });
    });

    const wiredIds = canvas.wiredPointIds.filter((id) => nextPoints.some((p) => p.id === id));
    const pointsChanged =
      canvas.points.length !== nextPoints.length ||
      nextPoints.some((p, i) => {
        const o = canvas.points[i];
        return (
          !o ||
          o.id !== p.id ||
          o.category !== p.category ||
          o.x !== p.x ||
          o.y !== p.y ||
          (o.fedFrom || null) !== (p.fedFrom || null)
        );
      });
    const wiresChanged =
      wiredIds.length !== canvas.wiredPointIds.length ||
      wiredIds.some((id, i) => canvas.wiredPointIds[i] !== id);

    // 3) עדכון בלייב של מרחקי השורות לפי מקור ההזנה (נקודת שרשור או הלוח)
    let elec: ElectricalConfig = project.electrical;
    if (canvas.panel && nextPoints.length > 0) {
      elec = recomputePointDistances(elec, canvas.panel, nextPoints);
    }

    // 4) שיקוף מקור ההזנה (fedFrom) מהקנבס אל שורות pointDetails - הקנבס הוא מקור האמת לחיווט
    const pd = elec.pointDetails || {};
    let nextPd = pd;
    let rowsChanged = false;
    categories.forEach((cat) => {
      (pd[cat] || []).forEach((row) => {
        const cp = nextPoints.find((p) => p.id === row.id);
        const want = cp?.fedFrom || null;
        if ((row.fedFrom || null) !== want) {
          if (nextPd === pd) nextPd = { ...pd };
          nextPd[cat] = (nextPd[cat] || []).map((r) => (r.id === row.id ? { ...r, fedFrom: want || null } : r));
          rowsChanged = true;
        }
      });
    });
    if (rowsChanged) elec = { ...elec, pointDetails: nextPd };

    const canvasChanged = pointsChanged || wiresChanged;
    if (!canvasChanged && elec === project.electrical) return;

    const nextCanvas: ElectricalCanvasData = { ...canvas, points: nextPoints, wiredPointIds: wiredIds };
    onUpdateProject({
      ...project,
      electrical: canvasChanged ? { ...elec, canvas: nextCanvas } : elec,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.electrical?.pointDetails, project.electrical?.canvas]);

  // Compact editor for one point category: count input + dynamic detail rows (accordion).
  // Rendered as a plain function (NOT a component) to preserve input focus across renders.
  const renderPointCategoryEditor = (cat: ElectricalPointCategory, rows: ElectricalPointDetail[]) => {
    const count = project.electrical?.[POINT_COUNT_FIELDS[cat]] ?? 0;
    const open = openPointCategory === cat;
    return (
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">{POINT_CATEGORY_LABELS[cat]}</span>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{count} נקודות</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="block text-[11px] font-semibold text-slate-600">כמות</label>
            <input
              type="number"
              min="0"
              value={count}
              onChange={(e) => {
                handleElectricalChange(POINT_COUNT_FIELDS[cat], parseInt(e.target.value) || 0);
                setOpenPointCategory(cat);
              }}
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 font-bold text-center focus:outline-none focus:border-blue-500 focus:bg-white transition"
              id={`${cat}-count-wiz`}
            />
            <button
              type="button"
              onClick={() => setOpenPointCategory(open ? null : cat)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'סגירת פירוט' : 'פירוט נקודות'}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-slate-100 p-4 space-y-2">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-slate-400">
              <span className="col-span-3">שם/תיאור הנקודה</span>
              <span className="col-span-2">מרחק דרך הקירות (מ')</span>
              <span className="col-span-2">גובה מהרצפה (מ')</span>
              <span className="col-span-2">סרח/רזרבה (מ')</span>
              <span className="col-span-2">אורך כבל</span>
              <span className="col-span-1"></span>
            </div>
            {rows.length === 0 ? (
              <div className="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center">
                אין נקודות פרטניות - הגדל את הכמות למעלה כדי לייצר שורות, או לחץ "הוסף נקודה".
              </div>
            ) : (
              rows.map((row, i) => {
                const length = calcEffectivePointLength(row, feedRowFor(row));
                return (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-3">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => handlePointDetailChange(cat, i, 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                        placeholder="למשל: שקע כוח תנור"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.distanceMeters}
                        onChange={(e) => handlePointDetailChange(cat, i, 'distanceMeters', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        placeholder="מרחק"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.heightMeters}
                        onChange={(e) => handlePointDetailChange(cat, i, 'heightMeters', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        placeholder="גובה"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.reserveMeters}
                        onChange={(e) => handlePointDetailChange(cat, i, 'reserveMeters', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        placeholder="סרח"
                      />
                    </div>
                    <div className="col-span-8 sm:col-span-2 text-center">
                      <span className="inline-block text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 whitespace-nowrap">
                        {length.toFixed(2)} מ'
                      </span>
                    </div>
                    <div className="col-span-4 sm:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePoint(cat, i)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="הסרת נקודה"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <button
              type="button"
              onClick={() => handleAddPoint(cat)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              הוספת נקודה
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleHVACChange = (updates: Partial<NonNullable<typeof project.hvac>>) => {
    const currentHVAC = project.hvac || {
      enabled: true,
      airConditioner: project.electrical.airConditioner || '',
      venta: {
        enabled: false,
        quantity: 1,
        diameterInch: 4,
        direction: 'exhaust',
      },
    };

    const newHVAC = {
      ...currentHVAC,
      ...updates,
    };

    onUpdateProject({
      ...project,
      hvac: newHVAC,
      electrical: {
        ...project.electrical,
        airConditioner: newHVAC.airConditioner,
      },
    });
  };

  // Openings management dynamically from catalog
  const addOpening = () => {
    const firstMat = openingItems[0];
    const newOp: OpeningItem = {
      id: `op_${Date.now()}`,
      type: 'window',
      title: firstMat ? firstMat.name : 'פתח חדש במעטפת',
      widthCm: firstMat?.defaultWidthCm || 100,
      heightCm: firstMat?.defaultHeightCm || 190,
      width: (firstMat?.defaultWidthCm || 100) / 100,
      height: (firstMat?.defaultHeightCm || 190) / 100,
      quantity: 1,
      material: 'aluminum',
      doorProfile: firstMat ? firstMat.id : '',
      glassType: 'glass_4mm',
      pricePerUnit: firstMat ? firstMat.defaultUnitPrice : 850,
    };
    onUpdateProject({
      ...project,
      openings: [...project.openings, newOp],
    });
  };

  const updateOpening = (id: string, updatedFields: Partial<OpeningItem>) => {
    const updated = project.openings.map((op) => (op.id === id ? { ...op, ...updatedFields } : op));
    onUpdateProject({
      ...project,
      openings: updated,
    });
  };

  const removeOpening = (id: string) => {
    onUpdateProject({
      ...project,
      openings: project.openings.filter((op) => op.id !== id),
    });
  };

  const STEP_TITLES = [
    { id: 1, title: 'קונסטרוקציה תחתונה', icon: Layers, toggleKey: 'includeBottomStructure' as const },
    { id: 2, title: 'תשתית וחיפוי רצפה', icon: Footprints, toggleKey: 'includeFloor' as const },
    { id: 3, title: 'פאנלים ומעטפת', icon: Home, toggleKey: 'includeWallsAndRoof' as const },
    { id: 4, title: 'חיפוי הקירות', icon: PaintBucket, toggleKey: 'includeInteriorCladding' as const },
    { id: 5, title: "גלגלים וג'קים", icon: Truck, toggleKey: 'includeWheels' as const },
    { id: 6, title: 'פתחים', icon: DoorOpen, toggleKey: null },
    { id: 7, title: 'חשמל', icon: Zap, toggleKey: 'includeElectrical' as const },
    { id: 8, title: 'מיזוג', icon: Wind, toggleKey: 'includeHVAC' as const },
    { id: 9, title: 'חומרי עזר ואיטום', icon: Wrench, toggleKey: null },
  ];

  return (
    <>
    <div className="w-full">
      {/* Main Wizard Column */}
      <div className="space-y-6">
        
        {/* General Project Details & Room Dimensions Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-extrabold uppercase">תכנון הנדסי</span>
                <span className="text-xs text-slate-300">אפיון ובניית החדר בשלבים</span>
              </div>
              <h2 className="text-xl font-black mt-1 text-white flex items-center gap-2">
                <span>{project.name || 'פרויקט חדר נייד חדש'}</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={project.status}
                onChange={(e) => onUpdateProject({ ...project, status: e.target.value as ProjectStatus })}
                className="bg-slate-800 border border-slate-600 text-orange-400 font-bold rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                id="project-status-wizard-select"
              >
                <option value="draft">טיוטה</option>
                <option value="quotation">הצעת מחיר</option>
                <option value="in_progress">בבנייה</option>
                <option value="completed">הושלם</option>
              </select>

              <button
                type="button"
                onClick={() => setShowGeneralDetails(!showGeneralDetails)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 font-semibold cursor-pointer transition"
              >
                {showGeneralDetails ? 'הסתר פרטים' : 'ערוך פרטי פרויקט & מידות'}
              </button>
            </div>
          </div>

          {showGeneralDetails && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
              {/* Client & Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שם הפרויקט</label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => onUpdateProject({ ...project, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="לדוגמה: חדר נייד למשרד 6x2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שם הלקוח</label>
                  <input
                    type="text"
                    value={project.clientName}
                    onChange={(e) => onUpdateProject({ ...project, clientName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="שם הלקוח / החברה"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">טלפון ליצירת קשר</label>
                  <input
                    type="text"
                    value={project.clientPhone}
                    onChange={(e) => onUpdateProject({ ...project, clientPhone: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">מיקום אספקה</label>
                  <input
                    type="text"
                    value={project.clientAddress}
                    onChange={(e) => onUpdateProject({ ...project, clientAddress: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="עיר, אזור תעשייה..."
                  />
                </div>
              </div>

              {/* Room Dimensions Control */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2 font-bold text-xs text-blue-800">
                  <Ruler className="w-4 h-4 text-blue-600" />
                  <span>מידות החדר ברוטו (אורך, רוחב, גובה):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">אורך (מטר)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="15"
                      value={project.dimensions.length}
                      onChange={(e) => handleDimensionsChange('length', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">רוחב (מטר)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={project.dimensions.width}
                      onChange={(e) => handleDimensionsChange('width', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">גובה (מטר)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.5"
                      max="4"
                      value={project.dimensions.height}
                      onChange={(e) => handleDimensionsChange('height', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Live Areas Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-center">
                  <div>
                    <span className="text-slate-400 text-[10px] block">שטח רצפה:</span>
                    <span className="font-black text-slate-900">{areas.floorArea} מ"ר</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">קירות ברוטו:</span>
                    <span className="font-black text-slate-900">{areas.wallAreaGross} מ"ר</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">קירות נטו:</span>
                    <span className="font-black text-blue-700">{areas.wallAreaNet} מ"ר</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">גג (כולל בלט):</span>
                    <span className="font-black text-emerald-700">{areas.roofAreaWithOverhang} מ"ר</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">נפח החדר:</span>
                    <span className="font-black text-slate-900">{areas.volume} מ"ק</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Steps Navigation Tabs (1 to 9) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-black text-slate-900">תהליך בניית החדר ({currentStep} מתוך 9):</span>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {STEP_TITLES[currentStep - 1].title}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
            {STEP_TITLES.map((step) => {
              const isCurrent = step.id === currentStep;
              const isIncluded = step.toggleKey ? toggles[step.toggleKey] : true;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`min-w-0 p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer relative ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isIncluded
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-70'
                  }`}
                  id={`wizard-step-tab-${step.id}`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-black">
                    <span>שלב {step.id}</span>
                  </div>
                  <StepIcon className={`w-4 h-4 ${isCurrent ? 'text-white' : isIncluded ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-bold line-clamp-1">{step.title.split(' ')[0]}</span>

                  {!isIncluded && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-black px-1 rounded-full">
                      מבוטל
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Card Content Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs relative">
          
          {/* Step Header with Toggle Switch */}
          {(() => {
            const activeStepInfo = STEP_TITLES[currentStep - 1];
            const activeToggleKey = activeStepInfo.toggleKey;
            const isSectionIncluded = activeToggleKey ? toggles[activeToggleKey] : true;

            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-4 bg-slate-50/80 -mx-6 -mt-6 p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
                    {currentStep}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      שלב {currentStep}: {activeStepInfo.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      הגדר את המאפיינים והפרמטרים של הרכיב עבור כתב הכמויות והצעת המחיר
                    </p>
                  </div>
                </div>

                {/* Universal Component Toggle Switch */}
                {activeToggleKey && (
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className={`text-xs font-extrabold ${isSectionIncluded ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {isSectionIncluded ? 'כלול רכיב זה בפרויקט' : 'רכיב מבוטל (ללא עלות)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateToggle(activeToggleKey, !isSectionIncluded)}
                    className="cursor-pointer transition focus:outline-none"
                    id={`toggle-step-${currentStep}`}
                    title="הפעל/בטל רכיב זה בפרויקט"
                  >
                    {isSectionIncluded ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
                )}
              </div>
            );
          })()}

          {/* Banner when component is disabled */}
          {(() => {
            const tKey = STEP_TITLES[currentStep - 1].toggleKey;
            if (!tKey) return null;
            return !toggles[tKey] && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-sm">רכיב זה מבוטל בפרויקט</span>
                  <span>
                    הרכיב והעלויות שלו לא יחושבו כלל בכתב הכמויות (BOM) ובהצעת המחיר ללקוח. אם ברצונך לכלול אותו, סמן את המתג "כלול רכיב זה בפרויקט" למעלה.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* STEP 1: קונסטרוקציה תחתונה */}
          {currentStep === 1 && toggles.includeBottomStructure && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    סוג ומידות הפרופיל לשלד (קונסטרוקציה)
                  </label>
                  <select
                    value={project.construction.profileSpec || ''}
                    onChange={(e) => {
                      const spec = e.target.value;
                      const foundItem = catalog.find((i) => i.id === spec);
                      onUpdateProject({
                        ...project,
                        construction: {
                          ...project.construction,
                          profileSpec: spec,
                          materialType: foundItem?.name?.includes('אלומיניום')
                            ? 'aluminum'
                            : foundItem?.name?.includes('עץ')
                            ? 'timber'
                            : 'steel',
                        },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="profile-spec-select-wiz"
                  >
                    {constructionProfiles.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      constructionProfiles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                        </option>
                      ))
                    )}
                  </select>
                  {constructionProfiles.length === 0 && (
                    <EmptyCatalogNotice categoryLabel="פרופילי קונסטרוקציה" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    צפיפות / מרווח מקסימלי בין הפרופילים (ס"מ)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="5"
                      min="30"
                      max="120"
                      value={project.construction.profileSpacingCm}
                      onChange={(e) => handleConstructionChange('profileSpacingCm', parseInt(e.target.value) || 60)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="spacing-cm-input-wiz"
                    />
                    <span className="text-xs text-slate-500 font-semibold">ס"מ</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">תקן מומלץ: כל 60 ס"מ מרכז אל מרכז</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">משקל למטר רץ (ק"ג/מטר)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={project.construction.unitWeightKgPerMeter}
                    onChange={(e) => handleConstructionChange('unitWeightKgPerMeter', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="profile-weight-input-wiz"
                  />
                </div>
              </div>

              {/* Floor Steel Structural Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 text-[10px] block">שלד רצפה (קונסטרוקציה תחתונה):</span>
                <span className="font-extrabold text-blue-700 text-sm">{struct.floorSteelTotal} מטר רץ</span>
                <span className="text-[10px] text-slate-400 block">טבעת היקפית + קורות רוחב לפי מפתח {project.construction.profileSpacingCm} ס"מ, כולל 10% פחת</span>
              </div>

              <StepAddOns
                step={1}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 2: תשתית וחיפוי רצפה */}
          {currentStep === 2 && toggles.includeFloor && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    תשתית רצפה (פלטות בסיס במחירון)
                  </label>
                  <select
                    value={project.floor.basePlateType || ''}
                    onChange={(e) => handleFloorChange('basePlateType', e.target.value as BasePlateType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="base-plate-select-wiz"
                  >
                    {floorBases.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      floorBases.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                        </option>
                      ))
                    )}
                  </select>
                  {floorBases.length === 0 && <EmptyCatalogNotice categoryLabel="תשתית רצפה" />}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    חיפוי עליון לרצפה במחירון
                  </label>
                  <select
                    value={project.floor.topCovering || ''}
                    onChange={(e) => handleFloorChange('topCovering', e.target.value as TopCoveringType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="top-covering-select-wiz"
                  >
                    {floorTops.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      <>
                        <option value="none">ללא חיפוי עליון (פלטה חשופה)</option>
                        {floorTops.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {floorTops.length === 0 && <EmptyCatalogNotice categoryLabel="חיפוי עליון לרצפה" />}
                </div>

              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs text-blue-900 flex justify-between items-center">
                <div>
                  <span className="font-extrabold block">שטח חיפוי רצפה מחושב:</span>
                  <span>{areas.floorArea} מ"ר רצפה (כולל פחת חיתוך של 5%)</span>
                </div>
                <span className="font-black text-blue-700 text-sm bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                  {(areas.floorArea * 1.05).toFixed(1)} מ"ר בחישוב BOM
                </span>
              </div>

              <StepAddOns
                step={2}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 3: קירות וגג (פנל מבודד) */}
          {currentStep === 3 && toggles.includeWallsAndRoof && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                <span className="font-extrabold block text-sm">הפרדה מלאה: קירות vs גג</span>
                <p>קירות מחושבים עם "פנאל מבודד קיר 5 ס"מ" לפי שטח קירות נטו ({areas.wallAreaNet} מ"ר). הגג מחושב בנפרד עם "פנאל איסכורית מבודד לגג" (פנאל גלי) לפי שטח גג כולל בלט ({areas.roofAreaWithOverhang} מ"ר).</p>
              </div>

              {/* --- Wall Panels Section --- */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>פנאל מבודד קיר 5 ס"מ</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      סוג פנל מבודד לקירות במחירון
                    </label>
                    <select
                      value={project.wallRoof.panelType || ''}
                      onChange={(e) => handleWallRoofChange('panelType', e.target.value as PanelType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="panel-type-select-wiz"
                    >
                      {wallPanels.length === 0 ? (
                        <option value="" disabled>
                          {NO_MATERIALS_MESSAGE}
                        </option>
                      ) : (
                        wallPanels.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                          </option>
                        ))
                      )}
                    </select>
                    {wallPanels.length === 0 && <EmptyCatalogNotice categoryLabel="פאנלים מבודדים לקיר" />}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      עובי הפנל המבודד (מ"מ)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="30"
                      max="200"
                      value={project.wallRoof.panelThicknessMm || 50}
                      onChange={(e) => handleWallRoofChange('panelThicknessMm', parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="panel-thickness-select-wiz"
                    />
                  </div>
                </div>
              </div>

              {/* --- Roof Panels Section + Overhang --- */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>פנאל איסכורית מבודד לגג (פנאל גלי)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      סוג פנל גג במחירון
                    </label>
                    <select
                      value={project.wallRoof.roofPanelType || project.wallRoof.panelType || ''}
                      onChange={(e) => handleWallRoofChange('roofPanelType', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="roof-panel-type-select-wiz"
                    >
                      {wallPanels.length === 0 ? (
                        <option value="" disabled>
                          {NO_MATERIALS_MESSAGE}
                        </option>
                      ) : (
                        wallPanels.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                          </option>
                        ))
                      )}
                    </select>
                    {wallPanels.length === 0 && <EmptyCatalogNotice categoryLabel="פאנלים מבודדים לגג" />}
                    <span className="text-[10px] text-slate-500 block mt-1">אם לא נבחר, ישמש אותו סוג פנל כמו הקירות</span>
                  </div>

                  {/* Roof Overhang Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      בלט גג (Overhang) מכל צד (ס"מ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={project.wallRoof.roofOverhangCm ?? 0}
                      onChange={(e) => handleWallRoofChange('roofOverhangCm', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                      id="roof-overhang-input"
                      placeholder="לדוגמה: 40"
                    />
                    <div className="mt-2 text-[10px] text-slate-500">
                      {project.wallRoof.roofOverhangCm && project.wallRoof.roofOverhangCm > 0 ? (
                        <span>מידות גג עם בלט: {project.dimensions.length + 2 * (project.wallRoof.roofOverhangCm || 0) / 100}×{project.dimensions.width + 2 * (project.wallRoof.roofOverhangCm || 0) / 100} מטר = {areas.roofAreaWithOverhang} מ"ר</span>
                      ) : (
                        <span>ללא בלט - מידות הגג זהות למידות הרצפה</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Panel Tracks --- */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span>מסלולי פח 50 מ"מ להיקף</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      סוג מסלולים במחירון
                    </label>
                    <select
                      value={project.wallRoof.panelTrackType || ''}
                      onChange={(e) => handleWallRoofChange('panelTrackType', e.target.value as PanelTrackType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="panel-track-select-wiz"
                    >
                      {panelTracks.length === 0 ? (
                        <option value="" disabled>
                          {NO_MATERIALS_MESSAGE}
                        </option>
                      ) : (
                        <>
                          <option value="none">ללא מסלולים</option>
                          {panelTracks.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {panelTracks.length === 0 && <EmptyCatalogNotice categoryLabel="מסלולי פנל" />}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    {(() => {
                      const trackNet = areas.perimeter * 2 + project.dimensions.height * 8;
                      const trackTotal = trackNet * 1.1;
                      return (
                        <>
                          <span className="font-extrabold text-slate-800 block">כמות מחושבת: {trackTotal.toFixed(1)} מטר רץ</span>
                          <span className="text-slate-500 text-[10px] block">
                            {trackNet.toFixed(1)} מטר רץ נטו ((היקף {areas.perimeter} × 2) + (גובה {project.dimensions.height} × 8) - מסלול כפול בכל פינה) + 10% פחת = {trackTotal.toFixed(1)} מטר רץ
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <StepAddOns
                step={3}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 4: חיפוי הקירות */}
          {currentStep === 4 && toggles.includeInteriorCladding && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    בחירת חיפוי פנים במחירון
                  </label>
                  <select
                    value={project.wallRoof.polymerCladding?.interiorCladdingType || ''}
                    onChange={(e) =>
                      handleWallRoofChange('polymerCladding', {
                        ...project.wallRoof.polymerCladding,
                        interiorCladdingType: e.target.value as InteriorCladdingType,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="interior-cladding-select-wiz"
                  >
                    {interiorCladdings.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      <>
                        <option value="none">פנל חשוף (ללא חיפוי נוסף)</option>
                        {interiorCladdings.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {interiorCladdings.length === 0 && <EmptyCatalogNotice categoryLabel="חיפוי פנימי" />}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    גובה החיפוי הפנימי
                  </label>
                  <div>
                    <select
                      value={project.wallRoof.polymerCladding?.heightMode === 'custom' ? 'custom' : project.wallRoof.polymerCladding?.heightMode || 'full'}
                      onChange={(e) => {
                        const cur = project.wallRoof.polymerCladding || { type: 'none' as const, heightMode: 'full' as const, customHeightCm: 120 };
                        handleWallRoofChange('polymerCladding', { ...cur, heightMode: e.target.value });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                      id="interior-height-select-wiz"
                    >
                      <option value="full">עד התקרה (גובה מלא)</option>
                      <option value="half">חצי גובה (עד 1.3 מטר)</option>
                      <option value="custom">הזנת גובה מותאם אישית בס"מ</option>
                    </select>

                    {project.wallRoof.polymerCladding?.heightMode === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="number"
                          min="10"
                          max="400"
                          value={project.wallRoof.polymerCladding?.customHeightCm || 120}
                          onChange={(e) => {
                            const cur = project.wallRoof.polymerCladding || { type: 'none' as const, heightMode: 'full' as const, customHeightCm: 120 };
                            handleWallRoofChange('polymerCladding', { ...cur, customHeightCm: parseInt(e.target.value) || 120 });
                          }}
                          className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-sm font-bold text-emerald-700 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition"
                          placeholder="הזן גובה בס'מ"
                          id="interior-custom-height-input"
                        />
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {(project.wallRoof.polymerCladding?.customHeightCm || 120) / 100} מטר
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(project.wallRoof.polymerCladding?.interiorCladdingType === 'gypsum_boards' ||
                project.wallRoof.polymerCladding?.interiorCladdingType === 'gypsum_green') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                  <span className="font-extrabold text-blue-800 block">עבודות גמר, שפכטל וצבע למבנה גבס:</span>
                  <p>כולל שפכטל, סרט יוטה/פינות, פריימר ו-2 שכבות צבע אקרילי עליון לקירות ולתקרה.</p>
                </div>
              )}

              {/* Sub-Section: Exterior Cladding */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-extrabold text-slate-900">חיפוי חיצוני מעוצב</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">כלול חיפוי חיצוני בפרויקט:</label>
                    <input
                      type="checkbox"
                      checked={toggles.includeExteriorCladding}
                      onChange={(e) => updateToggle('includeExteriorCladding', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      id="include-exterior-cladding-checkbox"
                    />
                  </div>
                </div>

                {toggles.includeExteriorCladding && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        חיפוי חיצוני מעוצב במחירון
                      </label>
                      <select
                        value={project.wallRoof.claddingExterior || ''}
                        onChange={(e) => handleWallRoofChange('claddingExterior', e.target.value as ExteriorCladding)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        id="exterior-cladding-wiz"
                      >
                        {exteriorCladdings.length === 0 ? (
                          <option value="" disabled>
                            {NO_MATERIALS_MESSAGE}
                          </option>
                        ) : (
                          <>
                            <option value="none">ללא (הפנל המבודד כמעטפת סופית)</option>
                            {exteriorCladdings.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {exteriorCladdings.length === 0 && <EmptyCatalogNotice categoryLabel="חיפוי חיצוני" />}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="font-extrabold text-blue-800 block">סרגלי אלומיניום, פלאשניגים ואיטום היקפי:</span>
                      <p>סרגלי סגירה, זוויות פינה חיצוניות, מסטיק סיליקון ניטרלי ואיטום מרזבי ניקוז גג כלולים באופן אוטומטי.</p>
                    </div>
                  </div>
                )}
              </div>

              <StepAddOns
                step={4}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 5: גלגלים וג'קים */}
          {currentStep === 5 && toggles.includeWheels && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-extrabold text-slate-900">גלגלים תעשייתיים ובסיס נייד</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">כמות גלגלים</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={project.wheels.quantity || 4}
                    onChange={(e) => handleWheelsChange('quantity', parseInt(e.target.value) || 4)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">סוג גלגל במחירון</label>
                  <select
                    value={project.wheels.wheelType || ''}
                    onChange={(e) => {
                      const type = e.target.value;
                      const selectedWheel = catalog.find((c) => c.id === type);
                      onUpdateProject({
                        ...project,
                        wheels: {
                          ...project.wheels,
                          wheelType: type as WheelType,
                          unitPrice: selectedWheel ? selectedWheel.defaultUnitPrice : project.wheels.unitPrice,
                        },
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    id="wheel-type-select-wiz"
                  >
                    {wheelTypes.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      wheelTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                        </option>
                      ))
                    )}
                  </select>
                  {wheelTypes.length === 0 && <EmptyCatalogNotice categoryLabel="גלגלים תעשייתיים" />}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">עומס מבוקש לגלגל (ק"ג)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={weight.effectiveLoadPerWheelKg}
                    onChange={(e) =>
                      onUpdateProject({
                        ...project,
                        wheels: {
                          ...project.wheels,
                          loadCapacityPerWheelKg: parseFloat(e.target.value) || 0,
                          loadCapacityManual: true,
                        },
                      })
                    }
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 ${
                      project.wheels.loadCapacityManual
                        ? 'border-blue-300 bg-blue-50/40'
                        : 'border-emerald-300 bg-emerald-50/40'
                    }`}
                    id="wheel-load-input-wiz"
                  />
                  {project.wheels.loadCapacityManual ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProject({
                          ...project,
                          wheels: { ...project.wheels, loadCapacityManual: false },
                        })
                      }
                      className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>חזרה לחישוב אוטומטי ({weight.recommendedLoadPerWheelKg} ק"ג)</span>
                    </button>
                  ) : (
                    <span className="mt-1 block text-[10px] font-semibold text-emerald-700">
                      נקבע אוטומטית לפי משקל המבנה: {weight.totalGrossWeightKg} ק"ג ÷ {project.wheels.quantity || 4} גלגלים + 25% מקדם ביטחון
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">מחיר יחידה לגלגל (₪)</label>
                  <input
                    type="number"
                    step="any"
                    value={project.wheels.unitPrice || 0}
                    onChange={(e) => handleWheelsChange('unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    id="wheel-unit-price-wiz"
                  />
                </div>
              </div>

              {/* Structural & Weight Summary Banner */}
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                weight.isOverweight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {weight.isOverweight ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {weight.isOverweight ? 'חריגת משקל!' : 'כושר גלגלים תואם!'}
                  </span>
                  <span className="text-[11px] opacity-90">
                    משקל: {weight.totalGrossWeightKg.toLocaleString()} ק"ג | כושר: {weight.totalWheelCapacityKg.toLocaleString()} ק"ג
                  </span>
                </div>
              </div>

              {/* Wheel Step Total */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs text-orange-900 flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold">סה"כ גלגלים בשלב (מחיר יחידה × כמות):</span>
                <span className="font-mono font-extrabold">
                  {(project.wheels.quantity || 4).toLocaleString()} × ₪{(project.wheels.unitPrice || 0).toLocaleString()} = ₪{((project.wheels.quantity || 4) * (project.wheels.unitPrice || 0)).toLocaleString()}
                </span>
              </div>

              <StepAddOns
                step={5}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 6: פתחים */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-blue-600" />
                    <span>פתחים במעטפת - דלתות וחלונות ({project.openings.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">הגדר את כמות ומידות הפתחים (מנוכים משטח הפנל בחישוב BOM)</p>
                </div>

                <button
                  onClick={addOpening}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  id="add-opening-step6-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף פתח</span>
                </button>
              </div>

              {project.openings.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  טרם הוגדרו פתחים. לחץ על "הוסף פתח" להוספת חלון או דלת.
                </div>
              ) : (
                <div className="space-y-2">
                  {project.openings.map((op) => (
                    <div key={op.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 text-xs items-center min-w-0">
                      <div className="col-span-4 min-w-0">
                        <select
                          value={op.doorProfile || ''}
                          onChange={(e) => {
                            const selId = e.target.value;
                            const mat = catalog.find((m) => m.id === selId);
                            updateOpening(op.id, {
                              doorProfile: selId,
                              pricePerUnit: mat ? mat.defaultUnitPrice : op.pricePerUnit,
                              title: mat ? mat.name : op.title,
                              widthCm: mat?.defaultWidthCm || op.widthCm || 100,
                              heightCm: mat?.defaultHeightCm || op.heightCm || 190,
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition"
                          id={`opening-select-${op.id}`}
                        >
                          {openingItems.length === 0 ? (
                            <option value="" disabled>
                              {NO_MATERIALS_MESSAGE}
                            </option>
                          ) : (
                            openingItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} - ₪{item.defaultUnitPrice} / {item.unit}{item.defaultWidthCm ? ` (${item.defaultWidthCm}×${item.defaultHeightCm} ס"מ)` : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <input
                          type="number"
                          value={op.widthCm || 100}
                          onChange={(e) => updateOpening(op.id, { widthCm: parseInt(e.target.value) || 10 })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition"
                          placeholder='רוחב'
                        />
                      </div>

                      <div className="col-span-2 min-w-0">
                        <input
                          type="number"
                          value={op.heightCm || 190}
                          onChange={(e) => updateOpening(op.id, { heightCm: parseInt(e.target.value) || 10 })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition"
                          placeholder='גובה'
                        />
                      </div>

                      <div className="col-span-2 min-w-0 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={op.quantity}
                          onChange={(e) => updateOpening(op.id, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm font-extrabold text-emerald-700 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition"
                        />
                      </div>

                      <div className="col-span-1 min-w-0 flex items-center justify-center">
                        <button
                          onClick={() => removeOpening(op.id)}
                          className="p-2 text-emerald-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <StepAddOns
                step={6}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 7: חשמל */}
          {currentStep === 7 && toggles.includeElectrical && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">נקודות פרטניות (Detailed Point Breakdown)</span>
                  <span className="text-[11px] text-slate-500">שרטט את הנקודות על גבי הקנבס, או הזן כמות לכל קטגוריה ליצירת שורות ידניות.</span>
                </div>
                {renderPointCategoryEditor('switches', project.electrical.pointDetails?.switches || [])}
                {renderPointCategoryEditor('outlets', project.electrical.pointDetails?.outlets || [])}
                {renderPointCategoryEditor('powerOutlets', project.electrical.pointDetails?.powerOutlets || [])}
                {renderPointCategoryEditor('lighting', project.electrical.pointDetails?.lighting || [])}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    מרחק ארון החשמל מהזנה ראשית/חיצונית (מטרים)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.electrical.feedDistanceMeters}
                    onChange={(e) => handleElectricalChange('feedDistanceMeters', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="elec-feed-distance-wiz"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    מיקום ארון החשמל במבנה
                  </label>
                  <select
                    value={project.electrical.panelLocation || 'corner'}
                    onChange={(e) => handleElectricalChange('panelLocation', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="elec-panel-location-wiz"
                  >
                    <option value="corner">פינה</option>
                    <option value="wall_center">מרכז קיר</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
                <span>סה"כ חיווט 2.5 מ"מ (שקעים): <b className="text-blue-800">{elecCalc.wiring25mmMeters} מ'</b></span>
                <span>סה"כ חיווט 4 מ"מ (שקעי כוח): <b className="text-blue-800">{elecCalc.wiring4mmMeters} מ'</b></span>
                <span>סה"כ חיווט 1.5 מ"מ (תאורה ומתגים): <b className="text-blue-800">{elecCalc.wiring15mmMeters} מ'</b></span>
                <span>הזנה ראשית לארון: <b className="text-blue-800">{elecCalc.feedDistanceMeters} מ' כבל + צנרת</b></span>
              </div>

              {/* Interactive Electrical Canvas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-600" />
                    שרטוט חשמל אינטראקטיבי (Interactive Electrical Canvas)
                  </span>
                  <span className="text-[11px] text-slate-500">תכנון לפי מידות החדר - המרחקים מחושבים לפי קנה המידה</span>
                </div>
                <ElectricalCanvas
                  lengthMeters={project.dimensions.length}
                  widthMeters={project.dimensions.width}
                  canvas={canvasData}
                  tool={canvasTool}
                  selectedPointId={selectedCanvasPointId}
                  labelsById={canvasLabelsById}
                  onSetTool={setCanvasTool}
                  onSelectPoint={setSelectedCanvasPointId}
                  onPlacePanel={handleCanvasPlacePanel}
                  onPlacePoint={handleCanvasPlacePoint}
                  onMovePoint={handleCanvasMovePoint}
                  onMovePanel={handleCanvasMovePanel}
                  onChainPoints={handleCanvasChainPoints}
                  onEnsurePanelFeed={handleCanvasEnsurePanelFeed}
                  onErasePoint={handleCanvasErasePoint}
                />

                {/* Properties panel for the selected point */}
                {selectedCanvasPoint && selectedCanvasRow && selectedCanvasRowIndex >= 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-blue-200 rounded-xl p-4">
                    <div className="space-y-2">
                      <span className="block text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: POINT_CATEGORY_COLORS[selectedCanvasPoint.category] }} />
                        מאפייני נקודה: {POINT_CATEGORY_LABELS[selectedCanvasPoint.category]}
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">שם/תיאור הנקודה</label>
                        <input
                          type="text"
                          value={selectedCanvasRow.label}
                          onChange={(e) => handlePointDetailChange(selectedCanvasPoint.category, selectedCanvasRowIndex, 'label', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                          placeholder="למשל: שקע כוח תנור"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">מקור הזנה (Fed From)</label>
                        <select
                          value={selectedCanvasPoint.fedFrom || ''}
                          onChange={(e) => handleCanvasSetFedFrom(selectedCanvasPoint.id, e.target.value || null)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="">לוח חשמל (הזנה ישירה)</option>
                          {canvasData.points
                            .filter((p) => p.id !== selectedCanvasPoint.id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {canvasLabelsById[p.id] || POINT_CATEGORY_LABELS[p.category]}
                              </option>
                            ))}
                        </select>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {selectedCanvasPoint.fedFrom ? 'הנקודה מוזנת בשרשור (מהנקודה שנבחרה)' : 'הנקודה מוזנת ישירות מלוח החשמל'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">גובה מהרצפה (מ')</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedCanvasRow.heightMeters}
                            onChange={(e) => handlePointDetailChange(selectedCanvasPoint.category, selectedCanvasRowIndex, 'heightMeters', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">סרח/רזרבה (מ')</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedCanvasRow.reserveMeters}
                            onChange={(e) => handlePointDetailChange(selectedCanvasPoint.category, selectedCanvasRowIndex, 'reserveMeters', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 text-xs">
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-slate-600 font-semibold">
                          מרחק דרך הקירות {selectedCanvasPoint.fedFrom ? '(מנקודת השרשור)' : '(מהלוח)'}
                        </span>
                        <b className="text-blue-800">{selectedCanvasRow.distanceMeters.toFixed(2)} מ'</b>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-slate-600 font-semibold">
                          אורך כבל כולל {selectedCanvasPoint.fedFrom ? '(מרחק+הפרש גבהים+סרח כפול)' : '(מרחק+גובה+סרח)'}
                        </span>
                        <b className="text-emerald-700">{calcEffectivePointLength(selectedCanvasRow, feedRowFor(selectedCanvasRow)).toFixed(2)} מ'</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCanvasErasePoint(selectedCanvasPoint.id)}
                        className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-2 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        מחיקת נקודה מהשרטוט
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-500">
                    בחר נקודה בקנבס (בכלי 'בחירה / הזזה') כדי להגדיר גובה מהרצפה וסרח/רזרבה.
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 space-y-1.5">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  חישוב תאורה הנדסי
                </span>
                <span className="block">
                  עבור חדר בגודל {areas.floorArea} מ"ר מומלץ סה"כ {elecCalc.lightingRecommendedLumens.toLocaleString()} לומן ≈ {elecCalc.lightingRecommendedFixtures} גופי תאורה LED של 24W (סטנדרט של ~200 לוקס).
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    לוח חשמל במחירון
                  </label>
                  <select
                    value={project.electrical.mainPanelType || ''}
                    onChange={(e) => handleElectricalChange('mainPanelType', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="main-panel-wiz"
                  >
                    {electricalPanels.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      electricalPanels.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                        </option>
                      ))
                    )}
                  </select>
                  {electricalPanels.length === 0 && <EmptyCatalogNotice categoryLabel="לוחות חשמל" />}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    אופן התקנת צנרת החשמל
                  </label>
                  <select
                    value={project.electrical.installationType || 'hidden_in_panel'}
                    onChange={(e) => handleElectricalChange('installationType', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="elec-install-wiz"
                  >
                    <option value="hidden_in_panel">התקנה נסתרת (בתוך הפנל המבודד)</option>
                    <option value="exposed_conduits">התקנה גלויה בתעלות PVC / גיווי</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-3">
                <span className="font-extrabold block">גזירת לוח חלוקה (Distribution Board):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
                  <span>מאז"ר תאורה 10A — 1 יח' לכל {10} נקודות תאורה/מתג</span>
                  <b>{elecCalc.lightingMcbCount}</b>
                  <span>מאז"ר שקעים 16A — 1 יח' לכל {6} שקעים רגילים</span>
                  <b>{elecCalc.outletMcbCount}</b>
                  <span>מאז"ר ייעודי לכל שקע כוח</span>
                  <b>{elecCalc.powerMcbCount}</b>
                  <span>מאז"ר ראשי</span>
                  <b>{elecCalc.mainMcbCount}</b>
                  <span>מפסק פחת 30mA</span>
                  <b>{elecCalc.rcdCount}</b>
                </div>
                <span className="block pt-2 border-t border-blue-200">
                  סה"כ בלוקים: {elecCalc.panelModulesRequired} ({elecCalc.totalBreakers} מאז"רים + פחת) + 20% רזרבה = {elecCalc.panelModulesWithReserve} → <b>ארון {elecCalc.panelSizeLabel}</b>
                </span>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs text-orange-900 space-y-2">
                <span className="font-extrabold block">רכיבים נגזרים לרשימת רכישה (סה"כ לפי נקודות פרטניות):</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                  <span>כבל הזנה ראשית</span>
                  <b>{elecCalc.mainFeedCableMeters} מ'</b>
                  <span>חיווט 4 מ"מ (שקעי כוח - קו ישיר)</span>
                  <b>{elecCalc.wiring4mmMeters} מ'</b>
                  <span>חיווט 2.5 מ"מ (שקעים רגילים)</span>
                  <b>{elecCalc.wiring25mmMeters} מ'</b>
                  <span>חיווט 1.5 מ"מ (תאורה ומתגים)</span>
                  <b>{elecCalc.wiring15mmMeters} מ'</b>
                  <span>קופסאות חיבור (גביס)</span>
                  <b>{elecCalc.junctionBoxes}</b>
                  <span>צינור חשמל</span>
                  <b>{elecCalc.conduitMeters} מ'</b>
                  <span>תפסנים לקיבוע צינור</span>
                  <b>{elecCalc.conduitClips}</b>
                  <span>מהדקי WAGO / שוקולדים</span>
                  <b>{elecCalc.wagoConnectors}</b>
                  {elecCalc.chainJunctionCount > 0 && (
                    <>
                      <span>מהדקי WAGO לשרשור (קופסאות מעבר)</span>
                      <b>{elecCalc.chainWagoConnectors}</b>
                    </>
                  )}
                </div>
              </div>

              <StepAddOns
                step={7}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 8: מיזוג */}
          {currentStep === 8 && toggles.includeHVAC && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    סוג/תפוקת המזגן במחירון
                  </label>
                  <select
                    value={project.hvac?.airConditioner || project.electrical.airConditioner || ''}
                    onChange={(e) => handleHVACChange({ airConditioner: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    id="ac-type-wiz"
                  >
                    {acUnits.length === 0 ? (
                      <option value="" disabled>
                        {NO_MATERIALS_MESSAGE}
                      </option>
                    ) : (
                      <>
                        <option value="none">ללא מזגן</option>
                        {acUnits.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {acUnits.length === 0 && <EmptyCatalogNotice categoryLabel="מזגנים" />}
                </div>

                {/* Venta sub-section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">ונטות / מפוחי פינוי אוויר</span>
                    <input
                      type="checkbox"
                      checked={project.hvac?.venta?.enabled ?? false}
                      onChange={(e) =>
                        handleHVACChange({
                          venta: {
                            ...(project.hvac?.venta || { quantity: 1, diameterInch: 4, direction: 'exhaust' }),
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      id="venta-enabled-checkbox"
                    />
                  </div>

                  {project.hvac?.venta?.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">כמות</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={project.hvac.venta.quantity || 1}
                          onChange={(e) =>
                            handleHVACChange({
                              venta: {
                                ...project.hvac!.venta,
                                quantity: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded p-1.5 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-1">דגם ונטה במחירון</label>
                        <select
                          value={project.hvac?.venta?.itemId || (ventilations.length > 0 ? ventilations[0].id : '')}
                          onChange={(e) =>
                            handleHVACChange({
                              venta: {
                                ...project.hvac!.venta,
                                itemId: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs"
                        >
                          {ventilations.length === 0 ? (
                            <option value="" disabled>
                              {NO_MATERIALS_MESSAGE}
                            </option>
                          ) : (
                            ventilations.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} - ₪{item.defaultUnitPrice} / {item.unit}
                              </option>
                            ))
                          )}
                        </select>
                        {ventilations.length === 0 && <EmptyCatalogNotice categoryLabel="ונטות ואוורור" />}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <StepAddOns
                step={8}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* STEP 9: חומרי עזר ואיטום */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                <span className="font-extrabold text-blue-800 block">חומרי עזר, פרזול ואיטום היקפי:</span>
                <p>סרגלי סגירה, זוויות פינה חיצוניות, מסטיק סיליקון ניטרלי, ברגים, מקדחים ואיטום מרזבי ניקוז גג. כל הפריטים מקטגוריית "חומרי עזר" במחירון נכללים אוטומטית בכתב הכמויות (BOM) ובהצעת המחיר.</p>
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>פריטי חומרי עזר במחירון ({hardwareItems.length}):</span>
                </h4>
                {hardwareItems.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    לא הוגדרו חומרי עזר במחירון.
                    {onGoToCatalog && (
                      <button
                        type="button"
                        onClick={onGoToCatalog}
                        className="text-orange-700 hover:text-orange-800 font-extrabold underline flex items-center gap-1 cursor-pointer shrink-0 mt-2 mx-auto"
                      >
                        <span>עבור למחירון להוספה</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {hardwareItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-slate-500">₪{item.defaultUnitPrice} / {item.unit}</span>
                        {item.notes && <span className="text-[10px] text-slate-400 block mt-1">{item.notes}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <StepAddOns
                step={9}
                project={project}
                catalog={catalog}
                onUpdateProject={onUpdateProject}
                onGoToCatalog={onGoToCatalog}
              />
            </div>
          )}

          {/* Wizard Footer Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 gap-4">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                currentStep === 1
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
              id="wizard-prev-step-btn"
            >
              <ChevronRight className="w-4 h-4" />
              <span>השלב הקודם</span>
            </button>

            <div className="flex items-center gap-2">
              {currentStep < 9 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(9, prev + 1))}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer shadow-xs"
                  id="wizard-next-step-btn"
                >
                  <span>השלב הבא</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onGoToBOM}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
                    id="wizard-finish-bom-btn"
                  >
                    <Calculator className="w-4 h-4 text-orange-400" />
                    <span>צפה בכתב כמויות (BOM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onGoToQuote}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-xs"
                    id="wizard-finish-quote-btn"
                  >
                    <FileText className="w-4 h-4" />
                    <span>הפק הצעת מחיר מרוכזת</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>

      {/* Fixed Right Sidebar */}
      <div className="fixed top-32 right-0 h-[calc(100vh-8rem)] w-80 overflow-y-auto bg-white border-l border-slate-200 p-5 space-y-5 shadow-lg z-40">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <span>סיכום עלויות בזמן אמת</span>
            </h3>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              מעודכן תמיד
            </span>
          </div>

          {/* Core Financial Metrics */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">עלות חומרי גלם (BOM):</span>
              <span className="font-bold text-slate-900">₪{quote.materialsCost.toLocaleString()}</span>
            </div>

            <div className="py-1 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 font-medium">עלות עבודה והרכבה:</span>
                <span className={`font-extrabold ${quote.laborCost > 0 ? 'text-orange-700' : 'text-slate-500'}`}>
                  ₪{(quote.laborCost || 0).toLocaleString()}
                </span>
              </div>
              
              {/* Zero labor safety display or labor breakdown */}
              {quote.laborCost === 0 ? (
                <div className="mt-1.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-semibold space-y-1">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1 text-slate-800">
                    <span>חישוב סופי לפרויקט:</span>
                    <span className="text-amber-800 font-mono font-bold">₪{(quote.subtotalBeforeMargin || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono pt-0.5 dir-rtl">
                    עלות חומרים: ₪{(quote.materialsCost || 0).toLocaleString()} | עלות עבודה: 0 ש"ח | סה"כ לפרויקט: ₪{(quote.subtotalBeforeMargin || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    (לא הוגדרו תעריפי עבודה במחירון – עלות העבודה מחושבת כ-0 ש"ח)
                  </div>
                </div>
              ) : (
                quote.laborBreakdown && quote.laborBreakdown.length > 0 && (
                  <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                    <span className="font-extrabold text-slate-700 text-[10px] block border-b border-slate-200 pb-1">
                      מנוע תמחור עבודה אוטומטי (Smart Pricing Mapper):
                    </span>
                    {quote.laborBreakdown.map((item) => (
                      <div key={item.id} className="flex flex-col text-slate-600 py-0.5">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="font-mono text-[10px] text-blue-700 font-medium">{item.formulaText}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">סה"כ עלות ישירה:</span>
              <span className="font-bold text-slate-900">₪{quote.subtotalBeforeMargin.toLocaleString()}</span>
            </div>

            {/* Contractor Margin Slider */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-semibold text-[11px]">אחוז רווח תפעולי:</span>
                <span className="font-black text-orange-600 text-sm">{project.contractorMarginPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={project.contractorMarginPercent}
                onChange={(e) => onUpdateProject({ ...project, contractorMarginPercent: parseInt(e.target.value) || 0 })}
                className="w-full accent-orange-600 cursor-pointer"
                id="contractor-margin-wiz-slider"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>רווח קבלן בש"ח:</span>
                <span className="font-bold text-slate-700">₪{quote.contractorMarginAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">מע"מ ({(project.vatEnabled ?? true) ? `${Math.round(quote.vatRate * 100)}%` : '0% - מבוטל'}):</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">
                  ₪{((project.vatEnabled ?? true) ? quote.vatAmount : 0).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateProject({ ...project, vatEnabled: !(project.vatEnabled ?? true) })}
                  className={`relative w-10 h-5 rounded-full transition cursor-pointer ${
                    (project.vatEnabled ?? true) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  id="vat-toggle-btn"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition ${
                      (project.vatEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Final Client Price Highlight */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 text-center space-y-1">
              <span className="text-orange-950 text-[11px] font-bold block">
                {(project.vatEnabled ?? true) ? 'מחיר מרוכז ללקוח (כולל מע"מ)' : 'מחיר מרוכז ללקוח (ללא מע"מ)'}
              </span>
              <span className="text-2xl font-black text-orange-600 block">
                ₪{((project.vatEnabled ?? true) ? quote.totalClientPriceWithVat : quote.totalClientPrice).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Output Generation CTAs */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onGoToBOM}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              id="wiz-goto-bom-btn"
            >
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>1. כתב כמויות ורשימת קניות (BOM)</span>
            </button>

            <button
              onClick={onGoToQuote}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-orange-600/20"
              id="wiz-goto-quote-btn"
            >
              <FileText className="w-4 h-4" />
              <span>2. הצעת מחיר מרוכזת ללקוח</span>
            </button>
          </div>
      </div>
    </>
  );
};
