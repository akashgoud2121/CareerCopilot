import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { generateKeywords } from "../services/gemini";
import { IoSparklesOutline, IoCopyOutline, IoCheckmarkOutline, IoDocumentTextOutline, IoPricetagsOutline, IoConstructOutline, IoStatsChartOutline, IoAlertCircleOutline, IoRocketOutline, IoSyncOutline } from "react-icons/io5";
import { generateSmartRewrite } from "../services/gemini";
import { saveResumeSectionByKey } from "../services/resumeBuilderApi";
import { readModelToResumeData } from "../services/resumeReadModelApi";

export default function KeywordGeneration() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [keywords, setKeywords] = useState(null); // { skills: {matched, missing}, ... , matchScore }
  const [error, setError] = useState("");
  const [copiedSection, setCopiedSection] = useState(null);
  const [fullResumeData, setFullResumeData] = useState(null);

  // Rewrite Studio States
  const [selectedRewriteSource, setSelectedRewriteSource] = useState(null); // { type, clientKey, text }
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenText, setRewrittenText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [analysisCache, setAnalysisCache] = useState({}); // { [cacheKey]: keywordsResult }
  const hasLoaded = useRef(false);

  // Persistence: Load from LocalStorage (Sync)
  useEffect(() => {
    const savedJD = localStorage.getItem("keyword_jd");
    const savedKeywords = localStorage.getItem("keyword_results");
    const savedCache = localStorage.getItem("keyword_analysis_cache");
    const savedRewrite = localStorage.getItem("keyword_rewritten_text");

    if (savedJD) setJobDescription(savedJD);
    if (savedKeywords) {
      try { setKeywords(JSON.parse(savedKeywords)); } catch (e) {}
    }
    if (savedCache) {
      try { setAnalysisCache(JSON.parse(savedCache)); } catch (e) {}
    }
    if (savedRewrite) setRewrittenText(savedRewrite);
    
    // Set ref to true, but we need to wait for states to actually update
    setTimeout(() => {
      hasLoaded.current = true;
    }, 100);
  }, []);

  // Persistence: Save to LocalStorage
  useEffect(() => {
    if (!hasLoaded.current) return;

    // Only save if we have actual content to avoid accidental wipes
    if (jobDescription) localStorage.setItem("keyword_jd", jobDescription);
    if (keywords) localStorage.setItem("keyword_results", JSON.stringify(keywords));
    if (Object.keys(analysisCache).length > 0) {
      localStorage.setItem("keyword_analysis_cache", JSON.stringify(analysisCache));
    }
    if (rewrittenText) localStorage.setItem("keyword_rewritten_text", rewrittenText);

  }, [jobDescription, keywords, analysisCache, rewrittenText]);

  // Initial Fetch: All Resumes
  useEffect(() => {
    const fetchAllResumes = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("id, title, is_primary, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setResumes(data || []);
        
        // Default to primary or first
        const defaultResume = data.find(r => r.is_primary) || data[0];
        if (defaultResume) {
          setResumeId(defaultResume.id);
        }
      } catch (err) {
        console.error("Error fetching resumes list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllResumes();
  }, [user]);

  // Fetch Specific Resume Data
  useEffect(() => {
    const fetchSpecificResume = async () => {
      if (!resumeId) return;
      
      try {
        const { data, error } = await supabase
          .from("resumes")
          .select("*, resume_full_documents(document_json)")
          .eq("id", resumeId)
          .single();

        if (error) throw error;

        if (data?.resume_full_documents) {
          const payload = Array.isArray(data.resume_full_documents)
            ? data.resume_full_documents[0]
            : data.resume_full_documents;
          
          const documentJson = payload?.document_json || {};
          setResumeData(documentJson);
          setFullResumeData(readModelToResumeData(documentJson));

          // Check cache when switching resumes for THE SAME JD
          if (jobDescription.trim()) {
             const jdHash = jobDescription.trim().slice(0, 100);
             const resumeFingerprint = JSON.stringify(documentJson || {}).length;
             const cacheKey = `${resumeId}-${jdHash}-${resumeFingerprint}`;
             
             if (analysisCache[cacheKey]) {
                setKeywords(analysisCache[cacheKey]);
             } else if (!localStorage.getItem("keyword_results")) {
                // ONLY clear if we don't have a global result saved
                setKeywords(null);
             }
          }
        }
        
        // Reset current view rewritten text (unless loaded from storage)
        if (!localStorage.getItem("keyword_rewritten_text")) {
          setRewrittenText("");
        }
      } catch (err) {
        console.error("Error fetching specific resume:", err);
      }
    };

    fetchSpecificResume();
  }, [resumeId]);

  const handleGenerate = async (force = false) => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description first.");
      return;
    }

    const jdHash = jobDescription.trim().slice(0, 100);
    const resumeFingerprint = JSON.stringify(resumeData || {}).length;
    const cacheKey = `${resumeId}-${jdHash}-${resumeFingerprint}`;

    // Check Cache First
    if (analysisCache[cacheKey] && !force) {
      setKeywords(analysisCache[cacheKey]);
      return;
    }
    
    setGenerating(true);
    setError("");
    setKeywords(null);

    try {
      const result = await generateKeywords(resumeData, jobDescription);
      setKeywords(result);
      
      // Update Cache
      setAnalysisCache(prev => ({
        ...prev,
        [cacheKey]: result
      }));

      setRewrittenText("");
      setSelectedRewriteSource(null);
    } catch (err) {
      setError(err.message || "Failed to generate keywords. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (section, data) => {
    let text = "";
    if (section === "skills") {
      text = data.map(group => `${group.category}: ${[...group.matched, ...group.missing].join(", ")}`).join("\n");
    } else {
      text = [...(data.matched || []), ...(data.missing || [])].join(", ");
    }
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleRewrite = async () => {
    if (!selectedRewriteSource || !keywords) return;
    
    setIsRewriting(true);
    setError("");

    try {
      const missingTokens = [
        ...keywords.skills.flatMap(s => s.missing),
        ...keywords.projects.missing,
        ...keywords.experience.missing
      ].slice(0, 8);

      // Holistic Context: Gather everything already in the resume to avoid repetition
      const fullResumeText = `
        Skills: ${fullResumeData.skills.map(s => s.skills).join(", ")}
        Projects: ${fullResumeData.projects.map(p => p.title + ": " + p.description).join(" | ")}
        Experience: ${fullResumeData.experience.map(e => e.role + " at " + e.company + ": " + e.description).join(" | ")}
      `.trim();

      const result = await generateSmartRewrite(
        selectedRewriteSource.text,
        missingTokens,
        {
           jobContext: jobDescription.slice(0, 500),
           fullResumeText: fullResumeText
        }
      );
      setRewrittenText(result);
    } catch (err) {
      setError("Rewrite failed: " + err.message);
    } finally {
      setIsRewriting(false);
    }
  };

  const saveRewrittenToResume = async () => {
    if (!user?.id || !resumeId || !selectedRewriteSource || !rewrittenText) {
      if (!user?.id) setError("Authentication session expired. Please refresh the page.");
      return;
    }
    
    try {
      const updatedResume = { ...fullResumeData };
      const { type, clientKey } = selectedRewriteSource;

      if (type === "projects") {
        const item = updatedResume.projects.find(p => p.clientKey === clientKey);
        if (item) item.description = rewrittenText;
      } else if (type === "experience") {
        const item = updatedResume.experience.find(e => e.clientKey === clientKey);
        if (item) item.description = rewrittenText;
      }

      await saveResumeSectionByKey({
        resumeId,
        userId: user.id,
        sectionKey: type,
        resumeData: updatedResume,
        customSections: updatedResume.customSections || [],
      });

      setFullResumeData(updatedResume);
      setSuccessMsg("Resume successfully updated with optimized content!");
      setTimeout(() => setSuccessMsg(""), 3000);
      setRewrittenText("");
      setSelectedRewriteSource(null);
    } catch (err) {
      console.error("Save error details:", err);
      if (err.status === 401 || err.code === "PGRST301") {
        setError("Your session has expired. Please refresh the page and log in again.");
      } else {
        setError("Failed to save rewrite: " + (err.message || "Unknown error"));
      }
    }
  };

  const KeywordBadge = ({ text, type = "missing" }) => (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-[12px] font-bold tracking-tight uppercase transition-all
      ${type === 'matched' 
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700' 
        : 'border-amber-100 bg-amber-50 text-amber-700 hover:border-[var(--color-primary)]/40 hover:bg-white hover:text-[var(--color-primary)]'}`}>
      {text}
      {type === 'matched' && <IoCheckmarkOutline className="ml-1.5" size={12} />}
    </span>
  );

  const SectionResult = ({ title, data, sectionKey, icon: Icon }) => {
    if (!data) return null;
    
    const isSkills = sectionKey === "skills";
    const isEmpty = isSkills 
      ? data.length === 0 
      : (data.matched?.length === 0 && data.missing?.length === 0);

    if (isEmpty) return null;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-900">
               {Icon && <Icon size={18} />}
            </div>
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-900">{title}</h3>
          </div>
          <button
            onClick={() => handleCopy(sectionKey, data)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-[var(--color-primary)]"
          >
            {copiedSection === sectionKey ? (
              <><IoCheckmarkOutline className="text-emerald-500" size={15} /> Copied</>
            ) : (
              <><IoCopyOutline size={14} /> Copy All</>
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          {isSkills && Array.isArray(data) ? (
            data.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{group.category}</span>
                <div className="flex flex-wrap gap-2">
                  {group.matched.map((kw, i) => <KeywordBadge key={`m-${i}`} text={kw} type="matched" />)}
                  {group.missing.map((kw, i) => <KeywordBadge key={`ms-${i}`} text={kw} type="missing" />)}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.matched.map((kw, i) => <KeywordBadge key={`m-${i}`} text={kw} type="matched" />)}
              {data.missing.map((kw, i) => <KeywordBadge key={`ms-${i}`} text={kw} type="missing" />)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-6 py-10 md:px-12 lg:px-20 relative">
      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-2xl">
             <IoCheckmarkOutline className="text-emerald-400" size={18} />
             {successMsg}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1100px]">
        {/* Header - Corporate Minimal */}
        <div className="mb-10 flex flex-col border-b border-slate-200 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[28px] font-medium text-slate-900">
              Keyword Optimization
            </h1>
            <p className="mt-2 text-[15px] text-slate-500 font-medium">
              Align your engineering profile with target job expectations using precision extraction.
            </p>
          </div>
          <div className="mt-6 flex flex-col items-start gap-2 md:mt-0 md:items-end">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected Profile</label>
             <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-[var(--color-primary)] transition-all"
             >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
             </select>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-12 xl:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <label className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Target Job Description
                </label>
                <p className="mt-1 text-xs text-slate-400">Paste the full job requirements from LinkedIn, Indeed, or company portal.</p>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                data-lenis-prevent
                placeholder="Paste content here..."
                className="w-full min-h-[400px] rounded-lg border border-slate-200 bg-slate-50/30 p-4 text-[14px] leading-relaxed text-slate-800 outline-none transition-all focus:border-[var(--color-primary)]/50 focus:bg-white focus:ring-1 focus:ring-[var(--color-primary)]/20"
              />

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-[13px] font-bold text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-4 border-t border-slate-50 pt-6">
                <button
                  onClick={() => setJobDescription("")}
                  className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear All
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-8 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {generating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    <IoSparklesOutline size={16} />
                  )}
                  {generating ? "Optimizing..." : "Analyze Match"}
                </button>
                {keywords && (
                  <button
                    onClick={() => handleGenerate(true)}
                    disabled={generating}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    title="Force refresh analysis"
                  >
                    <IoSyncOutline className={generating ? "animate-spin" : ""} size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 xl:col-span-5">
            <div className="flex flex-col gap-6">
              {keywords && !generating && (
                 <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                    <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
                       <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                          {/* Background Circle */}
                          <circle
                             cx="50"
                             cy="50"
                             r="40"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="8"
                             className="text-slate-100"
                          />
                          {/* Progress Circle */}
                          <circle
                             cx="50"
                             cy="50"
                             r="40"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="8"
                             strokeDasharray={251.2}
                             strokeDashoffset={251.2 - (251.2 * keywords.matchScore) / 100}
                             className="text-[var(--color-primary)] transition-all duration-1000"
                             strokeLinecap="round"
                          />
                       </svg>
                       <span className="text-2xl font-black text-slate-900">{keywords.matchScore}%</span>
                    </div>
                    <h4 className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-900">ATS Match Score</h4>
                    <p className="mt-3 text-[13px] text-slate-500 font-medium leading-relaxed px-4">Your profile alignment with this specific role requirements.</p>
                 </div>
              )}

              {!keywords && !generating ? (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="mb-4 rounded-full bg-slate-50 p-4 text-slate-400">
                    <IoDocumentTextOutline size={24} />
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Awaiting Analysis</h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                    Paste a job description to trigger the ATS gap analysis and optimization engine.
                  </p>
                </div>
              ) : generating ? (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-[var(--color-primary)]" />
                  <p className="mt-4 text-sm font-bold text-slate-900">AI Deep Scanning...</p>
                  <p className="mt-1 text-xs text-slate-500">Cross-referencing resume with JD tokens</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                   <SectionResult title="Tech Inventory" data={keywords.skills} sectionKey="skills" icon={IoPricetagsOutline} />
                   
                   {/* Pro-Tip for Skills - with safety check for legacy data */}
                   {Array.isArray(keywords.skills) && keywords.skills.some(g => g.missing && g.missing.length > 0) && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                         <div className="flex gap-3">
                            <div className="mt-0.5 text-amber-600">
                               <IoAlertCircleOutline size={20} />
                            </div>
                            <div>
                               <p className="text-[13px] font-bold text-amber-900">Optimization Tip</p>
                               <p className="mt-1 text-[12px] leading-relaxed text-amber-700 font-medium">
                                 Your technical inventory has gaps. Use the button below to copy the missing skills **grouped by category** so you know exactly where to add them in your profile.
                               </p>
                               <button 
                                 onClick={() => {
                                   const missingByGroup = keywords.skills
                                    .filter(g => g.missing.length > 0)
                                    .map(g => `${g.category}: ${g.missing.join(", ")}`)
                                    .join("\n");
                                   navigator.clipboard.writeText(missingByGroup);
                                   setSuccessMsg("Categorized skills copied!");
                                   setTimeout(() => setSuccessMsg(""), 3000);
                                 }}
                                 className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700"
                               >
                                 <IoCopyOutline size={12} />
                                 Copy Categorized Missing Skills
                               </button>
                            </div>
                         </div>
                      </div>
                   )}

                   <SectionResult title="Implementation Gaps" data={keywords.projects} sectionKey="projects" icon={IoConstructOutline} />
                   <SectionResult title="Domain Keywords" data={keywords.experience} sectionKey="experience" icon={IoStatsChartOutline} />
                   
                   {/* Smart Rewrite Studio */}
                   <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.02] p-6">
                      <div className="mb-4 flex items-center gap-2 text-[var(--color-primary)]">
                         <IoRocketOutline size={20} />
                         <h4 className="text-sm font-bold uppercase tracking-widest">Rewrite Studio</h4>
                      </div>
                      <p className="mb-6 text-[13px] text-slate-600 font-medium leading-relaxed">
                        Select a section below to optimize it by weaving in missing keywords naturally.
                      </p>
                      
                      <div className="space-y-3">
                         <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Content</label>
                            <select 
                               onChange={(e) => {
                                 const val = e.target.value;
                                 if (!val) return;
                                 const [type, key] = val.split(':');
                                 const item = fullResumeData[type].find(i => i.clientKey === key);
                                 setSelectedRewriteSource({ type, clientKey: key, text: item.description });
                               }}
                               className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-primary)] transition-all"
                            >
                               <option value="">Choose project or experience...</option>
                               {fullResumeData?.projects?.map(p => <option key={p.clientKey} value={`projects:${p.clientKey}`}>Project: {p.title || 'Untitled'}</option>)}
                               {fullResumeData?.experience?.map(e => <option key={e.clientKey} value={`experience:${e.clientKey}`}>Experience: {e.role} @ {e.company}</option>)}
                            </select>
                         </div>

                         <button
                            disabled={!selectedRewriteSource || isRewriting}
                            onClick={handleRewrite}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-[13px] font-bold text-white transition hover:bg-[var(--color-primary)] disabled:opacity-30"
                         >
                            {isRewriting ? <IoSyncOutline className="animate-spin" size={18} /> : <IoSparklesOutline size={16} />}
                            {isRewriting ? 'Optimizing...' : 'Smart Optimize Content'}
                         </button>

                         {rewrittenText && (
                            <div className="mt-6 animate-in slide-in-from-bottom-4 duration-300">
                               <div className="rounded-xl border border-emerald-100 bg-white p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Generated Optimization</span>
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(rewrittenText)}
                                      className="text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                      <IoCopyOutline size={14} />
                                    </button>
                                  </div>
                                  <p className="text-[13px] leading-relaxed text-slate-700 font-medium italic">
                                    "{rewrittenText}"
                                  </p>
                                  <button
                                     onClick={saveRewrittenToResume}
                                     className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                                  >
                                     <IoCheckmarkOutline size={16} />
                                     Update in Resume
                                  </button>
                               </div>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
