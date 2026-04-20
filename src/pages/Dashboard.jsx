import { useEffect, useState, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { FiEdit3, FiLayout, FiBookmark, FiLogOut, FiPlus } from "react-icons/fi";
import { 
  BsGrid, 
  BsListUl as BsList, 
  BsPinFill,
  BsSearch,
  BsPlusCircle
} from "react-icons/bs";
import { IoFlashOutline } from "react-icons/io5";
import ResumeThumbnail from "../components/dashboard/ResumeThumbnail";
import { supabase } from "../services/supabase";
import { 
  initializeResumeBuilder, 
  saveResumeSectionsBatch,
  ensureProfileAndResume
} from "../services/resumeBuilderApi";
import { seedResumeReadModelCache } from "../services/resumeReadModelApi";
import ConfirmModal from "../components/common/ConfirmModal";
import JobBoard from "../components/dashboard/JobBoard";
import { useAuth } from "../contexts/AuthContext";


const TemplateMiniPreview = ({ template }) => {
  if (template === 'modern') {
    return (
      <div className="flex h-4 w-3 gap-[1px] overflow-hidden rounded-[1px] border border-slate-300 bg-white p-[1px] shadow-[0.5px_0.5px_1px_rgba(0,0,0,0.05)]">
        <div className="h-full w-[30%] bg-slate-200" />
        <div className="flex flex-col gap-[1px] pt-[1px]">
          <div className="h-[1px] w-full bg-slate-400" />
          <div className="h-[1px] w-[80%] bg-slate-300" />
          <div className="h-[1px] w-full bg-slate-300" />
        </div>
      </div>
    );
  }
  if (template === 'minimal') {
    return (
      <div className="flex flex-col items-center gap-[1px] h-4 w-3 overflow-hidden rounded-[1px] border border-slate-300 bg-white p-[2px] shadow-[0.5px_0.5px_1px_rgba(0,0,0,0.05)]">
        <div className="h-[1.5px] w-[60%] bg-slate-400 mb-0.5" />
        <div className="h-[1px] w-[40%] bg-slate-300" />
        <div className="h-[1px] w-[40%] bg-slate-300" />
        <div className="h-[1px] w-[40%] bg-slate-300" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[1.5px] h-4 w-3 overflow-hidden rounded-[1px] border border-slate-300 bg-white p-[1.5px] shadow-[0.5px_0.5px_1px_rgba(0,0,0,0.05)]">
       <div className="h-[1px] w-full bg-slate-400" />
       <div className="h-[1px] w-full bg-slate-300" />
       <div className="h-[1px] w-full bg-slate-300" />
       <div className="h-[1px] w-full bg-slate-300" />
    </div>
  );
};

const ResumeContentPreview = ({ doc, resume }) => {
  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50/50 p-6 text-center">
        <div className="flex flex-col gap-2 w-full opacity-20">
          <div className="h-2 w-full bg-slate-300 rounded" />
          <div className="h-2 w-3/4 bg-slate-300 rounded" />
          <div className="h-2 w-1/2 bg-slate-300 rounded" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Initializing Preview...
        </p>
        <p className="text-[11px] text-slate-500 leading-tight">
          Click to open and finish building your resume.
        </p>
      </div>
    );
  }

  const summary = doc.summary?.text;
  const experience = doc.experience || [];
  
  if (!summary && experience.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 rounded-full bg-slate-100 p-2 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <p className="text-[11px] font-bold text-slate-500">Resume Skeleton Ready</p>
        <p className="mt-1 text-[10px] text-slate-400">Add summary or experience to see more.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-50/30 p-3 pt-4 text-[10.5px]">
      {summary && (
        <div className="mb-3">
          <p className="line-clamp-3 leading-relaxed text-slate-600">
            {summary}
          </p>
        </div>
      )}
      
      {experience.length > 0 && (
        <div className="space-y-2">
          {experience.slice(0, 2).map((exp, i) => (
            <div key={i} className="flex flex-col gap-0.5 border-l-2 border-slate-200 pl-2">
              <span className="font-bold text-slate-800 line-clamp-1">{exp.role}</span>
              <span className="text-slate-500 line-clamp-1">{exp.company}</span>
            </div>
          ))}
        </div>
      )}

      {/* Decorative fade at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
    </div>
  );
};

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasLoadedRef = useRef(false);
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); 
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Sync active tab with query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "jobs") {
      setActiveTab("jobs");
    } else {
      setActiveTab("all");
    }
  }, [searchParams]);
  
  // Job Linking Modal State
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [activeResumeForJob, setActiveResumeForJob] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [isAddingNewJobInModal, setIsAddingNewJobInModal] = useState(false);
  const [newJobModalData, setNewJobModalData] = useState({ company: "", role: "", url: "" });
  const [isSubmittingNewJob, setIsSubmittingNewJob] = useState(false);
  
  // Renaming State
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTargetCompany, setNewTargetCompany] = useState("");
  const [newTargetRole, setNewTargetRole] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);

  // Job Delete State
  const [jobDeleteModalOpen, setJobDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);



  useEffect(() => {
    const loadData = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const [profileRes, resumesRes, jobsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("resumes").select("*, saved_jobs(id, company_name, job_title), resume_full_documents(document_json)").eq("user_id", user.id).order("is_primary", { ascending: false }).order("updated_at", { ascending: false }),
          supabase.from("saved_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setProfile({ full_name: user.email?.split("@")[0] || "User" });
        }
        
        if (resumesRes.data) {
          setResumes(resumesRes.data);
          
          // Seed the Cache for the Builder
          resumesRes.data.forEach(r => {
            if (r.resume_full_documents) {
              const readModelPayload = Array.isArray(r.resume_full_documents) 
                ? r.resume_full_documents[0] 
                : r.resume_full_documents;
                
              if (readModelPayload) {
                 seedResumeReadModelCache(r.id, readModelPayload);
              }
            }
          });
        }

        
        if (jobsRes.data) {
          setSavedJobs(jobsRes.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const TemplateBadge = ({ templateName }) => {
    const config = {
      modern: { label: "Modern Split", bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
      classic: { label: "Classic ATS", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
      minimal: { label: "Minimalist", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
      fresher: { label: "Fresher Focused", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    };

    const style = config[templateName?.toLowerCase()] || config.classic;

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}>
        {style.label}
      </span>
    );
  };

  const handleLinkJob = async (jobId) => {
    if (!activeResumeForJob) return;
    
    try {
      const { data, error } = await supabase
        .from("resumes")
        .update({ target_job_id: jobId })
        .eq("id", activeResumeForJob)
        .select("*, saved_jobs(id, company_name, job_title), resume_full_documents(document_json)")
        .single();
        
      if (error) throw error;
      
      // Update local state and close modal immediately
      setResumes(prev => prev.map(r => r.id === activeResumeForJob ? data : r));
      setJobModalOpen(false);
      setActiveResumeForJob(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update job link");
    }
  };

  const handleRename = async (resumeId) => {
    if (!editingTitle.trim()) return;
    try {
      setIsRenaming(true);
      const { error } = await supabase
        .from("resumes")
        .update({ title: editingTitle.trim() })
        .eq("id", resumeId);
        
      if (error) throw error;
      
      setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, title: editingTitle.trim() } : r));
      setEditingResumeId(null);
      setEditingTitle("");
    } catch (err) {
      console.error("Rename failed", err);
      alert("Failed to rename resume.");
    } finally {
      setIsRenaming(false);
    }
  };

  
  // handleUpdateTemplate has been removed - selection happens in ResumeBuilder

  const handleTrackAndLinkNewJob = async (e) => {
    e?.preventDefault();
    if (!activeResumeForJob || !newJobModalData.company || !newJobModalData.role) return;
    
    try {
      setIsSubmittingNewJob(true);
      if (!user) return;

      // Ensure profile exists to avoid foreign key violations
      await ensureProfileAndResume(user);

      // 1. Create the job
      const { data: jobData, error: jobErr } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        company_name: newJobModalData.company.trim(),
        job_title: newJobModalData.role.trim(),
        job_url: newJobModalData.url.trim() || null,
        status: "saved"
      }).select().single();
      
      if (jobErr) throw jobErr;

      // 2. Link it to the resume
      const { data: resumeData, error: resumeErr } = await supabase
        .from("resumes")
        .update({ target_job_id: jobData.id })
        .eq("id", activeResumeForJob)
        .select("*, saved_jobs(id, company_name, job_title), resume_full_documents(document_json)")
        .single();
        
      if (resumeErr) throw resumeErr;

      // 3. Update state
      setResumes(prev => prev.map(r => r.id === activeResumeForJob ? resumeData : r));
      setSavedJobs(prev => [jobData, ...prev]);
      
      // 4. Reset states
      setJobModalOpen(false);
      setIsAddingNewJobInModal(false);
      setNewJobModalData({ company: "", role: "", url: "" });
      setActiveResumeForJob(null);
    } catch (err) {
      console.error(err);
      alert("Failed to track and link new job");
    } finally {
      setIsSubmittingNewJob(false);
    }
  };

  const handleCreateNew = async (e) => {
    e?.preventDefault();
    try {
      setIsCreating(true);
      if (!user) return;

      // Ensure profile exists to avoid foreign key violations
      await ensureProfileAndResume(user);

      let jobId = null;
      let resumeTitle = "Untitled Resume";

      if (newTargetCompany || newTargetRole) {
        const { data: jobData, error: jobErr } = await supabase.from("saved_jobs").insert({
          user_id: user.id,
          company_name: newTargetCompany.trim() || "Unknown Company",
          job_title: newTargetRole.trim() || "Target Role",
          job_url: newTargetUrl.trim() || null,
          status: "saved"
        }).select().single();
        
        if (jobErr) throw jobErr;
        jobId = jobData.id;
        resumeTitle = `${jobData.job_title} at ${jobData.company_name}`;
      }

      const { data, error } = await supabase.from("resumes").insert({
        user_id: user.id,
        title: resumeTitle,
        is_primary: resumes.length === 0,
        target_job_id: jobId,
        resume_status: "draft"
      }).select().single();

      if (error) throw error;
      setCreateModalOpen(false);
      navigate(`/resume-builder?id=${data.id}`);
    } catch (err) {
      console.error("Failed to create new resume", err);
      alert("Failed to initialize new document.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBlank = async (e) => {
    e?.preventDefault();
    try {
      setIsCreating(true);
      if (!user) return;

      // Ensure profile exists to avoid foreign key violations
      await ensureProfileAndResume(user);

      const { data, error } = await supabase.from("resumes").insert({
        user_id: user.id,
        title: "Untitled Resume",
        is_primary: resumes.length === 0,
        resume_status: "draft"
      }).select().single();

      if (error) throw error;
      setCreateModalOpen(false);
      navigate(`/resume-builder?id=${data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to initialize empty document.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (resumeId, e) => {
    e?.stopPropagation();
    if (isDuplicating) return;
    try {
      setIsDuplicating(true);
      if (!user) return;

      const { data: existing } = await supabase.from('resumes').select('title, template_name').eq('id', resumeId).single();
      
      const { data: newResume, error: insertErr } = await supabase.from('resumes').insert({
        user_id: user.id,
        title: existing ? `Copy of ${existing.title}` : 'Copy of Resume',
        template_name: existing?.template_name || 'classic',
        is_primary: false,
        resume_status: 'draft'
      }).select().single();
      
      if (insertErr) throw insertErr;
      
      const oldDataPayload = await initializeResumeBuilder(user, { lazy: false, resumeId });
      
      await saveResumeSectionsBatch({
        sectionKeys: oldDataPayload.loadedSectionKeys,
        resumeId: newResume.id,
        userId: user.id,
        resumeData: oldDataPayload.resumeData,
        customSections: oldDataPayload.customSections,
        regenerateReadModel: true
      });
      
      setResumes(prev => [newResume, ...prev]);
    } catch(err) {
      console.error("Duplicate failed", err);
      alert("Failed to duplicate resume.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handlePin = async (resumeId, isPinned, e) => {
    e?.stopPropagation();
    try {
      if (!user) return;
      
      // Because their schema has `resumes_one_primary_per_user_idx`
      // We must unpin all others first.
      if (!isPinned) {
        await supabase.from("resumes").update({ is_primary: false }).eq("user_id", user.id);
        const { error } = await supabase.from("resumes").update({ is_primary: true }).eq("id", resumeId);
        if (error) throw error;
        setResumes(prev => {
          const updated = prev.map(r => ({ ...r, is_primary: r.id === resumeId }));
          return [...updated].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
        });
      } else {
        // Unpinning the current one
        const { error } = await supabase.from("resumes").update({ is_primary: false }).eq("id", resumeId);
        if (error) throw error;
        setResumes(prev => prev.map(r => ({ ...r, is_primary: false })));
      }
    } catch (err) {
      console.error("Pin failed", err);
      alert("Failed to pin document.");
    }
  };

  const handleDownload = async (resumeId, e) => {
    e?.stopPropagation();
    navigate(`/resume-builder?id=${resumeId}&action=download`);
  };

  const handleDelete = (resumeId, e) => {
    e?.stopPropagation();
    setResumeToDelete(resumeId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!resumeToDelete) return;
    try {
      await supabase.from("resumes").delete().eq("id", resumeToDelete);
      setResumes((prev) => prev.filter(r => r.id !== resumeToDelete));
      setDeleteModalOpen(false);
      setResumeToDelete(null);
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete document.");
    }
  };

  // Job Actions
  const handleCreateJob = async ({ companyName, jobTitle, jobUrl, status }) => {
    try {
      if (!user) return;
      const { data: newJob, error } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        company_name: companyName,
        job_title: jobTitle,
        job_url: jobUrl || null,
        status: status
      }).select().single();

      if (error) throw error;
      setSavedJobs(prev => [newJob, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to track job");
    }
  };

  const handleJobStatusChange = async (id, newStatus) => {
    try {
      const { data, error } = await supabase.from("saved_jobs").update({ status: newStatus }).eq("id", id).select().single();
      if (error) throw error;
      setSavedJobs(prev => prev.map(j => j.id === id ? data : j));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateJob = async (id, form) => {
    try {
      const { data, error } = await supabase.from("saved_jobs").update({
        company_name: form.companyName,
        job_title: form.jobTitle,
        job_url: form.jobUrl || null,
        status: form.status
      }).eq("id", id).select().single();
      
      if (error) throw error;
      setSavedJobs(prev => prev.map(j => j.id === id ? data : j));
    } catch (err) {
      console.error(err);
      alert("Failed to update job.");
    }
  };

  const triggerJobDelete = (id) => {
    setJobToDelete(id);
    setJobDeleteModalOpen(true);
  };

  const confirmJobDelete = async () => {
    if (!jobToDelete) return;
    try {
      await supabase.from("saved_jobs").delete().eq("id", jobToDelete);
      
      // Update saved jobs state locally
      setSavedJobs(prev => prev.filter(j => j.id !== jobToDelete));
      
      // Update resumes state locally (nullify any resume pointing to this job)
      setResumes(prev => prev.map(r => 
        r.target_job_id === jobToDelete 
          ? { ...r, target_job_id: null, saved_jobs: null } 
          : r
      ));

      setJobDeleteModalOpen(false);
      setJobToDelete(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete job track.");
    }
  };

  // UI formatting helpers
  const getFirstName = (name) => name ? name.split(" ")[0] : "User";
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  const getRelativeTime = (dateStr) => {
    try {
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      const diffTime = new Date(dateStr) - new Date();
      if (isNaN(diffTime)) return "Recent";
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return rtf.format(diffDays, "day");
    } catch (e) {
      return "Recent";
    }
  };

  const filteredResumes = resumes.filter(r => 
    (r.title || "Untitled").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-6 py-10 md:px-12 md:py-16">
      <div className="mx-auto max-w-[1200px]">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[26px] font-medium text-slate-800">
            Welcome back, {profile?.full_name || getFirstName(profile?.full_name)}! You have {resumes.length} documents
          </h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/settings")}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-[var(--color-primary)] shadow-sm"
              title="Account Settings"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button 
              onClick={() => navigate("/connect-gemini")}
              className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              <IoFlashOutline className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              Gemini API Key
            </button>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create New
            </button>
          </div>
        </div>

        {/* Tabs & Search Controls */}
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-0 md:flex-row md:items-end md:justify-between">
          
          <div className="flex items-center gap-8 border-b border-slate-200 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab("all")} 
              className={`pb-4 text-sm font-bold tracking-tight whitespace-nowrap border-b-2 transition-all ${activeTab === "all" ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              All documents ({resumes.length})
            </button>
            <button 
              onClick={() => setActiveTab("jobs")} 
              className={`pb-4 text-sm font-bold tracking-tight whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === "jobs" ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              Tracked Jobs ({savedJobs.length})
            </button>
          </div>

          {activeTab === "all" && (
            <div className="flex items-center gap-4 py-2 flex-wrap">
              <div className="relative flex-grow sm:flex-grow-0">
                <BsSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search documents..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] sm:w-64"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                View:
                <div className="flex overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
                  <button 
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 transition ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}
                  >
                    <BsGrid className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 transition ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}
                  >
                    <BsList className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Content Area */}
        {activeTab === "jobs" ? (
          <JobBoard 
            jobs={savedJobs}
            loading={loading}
            onCreateJob={handleCreateJob}
            onDeleteJob={triggerJobDelete}
            onStatusChange={handleJobStatusChange}
            onUpdateJob={handleUpdateJob}
          />
        ) : (
          viewMode === "list" ? (
          <div className="overflow-x-auto rounded-[16px] border border-slate-100 bg-white p-2 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-5 pl-6 pr-3 text-[13px] font-bold text-slate-900 uppercase tracking-wide">Name</th>
                  <th className="py-5 px-3 text-[13px] font-bold text-slate-900 uppercase tracking-wide">Job</th>
                  <th className="py-5 px-3 text-[13px] font-bold text-slate-900 uppercase tracking-wide cursor-pointer flex items-center gap-1 group">
                    Created 
                    <span className="text-slate-400 group-hover:text-[var(--color-primary)]">↓</span>
                  </th>
                  <th className="py-5 px-3 text-[13px] font-bold text-slate-900 uppercase tracking-wide">Modified</th>
                  <th className="py-5 px-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredResumes.map((resume) => (
                  <tr 
                    key={resume.id} 
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => navigate(`/resume-builder?id=${resume.id}`)}
                  >
                    <td className="py-4 pl-6 pr-3">
                      <div>
                        {editingResumeId === resume.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(resume.id);
                                if (e.key === "Escape") setEditingResumeId(null);
                              }}
                              className="w-full rounded border border-[var(--color-primary)] px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                            <button
                              onClick={() => handleRename(resume.id)}
                              disabled={isRenaming}
                              className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] disabled:opacity-50"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingResumeId(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 group/title">
                              <div className="font-bold text-slate-900 mb-0.5">
                                {resume.title.length > 35 ? resume.title.substring(0,35) + "..." : resume.title}
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingResumeId(resume.id); setEditingTitle(resume.title); }}
                                className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-[var(--color-primary)] transition"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            </div>
                            <div className="mt-1">
                              <TemplateBadge templateName={resume.template_name} />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      {resume.saved_jobs ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveResumeForJob(resume.id); setJobModalOpen(true); }}
                          className="group/btn flex max-w-[150px] items-center gap-2 rounded-lg bg-[var(--color-primary)]/5 px-2.5 py-1.5 transition hover:bg-[var(--color-primary)]/10"
                          title={`${resume.saved_jobs.job_title} at ${resume.saved_jobs.company_name}`}
                        >
                          <span className="truncate text-[13px] font-semibold text-[var(--color-primary)]">
                            {resume.saved_jobs.company_name}
                          </span>
                          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]/60 opacity-0 transition-opacity group-hover/btn:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveResumeForJob(resume.id); setJobModalOpen(true); }}
                          className="flex items-center gap-1.5 rounded p-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                        >
                          <span>+</span>
                          Job Target
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-3 text-[14px] font-medium text-slate-700">{formatDate(resume.created_at)}</td>
                    <td className="py-4 px-3 text-[14px] font-medium text-slate-500 hover:text-[var(--color-primary)] hover:underline cursor-pointer">{getRelativeTime(resume.updated_at)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 transition-opacity lg:group-hover:opacity-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/resume-builder?id=${resume.id}`); }}
                          className="mr-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-bold text-white transition hover:opacity-90 active:scale-95"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => handlePin(resume.id, resume.is_primary, e)} 
                          className={`rounded p-2 transition ${resume.is_primary ? 'text-amber-500 bg-amber-50 opacity-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`} 
                          title={resume.is_primary ? "Unpin (Remove Primary)" : "Pin (Make Primary)"}
                          style={resume.is_primary ? { opacity: 1 } : {}}
                        >
                          <BsPinFill className={`h-[18px] w-[18px] ${resume.is_primary ? 'fill-current' : ''}`} /> 
                        </button>
                        <button onClick={(e) => handleDuplicate(resume.id, e)} className="rounded p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Duplicate">
                          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={(e) => handleDownload(resume.id, e)} className="rounded p-2 text-slate-400 transition hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]" title="Download PDF">
                          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={(e) => handleDelete(resume.id, e)} className="rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500" title="Delete record">
                          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredResumes.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-16 text-center">
                      <p className="text-base text-slate-500 font-medium tracking-wide">No documents found. Click 'Create New' to build your resume.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredResumes.map(resume => (
              <div 
                key={resume.id} 
                className={`group relative flex flex-col overflow-hidden rounded-[20px] border bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  resume.is_primary ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10' : 'border-slate-200 hover:border-[var(--color-primary)]/50'
                }`}
              >
                {resume.is_primary && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <BsPinFill className="h-3 w-3" />
                    <span>PRIMARY</span>
                  </div>
                )}
                
                <div 
                  onClick={() => navigate(`/resume-builder?id=${resume.id}`)}
                  className="relative p-3 w-full overflow-hidden bg-slate-50 group-hover:bg-slate-100/50 transition-all duration-300"
                >
                  <ResumeThumbnail 
                    resume={resume} 
                    documentJson={resume.resume_full_documents?.[0]?.document_json} 
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 z-10 hidden items-center justify-center bg-black/5 transition-all group-hover:flex">
                    <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-lg ring-1 ring-black/5 transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      Open Editor
                    </button>
                  </div>
                </div>

                
                {/* Fixed Action Menu on hover over image */}
                <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-100 lg:opacity-0 transition-opacity lg:group-hover:opacity-100 items-center bg-white/95 backdrop-blur pb-1 pl-1 pr-1 pt-1 rounded-lg shadow-sm border border-slate-200">
                  <button 
                    onClick={(e) => handlePin(resume.id, resume.is_primary, e)} 
                    className={`rounded p-1.5 transition ${resume.is_primary ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700'}`} 
                    title="Pin"
                  >
                    <BsPinFill className={`h-4 w-4 ${resume.is_primary ? 'fill-current' : ''}`} /> 
                  </button>
                  <button onClick={(e) => handleDuplicate(resume.id, e)} className="rounded p-1.5 text-slate-400 transition hover:text-slate-700" title="Duplicate">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button onClick={(e) => handleDownload(resume.id, e)} className="rounded p-1.5 text-slate-400 transition hover:text-[var(--color-primary)]" title="Download PDF">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  <button onClick={(e) => handleDelete(resume.id, e)} className="rounded p-1.5 text-slate-400 transition hover:text-red-500" title="Delete">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div 
                  onClick={() => navigate(`/resume-builder?id=${resume.id}`)}
                  className="flex flex-col p-4 cursor-pointer"
                >
                  <div className="flex items-center justify-between min-w-0">
                    {editingResumeId === resume.id ? (
                      <div className="flex w-full items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(resume.id);
                            if (e.key === "Escape") setEditingResumeId(null);
                          }}
                          className="w-full rounded border border-[var(--color-primary)] px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title min-w-0 flex-1">
                        <h3 className="truncate text-[14px] font-bold text-slate-900">{resume.title || 'Untitled Document'}</h3>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingResumeId(resume.id); setEditingTitle(resume.title); }}
                          className="opacity-100 lg:opacity-0 lg:group-hover/title:opacity-100 p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition shrink-0"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Brief Status Area */}
                  <div className="mt-2 h-[20px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${resume.resume_status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        {resume.resume_status || 'draft'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {new Date(resume.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Job Target Info */}
                  <div className="mt-2.5">
                    {resume.saved_jobs ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveResumeForJob(resume.id); setJobModalOpen(true); }}
                        className="group/job flex w-full items-center justify-between rounded-xl bg-[var(--color-primary)]/5 px-3 py-2 transition hover:bg-[var(--color-primary)]/10"
                      >
                        <div className="flex flex-col min-w-0 text-left">
                          <span className="truncate text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] opacity-60">Target Job</span>
                          <span className="truncate text-[12px] font-bold text-slate-800">{resume.saved_jobs.company_name}</span>
                        </div>
                        <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)] opacity-0 transition-opacity group-hover/job:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveResumeForJob(resume.id); setJobModalOpen(true); }}
                        className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-400 transition hover:border-[var(--color-primary)]/40 hover:bg-slate-50 hover:text-[var(--color-primary)]"
                      >
                        <span className="text-lg leading-none">+</span>
                        Link Target Job
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">{getRelativeTime(resume.updated_at)}</span>
                    <TemplateBadge templateName={resume.template_name} />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredResumes.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <p className="text-base text-slate-500 font-medium tracking-wide">No documents found. Click 'Create New' to build your resume.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {jobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-8">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col scale-100 rounded-3xl bg-white shadow-2xl transition-transform animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 pb-0">
              <h3 className="text-xl font-bold text-slate-900">Link Target Job</h3>
              <p className="mt-2 text-sm text-slate-500">Select a tracked job to naturally associate it with this resume layout.</p>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1" data-lenis-prevent>
              <div className="space-y-4 rounded-xl border border-slate-100 p-2">
              {!isAddingNewJobInModal ? (
                <>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Existing Job</span>
                    <button 
                      onClick={() => setIsAddingNewJobInModal(true)}
                      className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                    >
                      + Track New Job
                    </button>
                  </div>
                  
                  {savedJobs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      You haven't tracked any jobs yet.
                    </div>
                  ) : (
                    savedJobs.map(job => (
                      <button 
                        key={job.id} 
                        onClick={() => handleLinkJob(job.id)}
                        className="flex w-full items-center justify-between rounded-lg p-3 text-left transition hover:bg-slate-50 border border-transparent hover:border-slate-200"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{job.company_name}</p>
                          <p className="text-xs text-slate-500">{job.job_title}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{job.status}</span>
                      </button>
                    ))
                  )}
                </>
              ) : (
                <form onSubmit={handleTrackAndLinkNewJob} className="space-y-3 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Track & Link New Job</span>
                    <button 
                      type="button"
                      onClick={() => setIsAddingNewJobInModal(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ← Back
                    </button>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">Company Name</label>
                    <input 
                      required 
                      value={newJobModalData.company} 
                      onChange={e => setNewJobModalData({...newJobModalData, company: e.target.value})} 
                      placeholder="e.g. Google" 
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">Role Title</label>
                    <input 
                      required 
                      value={newJobModalData.role} 
                      onChange={e => setNewJobModalData({...newJobModalData, role: e.target.value})} 
                      placeholder="e.g. Frontend Engineer" 
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">Job URL (Optional)</label>
                    <input 
                      value={newJobModalData.url} 
                      onChange={e => setNewJobModalData({...newJobModalData, url: e.target.value})} 
                      placeholder="https://..." 
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none" 
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmittingNewJob}
                    className="flex w-full items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-70"
                  >
                    {isSubmittingNewJob ? "Saving..." : "Track & Link Job"}
                  </button>
                </form>
              )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/50">
              {!isAddingNewJobInModal ? (
                <>
                  <div className="flex flex-col items-start gap-1">
                    <button 
                      onClick={() => handleLinkJob(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Unlink Only
                    </button>
                    {resumes.find(r => r.id === activeResumeForJob)?.target_job_id && (
                      <button 
                        onClick={() => {
                          const jobId = resumes.find(r => r.id === activeResumeForJob)?.target_job_id;
                          setJobModalOpen(false);
                          triggerJobDelete(jobId);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Delete Tracked Job
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setJobModalOpen(false)}
                    className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setJobModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-8 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 w-full"
                >
                  Close Modal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md scale-100 rounded-3xl bg-white p-6 shadow-2xl transition-transform animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900">What role are you targeting?</h3>
            <p className="mt-2 text-sm text-slate-500">Providing the job role configures your resume naming and tracks your job hunt naturally.</p>
            
            <form onSubmit={handleCreateNew} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Company Name</label>
                <input 
                  required 
                  value={newTargetCompany} 
                  onChange={e => setNewTargetCompany(e.target.value)} 
                  disabled={isCreating}
                  placeholder="e.g. Google" 
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Role Title</label>
                <input 
                  required 
                  value={newTargetRole} 
                  onChange={e => setNewTargetRole(e.target.value)} 
                  disabled={isCreating}
                  placeholder="e.g. Frontend Engineer" 
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Job URL (Optional)</label>
                <input 
                  value={newTargetUrl} 
                  onChange={e => setNewTargetUrl(e.target.value)} 
                  disabled={isCreating}
                  placeholder="https://..." 
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" 
                />
              </div>
              
              <div className="pt-4 flex w-full flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="flex w-full items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-secondary)] disabled:opacity-70"
                >
                  {isCreating ? "Initializing..." : "Track Job & Build Resume"}
                </button>
                <div className="flex items-center justify-between">
                  <button 
                    type="button" 
                    onClick={() => { setCreateModalOpen(false); setNewTargetCompany(""); setNewTargetRole(""); setNewTargetUrl(""); }}
                    disabled={isCreating}
                    className="text-sm font-medium text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCreateBlank}
                    disabled={isCreating}
                    className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Skip & Create Blank
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setResumeToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Document?"
        message="Are you sure you want to delete this document? This action is permanent and cannot be undone."
        confirmText="Yes, delete it"
        cancelText="No, keep it"
      />

      <ConfirmModal 
        isOpen={jobDeleteModalOpen}
        onClose={() => { setJobDeleteModalOpen(false); setJobToDelete(null); }}
        onConfirm={confirmJobDelete}
        title="Remove from board?"
        message="Are you sure you want to delete this job track? This action is permanent and cannot be undone."
        confirmText="Yes, remove it"
        cancelText="No, keep it"
      />
    </div>
  );
}

export default Dashboard;