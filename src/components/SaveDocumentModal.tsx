import React, { useEffect, useState } from 'react';
import { Project, AppDocumentKind } from '../types';
import { Save, X } from 'lucide-react';

const KIND_OPTIONS: { value: AppDocumentKind; label: string }[] = [
  { value: 'quote', label: 'הצעת מחיר' },
  { value: 'bom', label: 'רשימת קניות (BOM)' },
  { value: 'receipt', label: 'חשבונית / קבלה' },
  { value: 'upload', label: 'קובץ / אחר' },
];

export interface SaveDocumentPayload {
  name: string;
  projectId: string | null;
  kind: AppDocumentKind;
  notes: string;
}

interface SaveDocumentModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  defaultName: string;
  defaultKind: AppDocumentKind;
  defaultProjectId?: string | null;
  onSave: (payload: SaveDocumentPayload) => void;
}

export const SaveDocumentModal: React.FC<SaveDocumentModalProps> = ({
  open,
  onClose,
  projects,
  defaultName,
  defaultKind,
  defaultProjectId = null,
  onSave,
}) => {
  const [name, setName] = useState(defaultName);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [kind, setKind] = useState<AppDocumentKind>(defaultKind);
  const [notes, setNotes] = useState('');

  // Reset fields each time the modal opens with (possibly) new defaults
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setProjectId(defaultProjectId || '');
      setKind(defaultKind);
      setNotes('');
    }
  }, [open, defaultName, defaultKind, defaultProjectId]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      projectId: projectId || null,
      kind,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Save className="w-5 h-5 text-emerald-600" />
            <span>שמירת מסמך בארכיון</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer shrink-0"
            title="סגירה"
            id="save-doc-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          המסמך יישמר בתיקיית הארכיון "מסמכים במערכת" ויהיה זמין לצפייה והורדה בכל עת.
        </p>

        {/* Document Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">שם המסמך:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הזן שם למסמך..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 transition font-semibold"
            id="save-doc-name-input"
          />
        </div>

        {/* Project Folder Assignment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">שיוך לתיקיית פרויקט:</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 transition"
            id="save-doc-project-select"
          >
            <option value="">מסמכים כלליים / חשבוניות נכנסות</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Document Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">סוג מסמך:</label>
          <div className="grid grid-cols-2 gap-2">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                  kind === k.value
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                id={`save-doc-kind-${k.value}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">הערות (אופציונלי):</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="לדוגמה: גרסה סופית ללקוח, חשבונית ספק אוקטובר..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-slate-900 transition"
            id="save-doc-notes-input"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            id="save-doc-cancel-btn"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs cursor-pointer flex items-center justify-center gap-2 ${
              name.trim()
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            id="save-doc-confirm-btn"
          >
            <Save className="w-4 h-4" />
            <span>אישור ושמירה בארכיון</span>
          </button>
        </div>
      </div>
    </div>
  );
};
