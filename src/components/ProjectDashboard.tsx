import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  FileCheck2, 
  Ruler, 
  Weight 
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import { calculateClientQuote, calculateEstimatedWeight } from '../utils/calculations';
import { MaterialCatalogItem } from '../types';

interface ProjectDashboardProps {
  projects: Project[];
  catalog: MaterialCatalogItem[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenProjectBuilder: (id: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  catalog,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenProjectBuilder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientPhone.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">טיוטה</span>;
      case 'quotation':
        return <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">הצעת מחיר</span>;
      case 'in_progress':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">בבנייה</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">הושלם</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <FolderKanban className="w-7 h-7 text-orange-600" />
            <span>ניהול פרויקטים לבניית חדרים ניידים</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            תכנון, אפיון מפורט, חישוב כמויות ומשקלים, והפקת הצעות מחיר מקצועיות
          </p>
        </div>

        <button
          onClick={onNewProject}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-5 py-3 rounded-xl shadow-sm shadow-orange-600/20 transition cursor-pointer text-sm active:scale-95"
          id="dashboard-new-project-btn"
        >
          <Plus className="w-5 h-5" />
          <span>פרויקט חדש</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש לפי שם פרויקט, לקוח, טלפון..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
            id="project-search-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 whitespace-nowrap">סינון לפי סטטוס:</span>
          {[
            { id: 'all', label: 'הכל' },
            { id: 'draft', label: 'טיוטות' },
            { id: 'quotation', label: 'הצעות מחיר' },
            { id: 'in_progress', label: 'בבנייה' },
            { id: 'completed', label: 'הושלם' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
                statusFilter === item.id
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4 my-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-xs">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">
              אין פרויקטים שמורים. לחץ על 'פרויקט חדש' כדי להתחיל
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              תכנן ולאפיין חדר נייד חדש על גלגלים, חשב כמויות ומשקלים והפק הצעת מחיר מקצועית ללקוח.
            </p>
          </div>
          <button
            onClick={onNewProject}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-orange-600/20 active:scale-95"
            id="empty-state-new-project-btn"
          >
            <Plus className="w-4 h-4" />
            <span>פרויקט חדש</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const isSelected = project.id === currentProjectId;
            const quote = calculateClientQuote(project, catalog);
            const weight = calculateEstimatedWeight(project);

            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                id={`project-card-${project.id}`}
              >
                <div>
                  {/* Header & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base line-clamp-1" title={project.name}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{project.date}</span>
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  {/* Client Details */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 mb-4 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        לקוח:
                      </span>
                      <span className="font-bold text-slate-900">{project.clientName || 'טרם עודכן'}</span>
                    </div>

                    {project.clientPhone && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          טלפון:
                        </span>
                        <span className="font-mono text-slate-800" dir="ltr">{project.clientPhone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Ruler className="w-3.5 h-3.5 text-slate-400" />
                        מידות:
                      </span>
                      <span className="font-bold text-slate-900">
                        {project.dimensions.length}m x {project.dimensions.width}m x {project.dimensions.height}m
                      </span>
                    </div>
                  </div>

                  {/* Financial & Weight Summary */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">משקל משוער:</span>
                      <span className={`font-bold flex items-center gap-1 mt-0.5 ${weight.isOverweight ? 'text-rose-600' : 'text-slate-800'}`}>
                        <Weight className="w-3.5 h-3.5" />
                        {weight.totalGrossWeightKg.toLocaleString()} ק"ג
                      </span>
                    </div>

                    <div className="bg-orange-50/80 rounded-xl p-2.5 border border-orange-200">
                      <span className="text-[10px] text-orange-700 font-semibold block">הצעת מחיר {(project.vatEnabled ?? true) ? '(כולל מע"מ)' : '(ללא מע"מ)'}:</span>
                      <span className="font-black text-orange-600 text-sm mt-0.5 block">
                        ₪{((project.vatEnabled ?? true) ? quote.totalClientPriceWithVat : quote.totalClientPrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateProject(project.id)}
                      title="שכפל פרויקט"
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      id={`duplicate-proj-${project.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteProject(project.id)}
                      title="מחק פרויקט"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      id={`delete-proj-${project.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onSelectProject(project.id);
                      onOpenProjectBuilder(project.id);
                    }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-orange-600 hover:text-white text-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                    id={`edit-proj-${project.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ערוך / פתח אפיון</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
