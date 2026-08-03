import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ElectricalCanvasData,
  ElectricalCanvasPoint,
  ElectricalPointCategory,
} from '../types';
import { calcPerimeterRouteMeters } from '../utils/calculations';
import { MousePointer2, Zap, Plug, Power, ToggleRight, Lightbulb, Cable, Eraser } from 'lucide-react';

// כלי השרטוט הזמינים בסרגל: בחירה/הזזה, לוח חשמל, קטגוריות נקודות, חיווט ומחיקה
export type CanvasTool = 'select' | 'wire' | 'erase' | 'panel' | ElectricalPointCategory;

export interface ElectricalCanvasProps {
  lengthMeters: number;
  widthMeters: number;
  canvas: ElectricalCanvasData;
  tool: CanvasTool;
  selectedPointId: string | null;
  labelsById?: Record<string, string>;
  onSetTool: (tool: CanvasTool) => void;
  onSelectPoint: (id: string | null) => void;
  onPlacePanel: (x: number, y: number) => void;
  onPlacePoint: (category: ElectricalPointCategory, x: number, y: number) => void;
  onMovePoint: (id: string, x: number, y: number) => void;
  onMovePanel: (x: number, y: number) => void;
  onChainPoints: (fromId: string, toId: string) => void;
  onEnsurePanelFeed: (id: string) => void;
  onErasePoint: (id: string) => void;
}

const POINT_COLORS: Record<ElectricalPointCategory, string> = {
  switches: '#f97316',
  outlets: '#2563eb',
  powerOutlets: '#7c3aed',
  lighting: '#eab308',
};

const POINT_SHORT_LABELS: Record<ElectricalPointCategory, string> = {
  switches: 'מתג',
  outlets: 'שקע',
  powerOutlets: 'שקע כוח',
  lighting: 'תאורה',
};

const TOOL_BUTTONS: { tool: CanvasTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tool: 'select', label: 'בחירה / הזזה', icon: MousePointer2 },
  { tool: 'panel', label: 'לוח חשמל', icon: Zap },
  { tool: 'outlets', label: 'שקע רגיל', icon: Plug },
  { tool: 'powerOutlets', label: 'שקע כוח', icon: Power },
  { tool: 'switches', label: 'מתג', icon: ToggleRight },
  { tool: 'lighting', label: 'גוף תאורה', icon: Lightbulb },
  { tool: 'wire', label: 'חיווט / שרשור', icon: Cable },
  { tool: 'erase', label: 'מחיקה', icon: Eraser },
];

type Hit = { id: string; isPanel: boolean; category?: ElectricalPointCategory };

// אייקוני חשמל תקניים לשרטוט (במערכת קואורדינטות יחידה, מוקטנים בקנה המידה של החדר)
const PointIcon: React.FC<{ category: ElectricalPointCategory; color: string; scale: number }> = ({ category, color, scale }) => (
  <g
    transform={`scale(${scale})`}
    fill="rgba(255,255,255,0.78)"
    stroke={color}
    strokeWidth={0.18}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {category === 'switches' && (
      <>
        <rect x={-0.5} y={-0.42} width={1} height={0.84} rx={0.22} />
        <line x1={0} y1={-0.26} x2={0} y2={0.26} strokeWidth={0.2} />
      </>
    )}
    {category === 'outlets' && (
      <>
        <path d="M -0.5 0 A 0.5 0.5 0 0 1 0.5 0" />
        <line x1={-0.24} y1={0.02} x2={-0.24} y2={0.42} />
        <line x1={0.24} y1={0.02} x2={0.24} y2={0.42} />
      </>
    )}
    {category === 'powerOutlets' && (
      <>
        <path d="M -0.5 0 A 0.5 0.5 0 0 1 0.5 0" />
        <line x1={-0.24} y1={0.02} x2={-0.24} y2={0.42} />
        <line x1={0.24} y1={0.02} x2={0.24} y2={0.42} />
        <polygon points="-0.02,-0.4 0.14,-0.14 -0.02,-0.14 0.04,0.02 -0.18,-0.3 0,-0.3 -0.1,-0.4" fill={color} stroke="none" />
      </>
    )}
    {category === 'lighting' && (
      <>
        <circle cx={0} cy={0} r={0.46} />
        <line x1={-0.28} y1={-0.28} x2={0.28} y2={0.28} strokeWidth={0.2} />
        <line x1={-0.28} y1={0.28} x2={0.28} y2={-0.28} strokeWidth={0.2} />
      </>
    )}
  </g>
);

