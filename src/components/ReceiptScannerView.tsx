import React, { useState } from 'react';
import { MaterialCatalogItem, ScannedReceiptResult, Project, AppDocument } from '../types';
import { SaveDocumentModal } from './SaveDocumentModal';
import { ScanLine, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Save, ArrowRight } from 'lucide-react';

interface ReceiptScannerViewProps {
  catalog: MaterialCatalogItem[];
  onUpdateCatalog: (updatedCatalog: MaterialCatalogItem[]) => void;
  projects?: Project[];
  onRegisterDocument?: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => void;
}

export const ReceiptScannerView: React.FC<ReceiptScannerViewProps> = ({
  catalog,
  onUpdateCatalog,
  projects = [],
  onRegisterDocument,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedReceiptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setScanResult(null);
    setAppliedSuccess(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleScanReceipt = async () => {
    if (!previewUrl) return;

    setIsScanning(true);
    setErrorMessage(null);
    setScanResult(null);
    setAppliedSuccess(false);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType: selectedFile?.type || 'image/jpeg',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'שגיאה בסריקת החשבונית');
      }

      setScanResult(result.data);
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'אירעה שגיאה בעת ניתוח החשבונית בעזרת Gemini AI');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToCatalog = () => {
    if (!scanResult || !scanResult.items) return;

    let updatedCatalog = [...catalog];

    scanResult.items.forEach((scanned) => {
      // Find if item already exists in catalog by name similarity
      const existingIndex = updatedCatalog.findIndex((c) =>
        c.name.toLowerCase().includes(scanned.item.toLowerCase()) ||
        scanned.item.toLowerCase().includes(c.name.toLowerCase())
      );

      if (existingIndex >= 0) {
        // Update price
        updatedCatalog[existingIndex] = {
          ...updatedCatalog[existingIndex],
          defaultUnitPrice: scanned.unitPrice,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Add new scanned item
        updatedCatalog.unshift({
          id: `mat_scanned_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'material',
          itemType: 'material',
          category: scanned.category || 'construction',
          name: scanned.item,
          unit: 'יחידה',
          defaultUnitPrice: scanned.unitPrice,
          lastUpdated: new Date().toISOString(),
        });
      }
    });

    onUpdateCatalog(updatedCatalog);
    setAppliedSuccess(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-blue-600" />
            <span>סריקת חשבוניות וקבלות (Gemini AI)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            העלה צילום/קובץ חשבונית של חומרי גלם (ברזל, פאנלים, אלומיניום) לעדכון מחירון הקנייה אוטומטית
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>מופעל ע"י Gemini 3.6 Flash</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Column */}
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center min-h-[300px] bg-white ${
              previewUrl
                ? 'border-blue-500 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-4 w-full">
                <div className="max-h-64 overflow-hidden rounded-xl border border-slate-200 shadow-xs mx-auto max-w-sm">
                  <img src={previewUrl} alt="תצוגה מקדימה לחשבונית" className="w-full h-auto object-contain" />
                </div>
                <div className="text-xs text-slate-600">
                  נבחר קובץ: <strong className="text-blue-700">{selectedFile?.name || 'תמונת חשבונית'}</strong>
                </div>
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setScanResult(null);
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
                >
                  החלף קובץ
                </button>
              </div>
            ) : (
              <div className="space-y-3 cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">גרור לכאן חשבונית או קבלה</h4>
                  <p className="text-xs text-slate-500">תומך בתמונות (JPEG, PNG, WebP) וצילומי מסמכים</p>
                </div>

                <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition border border-slate-200">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>בחר קובץ מהמחשב</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    id="receipt-file-input"
                  />
                </label>
              </div>
            )}
          </div>

          <button
            onClick={handleScanReceipt}
            disabled={!previewUrl || isScanning}
            className={`w-full py-3.5 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-xs ${
              !previewUrl || isScanning
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer'
            }`}
            id="scan-receipt-submit-btn"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>מפענח חשבונית ומחלץ פריטים בעזרת AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>סרוק חשבונית וחלץ מחירי קנייה</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Scan Results Column */}
        <div>
          {scanResult ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              
              {/* Scan Summary Banner */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>תוצאות פענוח החשבונית</span>
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ספק: <strong className="text-slate-900">{scanResult.supplierName}</strong> | תאריך: <span className="font-mono">{scanResult.date}</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block font-medium">סה"כ חשבונית:</span>
                  <span className="text-lg font-black text-blue-700 font-mono">
                    ₪{scanResult.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Scanned Items Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-800">פריטים שנמצאו ונחלצו:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">תיאור פריט</th>
                        <th className="p-2.5 text-center">כמות</th>
                        <th className="p-2.5 text-left">מחיר יחידה</th>
                        <th className="p-2.5 text-left">סה"כ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {scanResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{item.item}</td>
                          <td className="p-2.5 text-center text-blue-700 font-bold">{item.qty}</td>
                          <td className="p-2.5 text-left font-mono">₪{item.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-left font-bold font-mono text-slate-900">
                            ₪{item.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Apply Action */}
              <div className="pt-2 space-y-2">
                {appliedSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      המחירון עודכן בהצלחה עם מחירי החשבונית החדשים!
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleApplyToCatalog}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-black py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    id="apply-scan-to-catalog-btn"
                  >
                    <Save className="w-4 h-4 text-slate-600" />
                    <span>עדכן מחירים אלו במחירון החומרים</span>
                  </button>
                )}

                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  id="save-receipt-to-system-btn"
                >
                  <Save className="w-4 h-4" />
                  <span>שמור במערכת</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500 space-y-3 min-h-[350px] flex flex-col items-center justify-center">
              <ScanLine className="w-12 h-12 text-slate-400" />
              <h4 className="font-bold text-slate-700 text-sm">טרם נסרקה חשבונית</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                בחר קובץ חשבונית ולחץ על "סרוק חשבונית" לחילוץ פריטים ומחירים אוטומטית.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save to System Archive Modal */}
      <SaveDocumentModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        projects={projects}
        defaultName={scanResult ? `חשבונית - ${scanResult.supplierName || 'ספק'}` : 'חשבונית נכנסת'}
        defaultKind="receipt"
        defaultProjectId={null}
        onSave={(payload) => {
          if (onRegisterDocument && selectedFile && previewUrl && scanResult) {
            onRegisterDocument({
              projectId: payload.projectId,
              kind: payload.kind,
              name: payload.name,
              notes: payload.notes,
              fileName: selectedFile.name,
              mimeType: selectedFile.type,
              dataUrl: previewUrl,
              sizeBytes: selectedFile.size,
              meta: {
                supplierName: scanResult.supplierName,
                totalAmount: scanResult.totalAmount,
                confidenceScore: scanResult.confidenceScore,
                status: 'scanned',
              },
            });
          }
        }}
      />
    </div>
  );
};
