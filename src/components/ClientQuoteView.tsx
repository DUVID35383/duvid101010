import React, { useState } from 'react';
import { Project, MaterialCatalogItem } from '../types';
import { calculateClientQuote, calculateAreas, calculateEstimatedWeight, calculateStepAddOns } from '../utils/calculations';
import { getDefaultTerms, saveDefaultTerms } from '../data/defaultTerms';
import { Printer, FileText, ShieldCheck, Save, RotateCcw } from 'lucide-react';

interface ClientQuoteViewProps {
  project: Project;
  catalog: MaterialCatalogItem[];
  onUpdateProject: (updatedProject: Project) => void;
}

export const ClientQuoteView: React.FC<ClientQuoteViewProps> = ({
  project,
  catalog,
  onUpdateProject,
}) => {
  const quote = calculateClientQuote(project, catalog);
  const areas = calculateAreas(project);
  const weight = calculateEstimatedWeight(project);
  const stepAddOns = calculateStepAddOns(project, catalog);
  const stepAddOnsTotal = stepAddOns.reduce((sum, item) => sum + item.totalPrice, 0);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentTerms = project.termsAndWarranty !== undefined ? project.termsAndWarranty : getDefaultTerms();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-container">
      {/* Top Controls Header - Hidden on Print */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <span>הצעת מחיר רשמית ללקוח</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            התאמת אחוז רווח קבלני, עלות עבודה והדפסת מסמך A4 נקי ומעוצב ללקוח
          </p>
        </div>

        {/* Live Controls: Contractor Margin & Labor */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">אחוז רווח קבלני:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="100"
                value={project.contractorMarginPercent}
                onChange={(e) =>
                  onUpdateProject({ ...project, contractorMarginPercent: parseInt(e.target.value) || 0 })
                }
                className="w-16 bg-white border border-slate-300 text-orange-600 font-black text-center rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500"
                id="quote-margin-input"
              />
              <span className="font-bold text-slate-700">%</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20 mr-auto"
            id="print-quote-btn"
          >
            <Printer className="w-4 h-4" />
            <span>הדפס / שמור כ-PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Quote Proposal Document */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-8 print-card print:p-0 print:border-none print:shadow-none shadow-xs">
        
        {/* Document Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-6">
          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              בניית חדרים ניידים וקראוונים
            </div>
            <div className="text-xs text-slate-600 font-medium">
              תכנון, הנדסה, ייצור והרכבת מבנים ניידים על גלגלים
            </div>
            <div className="text-xs text-slate-500">
              טלפון: 050-0000000 | דוא"ל: info@mobile-rooms.co.il
            </div>
          </div>

          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1 w-full sm:w-auto">
            <div className="font-extrabold text-slate-900 text-sm">הצעת מחיר מס' #QU-{project.id.slice(-5)}</div>
            <div className="text-slate-600">תאריך: <span className="font-mono text-slate-900 font-bold">{project.date}</span></div>
            <div className="text-slate-600">תוקף ההצעה: <span className="font-mono text-slate-900 font-bold">30 יום</span></div>
          </div>
        </div>

        {/* Client & Project Specs Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-blue-900 mb-2 text-sm">פרטי הלקוח:</h4>
            <div className="space-y-1.5 text-slate-800">
              <div><strong className="text-slate-600">שם הלקוח:</strong> {project.clientName || 'ישראל ישראלי'}</div>
              <div><strong className="text-slate-600">טלפון:</strong> <span dir="ltr">{project.clientPhone || '050-0000000'}</span></div>
              {project.clientEmail && <div><strong className="text-slate-600">אימייל:</strong> {project.clientEmail}</div>}
              <div><strong className="text-slate-600">כתובת / יעד אספקה:</strong> {project.clientAddress || 'לפי תיאום'}</div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-blue-900 mb-2 text-sm">סיכום מידות ושטחים:</h4>
            <div className="space-y-1.5 text-slate-800">
              <div><strong className="text-slate-600">מידות חיצוניות:</strong> {project.dimensions.length}m אורך x {project.dimensions.width}m רוחב x {project.dimensions.height}m גובה</div>
              <div><strong className="text-slate-600">שטח רצפה:</strong> {areas.floorArea} מ"ר</div>
              <div><strong className="text-slate-600">שטח גג (כולל בלט):</strong> {areas.roofAreaWithOverhang} מ"ר</div>
              <div><strong className="text-slate-600">שטח קירות נטו:</strong> {areas.wallAreaNet} מ"ר (ברוטו: {areas.wallAreaGross} מ"ר)</div>
              <div><strong className="text-slate-600">נפח פנימי:</strong> {areas.volume} מ"ק</div>
            </div>
          </div>
        </div>

        {/* Detailed Technical Specifications Grid */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>מפרט טכני מפורט ומלא של רכיבי המבנה</span>
            <span className="text-xs font-semibold text-blue-600">כל הכלול בהצעה</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Spec 1: Chassis & Structure */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>1. שלדה ניידת וקונסטרוקציה</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                <li>חומר שלדה: פרופילי {project.construction.materialType === 'steel' ? 'ברזל RTS/RHS מוגני חלודה' : project.construction.materialType === 'aluminum' ? 'אלומיניום קונסטרוקטיבי' : 'עץ C24'}.</li>
                <li>מפרט פרופיל: {project.construction.profileSpec} ({project.construction.unitWeightKgPerMeter} ק"ג/מטר).</li>
                <li>מפתח מקסימלי בין ניצבים: {project.construction.profileSpacingCm} ס"מ (מרכז אל מרכז).</li>
                <li>כלול: קורות יסוד, עמודים, טבעת גג וצביעת יסוד אפוקסית.</li>
              </ul>
            </div>

            {/* Spec 2: Wheels & Mobility Base */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>2. בסיס נייד וגלגלים תעשייתיים</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                <li className="font-bold text-blue-900">
                  בסיס נייד: גלגלים תעשייתיים לעומס כבד כולל מעצורים
                </li>
                <li>
                  סוג גלגלים:{' '}
                  {project.wheels.wheelType === 'fixed'
                    ? 'גלגלים תעשייתיים קבועים (Fixed)'
                    : project.wheels.wheelType === 'swivel'
                    ? 'גלגלים תעשייתיים סובבים 360° (Swivel)'
                    : 'גלגלים תעשייתיים סובבים 360° כולל מעצור נעילה (Swivel + Brake)'}.
                </li>
                <li>
                  כמות גלגלים: <strong>{project.wheels.quantity || 6} יחידות</strong> ({project.wheels.loadCapacityPerWheelKg || 500} ק"ג לגלגל).
                </li>
                <li>כושר העמסה כולל של בסיס הגלגלים: <strong>{weight.totalWheelCapacityKg.toLocaleString()} ק"ג</strong>.</li>
                <li>כולל: רגליות תמיכה, פילוס והברגה מתכווננות להצבה יציבה בשטח.</li>
              </ul>
            </div>

            {/* Spec 3: Floor Infrastructure */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>3. תשתית וחיפוי רצפה</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                <li>לוח בסיס תחתון: {project.floor.basePlateType === 'cement_board_18' ? 'צמנטבורד מחוזק 18 מ"מ עמיד מים' : project.floor.basePlateType === 'osb_18' ? 'פלטת OSB-3 מוגנת מים 18 מ"מ' : 'פח מרוג מגלוון 3 מ"מ'}.</li>
                <li>בידוד רצפה תחתון: {project.floor.insulationType === 'eps_foam' ? 'קלקר EPS דחוס' : project.floor.insulationType === 'rockwool' ? 'צמר סלעים בצפיפות גבוהה' : 'קצף פוליאוריטן'}.</li>
                <li>חיפוי עליון: {project.floor.topCovering === 'spc_vinyl' ? 'פרקט פולימרי SPC עמיד מים 100%' : project.floor.topCovering === 'laminate_ac4' ? 'פרקט למינציה AC4 8 מ"מ' : 'חיפוי עץ גלריה טבעי'}.</li>
                <li>כולל: פנלים היקפיים מעוצבים בסיום הרצפה.</li>
              </ul>
            </div>

            {/* Spec 4: Walls, Roof, Overhang & Cladding */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>4. מעטפת קירות, גג וחיפוי פולימרי</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                <li>פאנל מבודד קירות: {project.wallRoof.panelType === 'eps_panel' ? 'פנל קלקר EPS מבודד 5 ס"מ' : project.wallRoof.panelType === 'iscorit_pu' ? 'פנל איסכורית פוליאוריטן' : 'פנל צמר סלעים'} (עובי <strong className="text-blue-800">{project.wallRoof.panelThicknessMm / 10} ס"מ</strong>).</li>
                <li>פאנל איסכורית מבודד לגג (פנאל גלי) - חישוב נפרד עם בלט גג.</li>
                {project.wallRoof.roofOverhangCm && project.wallRoof.roofOverhangCm > 0 ? (
                  <li>בלט גג (Overhang): <strong className="text-blue-800">{project.wallRoof.roofOverhangCm} ס"מ</strong> מכל צד. מידות גג סופיות: <strong>{project.dimensions.length + 2 * project.wallRoof.roofOverhangCm / 100}×{project.dimensions.width + 2 * project.wallRoof.roofOverhangCm / 100} מטר</strong>.</li>
                ) : (
                  <li>בלט גג: ללא. מידות הגג זהות למידות הרצפה.</li>
                )}
                <li>
                  מסלולים ומסילות לפנלים:{' '}
                  <strong>
                    {project.wallRoof.panelTrackType === 'galvanized_drywall_tracks'
                      ? 'מסלולי גבס מגולוונים (41.0 מ"ר נטו + 10% פחת = 45.1 מטר רץ, כולל היקפים, פינות ופתחים)'
                      : project.wallRoof.panelTrackType === 'none'
                      ? 'ללא מסלולים היקפיים'
                      : `מסלולי אלומיניום/פח היקפיים מותאמים (41.0 מטר רץ נטו + 10% פחת)`}
                  </strong>.
                </li>
                <li>
                  חיפוי פולימרי פנימי לקירות:{' '}
                  {project.wallRoof.polymerCladding?.type === 'plates'
                    ? 'פלטות פולימריות דקורטיביות'
                    : project.wallRoof.polymerCladding?.type === 'slats'
                    ? 'סרגלים פולימריים דמוי עץ'
                    : 'ללא חיפוי פולימרי'}
                  {project.wallRoof.polymerCladding?.type !== 'none' &&
                    ` (${
                      project.wallRoof.polymerCladding?.heightMode === 'full'
                        ? 'עד התקרה'
                        : project.wallRoof.polymerCladding?.heightMode === 'half'
                        ? 'חצי גובה'
                        : `גובה מותאם אישית ${project.wallRoof.polymerCladding?.customHeightCm || 120} ס"מ`
                    })`}
                </li>
                {project.wallRoof.claddingExterior !== 'none' && (
                  <li>חיפוי חיצוני דקורטיבי: {project.wallRoof.claddingExterior === 'wpc_wood_slats' ? 'חיפוי WPC דמוי עץ יוקרתי' : project.wallRoof.claddingExterior}.</li>
                )}
              </ul>
            </div>

            {/* Spec 5: Windows, Doors & Glass */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>5. פתחים - חלונות, דלתות וזכוכיות ({project.openings.length} פתחים)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 mt-1">
                {project.openings.length === 0 ? (
                  <span className="text-slate-500">לא הוגדרו פתחים.</span>
                ) : (
                  project.openings.map((op, i) => {
                    const profileName =
                      op.type === 'window'
                        ? 'פרופיל קליל 7000'
                        : op.doorProfile === 'klil_4500'
                        ? 'פרופיל קליל 4500'
                        : 'פרופיל קליל 2000';
                    const glassName =
                      op.glassType === 'triplex'
                        ? 'זכוכית טריפלקס בטיחותית'
                        : op.glassType === 'antisun'
                        ? 'זכוכית אנטיסאן מסננת קרינה'
                        : 'זכוכית 4 מ"מ רגילה';
                    return (
                      <div key={op.id || i} className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block font-bold">
                          {i + 1}. {op.title} (x{op.quantity})
                        </strong>
                        <div className="text-slate-600 mt-0.5">
                          מידות: {op.widthCm || Math.round(op.width * 100)} ס"מ רוחב x {op.heightCm || Math.round(op.height * 100)} ס"מ גובה
                        </div>
                        <div className="text-slate-500">
                          {profileName} | {glassName}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Spec 6: Electrical & HVAC */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>6. מערכות חשמל, תאורה ומיזוג אוויר</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-700 text-[11px] list-disc list-inside">
                <li>
                  אופן התקנת החשמל:{' '}
                  <strong className="text-slate-900">
                    {project.electrical.installationType === 'exposed_conduits'
                      ? 'התקנה גלויה בתעלות PVC / גיווי'
                      : 'התקנה נסתרת בתוך הפנל המבודד'}
                  </strong>
                </li>
                <li>מתגים: {project.electrical.switchesCount || 0} יחידות.</li>
                <li>שקעים ונקודות כוח: {project.electrical.powerOutletsCount || 0} נקודות{project.electrical.heavyPowerOutletsCount ? ` + ${project.electrical.heavyPowerOutletsCount} שקעי כוח במעגל ייעודי` : ''}.</li>
                <li>גופי תאורת LED: {project.electrical.lightingPointsCount || 0} נקודות.</li>
                <li>
                  חישוב חיווט וצנרת לפי נקודות פרטניות: סכום ישיר של מרחק אופקי + גובה + סרח לכל נקודה (ללא ערכי ברירת מחדל/פול-בק), כולל קו 4 מ"מ ישיר לכל שקע כוח.
                </li>
                <li>לוח חשמל ראשי: {project.electrical.mainPanelType === 'three_phase_32a' ? 'תלת פאזי 32A' : 'חד פאזי 32A מוגן מים'}.</li>
                <li>
                  מיקום לוח חשמל: {project.electrical.panelLocation === 'wall_center' ? 'מרכז קיר' : 'פינה'}
                  {project.electrical.feedDistanceMeters ? ` (מרחק מהזנה ראשית/חיצונית: ${project.electrical.feedDistanceMeters} מטר)` : ''}.
                </li>
                <li>
                  מיזוג אוויר:{' '}
                  {project.electrical.airConditioner === 'ac_15hp'
                    ? 'מזגן עילי 1.5 כ"ס אינוורטר'
                    : project.electrical.airConditioner === 'ac_2hp'
                    ? 'מזגן עילי 2.0 כ"ס אינוורטר'
                    : project.electrical.airConditioner === 'ac_1hp'
                    ? 'מזגן עילי 1.0 כ"ס'
                    : 'ללא מזגן'}
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Custom Additions & Catalog Products */}
        {stepAddOns.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>תוספות והתאמות אישיות</span>
              <span className="text-xs font-semibold text-blue-600">כלול בהצעה</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 rounded-r-lg">תיאור</th>
                    <th className="p-2.5">הערות</th>
                    <th className="p-2.5 text-center">כמות</th>
                    <th className="p-2.5 text-center">יחידה</th>
                    <th className="p-2.5 text-left">מחיר יחידה</th>
                    <th className="p-2.5 text-left rounded-l-lg">סה"כ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {stepAddOns.map((item) => (
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
                  <tr className="bg-orange-50 font-bold text-xs text-slate-900 border-t border-orange-200">
                    <td colSpan={5} className="p-2.5 text-left">סה"כ תוספות והתאמות אישיות:</td>
                    <td className="p-2.5 text-left font-mono text-orange-600 font-extrabold">
                      ₪{stepAddOnsTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Final Lump-Sum Price Box Only */}
        {(() => {
          const vatEnabled = project.vatEnabled ?? true;
          const effectiveTotal = vatEnabled ? quote.totalClientPriceWithVat : quote.totalClientPrice;
          return (
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 p-6 rounded-2xl border border-orange-200 text-center space-y-2 mt-8">
              <div className="text-xs font-extrabold text-orange-950 uppercase tracking-wider">
                מחיר סופי כולל למבנה (מפתח ביד)
              </div>
              <div className="text-3xl sm:text-4xl font-black text-orange-600 font-mono">
                ₪{effectiveTotal.toLocaleString()}
              </div>
              <div className="text-xs text-slate-700 font-bold font-mono">
                עלות חומרים: ₪{(quote.materialsCost || 0).toLocaleString()} | עלות עבודה: ₪{(quote.laborCost || 0).toLocaleString()} | סה"כ לפרויקט: ₪{(quote.subtotalBeforeMargin || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {vatEnabled
                  ? `(מחיר סופי כולל מע"מ ${Math.round((quote.vatRate || 0.18) * 100)}% כחוק, עבודה וכל הרכיבים המפורטים לעיל)`
                  : `(מחיר סופי ללא מע"מ, עבודה וכל הרכיבים המפורטים לעיל)`}
              </div>
            </div>
          );
        })()}

        {/* Notes & Terms & Conditions */}
        <div className="border-t border-slate-200 pt-6 space-y-3 text-xs text-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>תנאים כלליים ואחריות:</span>
            </h4>

            {/* Buttons on screen (hidden on print) */}
            <div className="no-print flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  saveDefaultTerms(currentTerms);
                  setToastMsg('התנאים נשמרו בהצלחה כתנאי ברירת מחדל לכל ההצעות החדשות!');
                  setTimeout(() => setToastMsg(null), 3500);
                }}
                className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                title="שמור טקסט זה כברירת מחדל לכל הצעה חדשה"
                id="save-default-terms-quote-btn"
              >
                <Save className="w-3.5 h-3.5 text-emerald-600" />
                <span>שמור כתנאי ברירת מחדל</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const def = getDefaultTerms();
                  onUpdateProject({ ...project, termsAndWarranty: def });
                  setToastMsg('התנאים אופסו לברירת המחדל');
                  setTimeout(() => setToastMsg(null), 3500);
                }}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                title="טען תנאי ברירת מחדל מחדש"
                id="reset-default-terms-quote-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>טען ברירת מחדל</span>
              </button>
            </div>
          </div>

          {toastMsg && (
            <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-lg font-bold">
              {toastMsg}
            </div>
          )}

          {/* Editable Textarea in screen view */}
          <div className="no-print">
            <textarea
              value={currentTerms}
              onChange={(e) => onUpdateProject({ ...project, termsAndWarranty: e.target.value })}
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl p-3 text-xs text-slate-900 font-sans leading-relaxed focus:outline-none transition resize-y"
              placeholder="הזן תנאים כלליים, אחריות ותנאי תשלום להצעה זו..."
              id="quote-terms-textarea"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              * ניתן לערוך ולהתאים את הטקסט באופן חופשי עבור פרויקט זה. השינויים מופיעים בזמן אמת במסמך ויודפסו בהצעה.
            </span>
          </div>

          {/* Printed version (visible only when printing) */}
          <div className="hidden print:block text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-sans">
            {currentTerms}
          </div>

          {project.notes && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-800 mt-2">
              <strong>הערות מיוחדות להצעה:</strong> {project.notes}
            </div>
          )}
        </div>

        {/* Signature Box for Client Confirmation */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-6">
            <div className="font-bold text-slate-900">אישור הלקוח:</div>
            <div className="text-slate-600">שם מלא: ______________________</div>
            <div className="text-slate-600">חתימה וחותמת: _________________</div>
          </div>

          <div className="space-y-6 text-left">
            <div className="font-bold text-slate-900">חתימת הקבלן / בונה:</div>
            <div className="text-slate-600">______________________ :Name</div>
            <div className="text-slate-600">______________________ :Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};