// אייקון לוח חשמל - ארון/לוח תקשורת עם דלת וידית
const PanelIcon: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
  <g
    transform={`scale(${scale})`}
    fill="rgba(255,255,255,0.85)"
    stroke={color}
    strokeWidth={0.18}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x={-0.5} y={-0.55} width={1} height={1.1} rx={0.14} />
    <line x1={0.2} y1={-0.55} x2={0.2} y2={0.55} strokeWidth={0.12} />
    <circle cx={0.34} cy={0} r={0.09} fill={color} stroke="none" />
  </g>
);

export const ElectricalCanvas: React.FC<ElectricalCanvasProps> = ({
  lengthMeters,
  widthMeters,
  canvas,
  tool,
  selectedPointId,
  labelsById,
  onSetTool,
  onSelectPoint,
  onPlacePanel,
  onPlacePoint,
  onMovePoint,
  onMovePanel,
  onChainPoints,
  onEnsurePanelFeed,
  onErasePoint,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Hit | null>(null);

  // כלי החיווט פועל במצב רציף (Continuous Chain Wiring):
  // 1) לחיצה ראשונה על נקודה לא-מוזנת - היא מחוברת אוטומטית אל לוח החשמל
  //    ונעשית "נקודה פעילה" (Active Node, עיגול מקווקו כתום).
  // 2) כל לחיצה הבאה על נקודה אחרת מותחת קו מהנקודה הפעילה אליה,
  //    והנקודה שנלחצה הופכת לנקודה הפעילה החדשה - וכך ניתן לשרשר רצף אין-סופי.
  const [wireStartId, setWireStartId] = useState<string | null>(null);

  useEffect(() => {
    if (tool !== 'wire') setWireStartId(null);
  }, [tool]);

  const L = Math.max(0.5, lengthMeters || 3);
  const W = Math.max(0.5, widthMeters || 2);

  // רוחב רנדור משוער של הקנבס בפיקסלים - לצורך קנה מידה פרופורציונלי בין גודל החדר לגודל הרכיבים
  const PIX_APPROX = 760;
  // המרת פיקסלים על המסך ליחידות שרטוט (מטרים), כך שרכיבים קטנים נשארים קטנים בכל חדר
  const px = (pixels: number) => (pixels * (L + 1.8)) / PIX_APPROX;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  // הצמדה קשיחה: שקעים/מתגים/לוח נעולים (Locked) על קו הקיר הקרוב מבין 4 הקירות.
  // יוצא דופן - תאורה בלבד חופשית בתוך החדר (תקרה) ומוצמדת לרשת 0.5מ'.
  const snapPosition = (pos: { x: number; y: number }, category?: ElectricalPointCategory) => {
    let { x, y } = pos;
    if (category === 'lighting') {
      x = Math.round(x / 0.5) * 0.5;
      y = Math.round(y / 0.5) * 0.5;
    } else {
      const dLeft = x;
      const dRight = L - x;
      const dTop = y;
      const dBottom = W - y;
      const min = Math.min(dLeft, dRight, dTop, dBottom);
      if (min === dLeft) x = 0;
      else if (min === dRight) x = L;
      else if (min === dTop) y = 0;
      else y = W;
    }
    return { x: Math.round(clamp(x, 0, L) * 100) / 100, y: Math.round(clamp(y, 0, W) * 100) / 100 };
  };

  const isOnWall = (x: number, y: number) => x <= 1e-6 || x >= L - 1e-6 || y <= 1e-6 || y >= W - 1e-6;

  // נקודת אמצע לאורך קו הניתוב (כולל קטע "ירידה" לתקרה עבור תאורה) עם היסט פנימה מהקיר
  const midPointOf = (pts: { x: number; y: number }[]): { x: number; y: number; ox: number; oy: number } => {
    if (pts.length < 2) return { x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, ox: 0, oy: 0 };
    const segLen = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const total = pts.reduce((s, pt, i) => (i === 0 ? s : s + segLen(pts[i - 1], pt)), 0);
    const half = total / 2;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = segLen(pts[i - 1], pts[i]);
      if (acc + len >= half) {
        const t = (half - acc) / Math.max(1e-9, len);
        const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
        const y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
        let ox = 0;
        let oy = 0;
        if (Math.abs(y) < 1e-6) oy = px(10);
        else if (Math.abs(y - W) < 1e-6) oy = -px(10);
        else if (Math.abs(x) < 1e-6) ox = px(10);
        else if (Math.abs(x - L) < 1e-6) ox = -px(10);
        return { x, y, ox, oy };
      }
      acc += len;
    }
    const last = pts[pts.length - 1];
    return { x: last.x, y: last.y, ox: 0, oy: 0 };
  };

  // המרת קואורדינטות מסך (clientX/Y) לקואורדינטות שרטוט במטרים
  const metersFromEvent = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(L, p.x)),
      y: Math.max(0, Math.min(W, p.y)),
    };
  };

  const hitTest = (pos: { x: number; y: number }): Hit | null => {
    const threshold = Math.max(px(20), 0.08);
    let best: { hit: Hit; dist: number } | null = null;
    if (canvas.panel) {
      const d = Math.hypot(pos.x - canvas.panel.x, pos.y - canvas.panel.y);
      if (d <= threshold) best = { hit: { id: 'panel', isPanel: true }, dist: d };
    }
    canvas.points.forEach((p) => {
      const d = Math.hypot(pos.x - p.x, pos.y - p.y);
      if (d <= threshold && (!best || d < best.dist)) {
        best = { hit: { id: p.id, isPanel: false }, dist: d };
      }
    });
    return best ? best.hit : null;
  };

  const handleShapePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    id: string,
    isPanel: boolean,
    category?: ElectricalPointCategory
  ) => {
    if (tool !== 'select') return; // במצבים אחרים האירוע "בורח" ל-svg לצורך חיווט/מחיקה/הצבה
    e.stopPropagation();
    const pos = metersFromEvent(e);
    if (!pos) return;
    dragRef.current = { id, isPanel, category };
    svgRef.current?.setPointerCapture(e.pointerId);
    onSelectPoint(isPanel ? null : id);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) return;
    const pos = metersFromEvent(e);
    if (!pos) return;
    const hit = hitTest(pos);
    if (tool === 'select') {
      if (hit) {
        dragRef.current = hit;
        svgRef.current?.setPointerCapture(e.pointerId);
        onSelectPoint(hit.isPanel ? null : hit.id);
      } else {
        onSelectPoint(null);
      }
    } else if (tool === 'wire') {
      if (!hit) {
        // לחיצה על אזור ריק מבטלת את הנקודה הפעילה (המצב נשאר פעיל לשרשור הבא)
        setWireStartId(null);
        onSelectPoint(null);
      } else if (!hit.isPanel) {
        if (!wireStartId) {
          // לחיצה ראשונה: חיבור אוטומטי של הנקודה אל לוח החשמל בקו צמוד-קיר (אם אינה מוזנת),
          // והגדרתה כ"נקודה פעילה" להמשך השרשרת
          onEnsurePanelFeed(hit.id);
          setWireStartId(hit.id);
          onSelectPoint(hit.id);
        } else if (wireStartId === hit.id) {
          // לחיצה חוזרת על אותה נקודה פעילה - ביטול הבחירה
          setWireStartId(null);
          onSelectPoint(null);
        } else {
          // לחיצה על נקודה אחרת: מותחת קו מהנקודה הפעילה אליה, והיא הופכת לנקודה הפעילה החדשה
          onChainPoints(wireStartId, hit.id);
          setWireStartId(hit.id);
          onSelectPoint(hit.id);
        }
      }
    } else if (tool === 'erase') {
      if (hit && !hit.isPanel) onErasePoint(hit.id);
    } else if (tool === 'panel') {
      const snapped = snapPosition(pos);
      onPlacePanel(snapped.x, snapped.y);
    } else {
      const snapped = snapPosition(pos, tool);
      onPlacePoint(tool, snapped.x, snapped.y);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pos = metersFromEvent(e);
    if (!pos) return;
    const snapped = snapPosition(pos, drag.isPanel ? undefined : drag.category);
    if (drag.isPanel) onMovePanel(snapped.x, snapped.y);
    else onMovePoint(drag.id, snapped.x, snapped.y);
  };

  const handleSvgPointerUp = () => {
    dragRef.current = null;
  };

  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const step05 = 0.5;
    const step1 = 1;
    for (let x = step1; x < L; x += step1) {
      lines.push(<line key={`g1x${x}`} x1={x} y1={0} x2={x} y2={W} stroke="#94a3b8" strokeWidth={0.02} strokeOpacity={0.15} />);
    }
    for (let y = step1; y < W; y += step1) {
      lines.push(<line key={`g1y${y}`} x1={0} y1={y} x2={L} y2={y} stroke="#94a3b8" strokeWidth={0.02} strokeOpacity={0.15} />);
    }
    for (let x = step05; x < L; x += step05) {
      if (x % 1 === 0) continue;
      lines.push(<line key={`g5x${x}`} x1={x} y1={0} x2={x} y2={W} stroke="#94a3b8" strokeWidth={0.012} strokeOpacity={0.06} />);
    }
    for (let y = step05; y < W; y += step05) {
      if (y % 1 === 0) continue;
      lines.push(<line key={`g5y${y}`} x1={0} y1={y} x2={L} y2={y} stroke="#94a3b8" strokeWidth={0.012} strokeOpacity={0.06} />);
    }
    return lines;
  }, [L, W]);

  const cursor =
    tool === 'select' ? 'default' : tool === 'wire' ? 'crosshair' : tool === 'erase' ? 'not-allowed' : 'crosshair';

  return (
    <div className="space-y-3">
      {/* Drawing Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2">
        {TOOL_BUTTONS.map(({ tool: t, label, icon: Icon }) => {
          const active = tool === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSetTool(active ? 'select' : t)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`-0.9 -1 ${L + 1.8} ${W + 2}`}
          className="w-full h-auto rounded-xl bg-white border border-slate-300 shadow-sm select-none"
          style={{ touchAction: 'none', cursor }}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerUp}
        >
          {/* ריצוף רשת (רשת כל 0.5/1 מטר) */}
          {gridLines}

          {/* היקף החדר */}
          <rect
            x={0}
            y={0}
            width={L}
            height={W}
            fill="#f8fafc"
            stroke="#0f172a"
            strokeWidth={px(2)}
          />

          {/* תוויות מידות */}
          <text x={L / 2} y={-px(10)} textAnchor="middle" fontSize={px(13)} fontWeight={700} fill="#334155">
            {lengthMeters} מ'
          </text>
          <text
            x={L + px(10)}
            y={W / 2}
            textAnchor="middle"
            fontSize={px(13)}
            fontWeight={700}
            fill="#334155"
            transform={`rotate(90 ${L + px(10)} ${W / 2})`}
          >
            {widthMeters} מ'
          </text>

          {/* קווי חיווט צמוד-קיר: ניתוב לאורך היקף החדר (זוויות של 90°) אל הנקודה.
              מקור ההזנה הוא לוח החשמל - או נקודה אחרת בשרשור (Daisy Chain), לפי p.fedFrom.
              לנקודות תאורה בתוך החדר - הקו רץ על הקיר לנקודה הקרובה וממנה נמתח קו מקווקו לתקרה */}
          {canvas.panel &&
            canvas.points
              .filter((p) => p.fedFrom || canvas.wiredPointIds.includes(p.id))
              .map((p) => {
                const feedPoint = p.fedFrom ? canvas.points.find((fp) => fp.id === p.fedFrom) : null;
                const from = feedPoint ?? canvas.panel;
                if (!from) return null;
                const route = calcPerimeterRouteMeters(from.x, from.y, p.x, p.y, L, W);
                const selected = selectedPointId === p.id;
                const chained = !!feedPoint;
                const drop = !isOnWall(p.x, p.y); // תאורה בפנים החדר - קטע ירידה לתקרה
                const wallPts = drop ? route.path.slice(0, -1) : route.path;
                const mid = midPointOf(route.path);
                const last = wallPts[wallPts.length - 1];
                return (
                  <g key={`wire-${p.id}`}>
                    <polyline
                      points={wallPts.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                      fill="none"
                      stroke={selected ? '#0ea5e9' : chained ? '#a855f7' : '#64748b'}
                      strokeWidth={selected ? px(2.5) : px(2)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {drop && (
                      <line
                        x1={last.x}
                        y1={last.y}
                        x2={p.x}
                        y2={p.y}
                        stroke="#94a3b8"
                        strokeWidth={px(1.5)}
                        strokeDasharray={`${px(3)} ${px(3)}`}
                      />
                    )}
                    <text
                      x={mid.x + mid.ox}
                      y={mid.y + mid.oy}
                      textAnchor="middle"
                      fontSize={px(11)}
                      fontWeight={600}
                      fill="#475569"
                      stroke="#ffffff"
                      strokeWidth={px(3)}
                      paintOrder="stroke"
                    >
                      {route.length.toFixed(2)} מ'
                    </text>
                  </g>
                );
              })}

          {/* לוח חשמל - אייקון ארון/לוח תקשורת */}
          {canvas.panel && (
            <g
              onPointerDown={(e) => handleShapePointerDown(e, 'panel', true)}
              style={{ cursor: tool === 'select' ? 'grab' : 'pointer' }}
            >
              <title>לוח חשמל</title>
              <g transform={`translate(${canvas.panel.x} ${canvas.panel.y})`}>
                <PanelIcon color="#059669" scale={px(18)} />
              </g>
            </g>
          )}

          {/* נקודות פרטניות - אייקונים תקניים; הטקסט מופיע כ-Tooltip בלבד או בחלונית המאפיינים */}
          {canvas.points.map((p) => {
            const color = POINT_COLORS[p.category];
            const selected = selectedPointId === p.id;
            const label = labelsById?.[p.id] || `${POINT_SHORT_LABELS[p.category]}`;
            const s = px(16);
            return (
              <g
                key={p.id}
                onPointerDown={(e) => handleShapePointerDown(e, p.id, false, p.category)}
                style={{ cursor: tool === 'select' ? 'grab' : 'pointer' }}
              >
                <title>{label}</title>
                {selected && (
                  <circle cx={p.x} cy={p.y} r={s * 0.78} fill="none" stroke="#0ea5e9" strokeWidth={px(2)} strokeDasharray={`${px(3)} ${px(3)}`} />
                )}
                {wireStartId === p.id && tool === 'wire' && (
                  <circle cx={p.x} cy={p.y} r={s * 0.98} fill="none" stroke="#f97316" strokeWidth={px(2.5)} strokeDasharray={`${px(4)} ${px(3)}`} />
                )}
                <g transform={`translate(${p.x} ${p.y})`}>
                  <PointIcon category={p.category} color={color} scale={s} />
                </g>
              </g>
            );
          })}
        </svg>

        {/* הוראות במצבים ריקים */}
        {!canvas.panel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 px-3 py-2 rounded-lg shadow-sm">
              בחר 'לוח חשמל' בסרגל ולחץ להנחתו בחדר
            </span>
          </div>
        )}
        {canvas.panel && canvas.points.length === 0 && tool !== 'panel' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 px-3 py-2 rounded-lg shadow-sm">
              בחר קטגוריה (שקע / מתג / תאורה) ולחץ לשרטוט נקודה
            </span>
          </div>
        )}
      </div>

      {/* מקרא צבעים */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-600">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
          לוח חשמל
        </span>
        {(Object.keys(POINT_COLORS) as ElectricalPointCategory[]).map((cat) => (
          <span key={cat} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: POINT_COLORS[cat] }} />
            {POINT_SHORT_LABELS[cat]}
          </span>
        ))}
        <span className="text-slate-400">| שקעים, מתגים ולוח נעולים על קירות · תאורה חופשית על רשת 0.5מ' · חיווט צמוד קיר (90°) · שרשור: בכלי חיווט לחץ נקודה (חיבור ללוח), ואז לחץ על נקודות ברצף לשרשרת מתמשכת</span>
      </div>
    </div>
  );
};
