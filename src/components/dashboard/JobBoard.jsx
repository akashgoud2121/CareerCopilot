import { useState, useMemo } from "react";
import { 
  Building2, 
  Briefcase, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Calendar, 
  Search, 
  Plus,
  Filter
} from "lucide-react";

/**
 * JobBoard Component
 * 
 * Integrated view for managing tracked jobs within the Dashboard.
 */
function JobBoard({ 
  jobs, 
  loading, 
  onCreateJob, 
  onDeleteJob, 
  onStatusChange, 
  onUpdateJob 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [status, setStatus] = useState("saved");
  
  // Edit state
  const [editingJobId, setEditingJobId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    companyName: "", 
    jobTitle: "", 
    jobUrl: "", 
    status: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateJob({ companyName, jobTitle, jobUrl, status });
    // Reset form
    setCompanyName("");
    setJobTitle("");
    setJobUrl("");
    setStatus("saved");
    setIsAdding(false);
  };

  const startEditing = (job) => {
    setEditingJobId(job.id);
    setEditForm({
      companyName: job.company_name,
      jobTitle: job.job_title,
      jobUrl: job.job_url || "",
      status: job.status
    });
  };

  const handleSaveEdit = (id) => {
    onUpdateJob(id, editForm);
    setEditingJobId(null);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const statusConfig = {
    saved: { label: "Saved", color: "bg-slate-100 text-slate-700 border-slate-200" },
    applied: { label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-100" },
    interviewing: { label: "Interview", color: "bg-violet-50 text-violet-700 border-violet-100" },
    offered: { label: "Offered", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-100" },
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Search & Filter Controls */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search companies or roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-8 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offered">Offered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition hover:opacity-90 active:scale-95"
          >
            {isAdding ? "Cancel" : <><Plus size={18} /> Add Job</>}
          </button>
        </div>
      </div>

      {/* Add Job Inline Form */}
      {isAdding && (
        <div className="mb-10 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4 text-center sm:text-left">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Track New Job Match</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Company Name *</label>
                <input required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Google" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Role Title *</label>
                <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Frontend Engineer" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Role URL (Optional)</label>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Initial Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer">
                  <option value="saved">Saved / Planning</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button type="submit" className="w-full rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 active:scale-95 sm:w-auto">
                Confirm & Track Job
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your board...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[40px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No jobs found</h3>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            {searchTerm || statusFilter !== 'all' ? "Try adjusting your search or filters." : "Start tracking your active job research by adding your first position."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map(job => (
            <div key={job.id} className="group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50">
              {/* Status Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusConfig[job.status]?.color || statusConfig.saved.color}`}>
                  {statusConfig[job.status]?.label || job.status}
                </div>
                
                <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button 
                    onClick={() => startEditing(job)}
                    className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteJob(job.id)}
                    className="rounded-xl bg-rose-50 p-2 text-rose-300 transition hover:bg-rose-100 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {editingJobId === job.id ? (
                      <div className="space-y-3">
                        <input value={editForm.companyName} onChange={e => setEditForm({...editForm, companyName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                        <input value={editForm.jobTitle} onChange={e => setEditForm({...editForm, jobTitle: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(job.id)} className="flex-1 rounded-xl bg-[var(--color-primary)] py-2 text-xs font-bold text-white">Save</button>
                          <button onClick={() => setEditingJobId(null)} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="truncate text-xl font-bold text-slate-900">{job.company_name}</h3>
                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">{job.job_title}</p>
                      </>
                    )}
                  </div>
                  {!editingJobId && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-[var(--color-primary)] ring-8 ring-slate-50/30">
                      <Building2 size={24} />
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline info */}
              <div className="mt-8 space-y-3 border-t border-slate-50 pt-6">
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                  <Calendar size={14} />
                  <span>Added {formatDate(job.created_at)}</span>
                </div>
                {job.status === 'applied' && (
                  <div className="flex items-center gap-3 text-xs font-bold text-blue-600 bg-blue-50/50 w-fit px-2 py-1 rounded-lg">
                    <Briefcase size={14} />
                    <span>Applied Recently</span>
                  </div>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                <div className="flex-1">
                  <select 
                    value={job.status} 
                    onChange={(e) => onStatusChange(job.id, e.target.value)}
                    className={`w-full cursor-pointer rounded-xl border-none bg-slate-50 px-3 py-2.5 text-xs font-bold outline-none transition-all hover:bg-slate-100 focus:ring-0`}
                  >
                      <option value="saved">Mark Saved</option>
                      <option value="applied">Mark Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offered">Got Offer!</option>
                      <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                {job.job_url && (
                  <a 
                    href={job.job_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-[var(--color-primary)] hover:text-white"
                    title="View job post"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobBoard;
