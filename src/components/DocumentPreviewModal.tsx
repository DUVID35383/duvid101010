import React from 'react';
import { AppDocument, AppDocumentKind, AppDocumentSnapshot } from '../types';
import { X, Printer, Download, FileText } from 'lucide-react';

interface DocumentPreviewModalProps {
  doc: AppDocument;
  onClose: () => void;
}

const KIND_TITLES: Record<AppDocumentKind, string> = {
  quote: 'הצעת מחיר',
  bom: 'רשימת קניות לספקים (BOM)',
  receipt: 'חשבונית / קבלה סרוקה',
  upload: 'קובץ שהועלה',
};

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ doc, onClose }) => {
  const isImage = !!doc.mimeType && doc.mimeType.startsWith('image/') && !!doc.dataUrl;
  const hasSnapshot = (doc.kind === 'quote' || doc.kind === 'bom') && !!doc.meta?.snapshot;

  const handlePrint = () => {
    document.body.classList.add('print-preview-active');
    window.print();
    setTimeout(() => document.body.classList.remove('print-preview-active'), 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 doc-preview-root"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm doc-preview-backdrop" />

      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar (Hidden on Print) */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-200 no-print">
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 text-sm truncate">{doc.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {KIND_TITLES[doc.kind]} | {new Date(doc.createdAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20"
              id="preview-modal-print-btn"
            >
              <Printer className="w-4 h-4" />
              <span>הדפס / הורד כ-PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
              title="סגור"
              id="preview-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div id="doc-preview-print-area" className="max-h-[75vh] overflow-auto bg-slate-100">
          {isImage ? (
            <div className="p-4 bg-white flex items-center justify-center">
              <img src={doc.dataUrl} alt={doc.name} className="max-w-full h-auto object-contain" />
            </div>
          ) : hasSnapshot ? (
            <SnapshotDocumentView doc={doc} />
          ) : (
            <FallbackView doc={doc} />
          )}
        </div>
      </div>
    </div>
  );
};

function SnapshotDocumentView({ doc }: { doc: AppDocument }) {
  const snap: AppDocumentSnapshot | undefined = doc.meta?.snapshot;
  if (!snap) return null;
  const isQuote = doc.kind === 'quote';
  const title = isQuote ? 'הצעת מחיר' : 'רשימת קניות לספקים (BOM)';

  const sections = snap.sections && snap.sections.length > 0
    ? snap.sections
    : (snap.items && snap.items.length > 0
        ? [{ title: 'פריטי המסמך', rows: snap.items }]
        : []);

  return (
    <div dir="rtl" className="bg-white p-6 sm:p-8 text-slate-900" style={{ fontFamily: "'Assistant','Heebo',sans-serif" }}>
      {/* Document Header */}
      <div className="border-b-2 border-orange-500 pb-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-orange-700">{title}</h2>
            {isQuote && snap.quoteNumber && (
              <p className="text-xs text-slate-500 mt-0.5 font-bold">מס' {snap.quoteNumber}</p>
            )}
          </div>
          <div className="text-left">
            <p className="text-[10px] text-slate-500">תאריך</p>
            <p className="text-sm font-bold">{snap.date || ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
          {snap.projectName && (
            <div><span className="text-slate-500">פרויקט: </span><b>{snap.projectName}</b></div>
          )}
          {snap.clientName && (
            <div><span className="text-slate-500">לקוח: </span><b>{snap.clientName}</b></div>
          )}
          {snap.dimensions && (
            <div><span className="text-slate-500">מידות: </span><b>{snap.dimensions}</b></div>
          )}
        </div>
      </div>

      {/* Sections */}
      {sections.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-6">אין פריטים מפורטים במסמך זה.</p>
      )}
      {sections.map((sec, idx) => (
        <div key={idx} className="mb-5">
          <h3 className="font-black text-sm bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-lg mb-2">
            {sec.title}
          </h3>
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-300 font-bold">
                <th className="py-1.5 text-right">תיאור</th>
                <th className="py-1.5 text-center">כמות</th>
                <th className="py-1.5 text-center">יחידה</th>
                <th className="py-1.5 text-left">מחיר יחידה</th>
                <th className="py-1.5 text-left">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {sec.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 align-top">
                  <td className="py-2 pl-3">
                    <div className="font-bold">{row.name}</div>
                    {row.specification && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{row.specification}</div>
                    )}
                  </td>
                  <td className="py-2 text-center whitespace-nowrap">
                    {row.quantity != null ? row.quantity.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 text-center whitespace-nowrap">{row.unit || ''}</td>
                  <td className="py-2 text-left whitespace-nowrap">
                    {row.unitPrice != null ? `₪${row.unitPrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 text-left whitespace-nowrap font-bold">
                    {row.totalPrice != null ? `₪${row.totalPrice.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Summary */}
      <div className="mt-5 border-t-2 border-slate-300 pt-3 space-y-1.5">
        {snap.summary.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between text-sm ${
              s.highlight
                ? 'bg-orange-600 text-white rounded-lg px-3 py-2 font-black shadow-sm'
                : 'font-semibold text-slate-800 px-1'
            }`}
          >
            <span>{s.label}</span>
            <span className="font-mono">{s.value != null ? `₪${s.value.toLocaleString()}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FallbackView({ doc }: { doc: AppDocument }) {
  const isDetailKind = doc.kind === 'quote' || doc.kind === 'bom';
  return (
    <div dir="rtl" className="bg-white p-8 text-center text-slate-500 text-xs space-y-3 min-h-[300px] flex flex-col items-center justify-center">
      <FileText className="w-12 h-12 text-slate-400 mx-auto" />
      {isDetailKind ? (
        <>
          <p className="max-w-sm font-bold text-slate-700">
            מסמך זה נשמר לפני עדכון המערכת ואינו כולל פירוט פריטים מלא. שמור את המסמך מחדש כדי לכלול את טבלת הפירוט.
          </p>
          <p className="text-[11px] text-slate-400">להלן נתוני הסיכום שנשמרו:</p>
        </>
      ) : (
        <p className="max-w-sm font-bold text-slate-700">לא קיים פירוט מלא לתצוגה מקדימה עבור מסמך זה.</p>
      )}
      {doc.notes && <p className="text-slate-400">{doc.notes}</p>}
      {doc.meta?.supplierName && (
        <p>ספק: <b className="text-slate-700">{doc.meta.supplierName}</b></p>
      )}
      {doc.meta?.totalPrice != null && (
        <p className="font-black text-orange-700 text-base font-mono">₪{doc.meta.totalPrice.toLocaleString()}</p>
      )}
      {doc.meta?.totalAmount != null && (
        <p className="font-black text-emerald-700 text-base font-mono">₪{doc.meta.totalAmount.toLocaleString()}</p>
      )}
      {doc.dataUrl && (
        <a
          href={doc.dataUrl}
          download={doc.fileName || doc.name}
          className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer hover:bg-slate-800 transition"
          id="preview-modal-download-btn"
        >
          <Download className="w-4 h-4" />
          <span>הורד קובץ</span>
        </a>
      )}
    </div>
  );
}
