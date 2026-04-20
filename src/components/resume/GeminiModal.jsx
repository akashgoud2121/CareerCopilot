import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Clipboard, Check, X } from "lucide-react";
import { generateResumeSection } from "../../services/gemini";

const SUMMARY_TONE_OPTIONS = [
  "Professional",
  "Confident",
  "Modern",
  "Technical",
];

const PROJECT_TONE_OPTIONS = [
  "Professional",
  "Technical",
  "Impact-focused",
  "Concise",
];

const EXPERIENCE_TONE_OPTIONS = [
  "Professional",
  "Technical",
  "Impact-focused",
  "Concise",
];

const CERTIFICATION_TONE_OPTIONS = [
  "Professional",
  "Technical",
  "Concise",
];

const ACHIEVEMENT_TONE_OPTIONS = [
  "Professional",
  "Impact-focused",
  "Concise",
  "Confident",
];

const CUSTOM_TONE_OPTIONS = [
  "Professional",
  "Technical",
  "Impact-focused",
  "Creative",
  "Concise",
];

function normalizeListToText(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function getContextSeed(aiContext = null) {
  if (!aiContext || typeof aiContext !== "object") return {};
  return aiContext.initialData || aiContext.item || {};
}

function getTargetItem(aiContext = null) {
  if (!aiContext || typeof aiContext !== "object") return {};
  return aiContext.item || aiContext.initialData || {};
}

function getInitialSummaryForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const educationList = Array.isArray(userData?.education)
    ? userData.education
    : [];
  const skillsData = Array.isArray(userData?.skills) ? userData.skills : [];

  const educationText = educationList
    .map((item) => {
      const degree = item?.degree || item?.degreeMajor || "";
      const institution = item?.institution || item?.college || "";
      const field = item?.fieldOfStudy || item?.specialization || "";
      return [degree, field, institution].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");

  const skillsText = skillsData
    .flatMap((group) => {
      if (Array.isArray(group?.skills)) return group.skills;

      if (typeof group?.skills === "string") {
        return group.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
      }

      return [];
    })
    .filter(Boolean)
    .join(", ");

  const onboarding = userData?.onboarding || {};

  return {
    targetRole: seed.targetRole || onboarding.targetRole || userData?.targetRole || "",
    currentStatus: seed.currentStatus || onboarding.currentStatus || userData?.currentStatus || "",
    education: seed.education || onboarding.education || educationText || "",
    skills: seed.skills || skillsText || "",
    careerGoal: seed.careerGoal || "",
    tone: seed.tone || "Professional",
  };
}

function getInitialProjectForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const targetProject = getTargetItem(aiContext);

  return {
    title: seed.title || targetProject?.title || "",
    projectType: seed.projectType || targetProject?.projectType || "",
    organization: seed.organization || targetProject?.organization || "",
    technologies:
      normalizeListToText(seed.technologies) ||
      normalizeListToText(targetProject?.technologies) ||
      normalizeListToText(targetProject?.techStack) ||
      "",
    description: seed.description || targetProject?.description || "",
    tone: seed.tone || targetProject?.tone || "Professional",
  };
}

function getInitialExperienceForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const targetExperience = getTargetItem(aiContext);

  return {
    role: seed.role || targetExperience?.role || targetExperience?.jobTitle || "",
    company:
      seed.company ||
      targetExperience?.company ||
      targetExperience?.organization ||
      "",
    employmentType:
      seed.employmentType || targetExperience?.employmentType || "",
    cityState:
      seed.cityState ||
      seed.location ||
      targetExperience?.cityState ||
      targetExperience?.location ||
      "",
    responsibilities:
      seed.responsibilities ||
      seed.description ||
      targetExperience?.description ||
      "",
    toolsUsed: seed.toolsUsed || targetExperience?.toolsUsed || "",
    tone: seed.tone || targetExperience?.tone || "Professional",
  };
}

function getInitialCertificationForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const targetCertification = getTargetItem(aiContext);

  return {
    name:
      seed.name || targetCertification?.name || targetCertification?.title || "",
    issuingBody:
      seed.issuingBody ||
      targetCertification?.issuingBody ||
      targetCertification?.issuer ||
      targetCertification?.organization ||
      "",
    credentialId:
      seed.credentialId || targetCertification?.credentialId || "",
    skillsCovered:
      seed.skillsCovered ||
      seed.description ||
      targetCertification?.skillsCovered ||
      targetCertification?.description ||
      "",
    tone: seed.tone || targetCertification?.tone || "Professional",
  };
}

function getInitialAchievementForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const targetAchievement = getTargetItem(aiContext);

  return {
    category: seed.category || targetAchievement?.category || "",
    title:
      seed.title ||
      targetAchievement?.title ||
      targetAchievement?.name ||
      targetAchievement?.achievementTitle ||
      "",
    organizedBy:
      seed.organizedBy ||
      targetAchievement?.organizedBy ||
      targetAchievement?.organizerOrRank ||
      targetAchievement?.rank ||
      targetAchievement?.organization ||
      "",
    description: seed.description || targetAchievement?.description || "",
    tone: seed.tone || targetAchievement?.tone || "Professional",
  };
}

function getInitialCustomForm(userData = {}, aiContext = null) {
  const seed = getContextSeed(aiContext);
  const targetCustom = getTargetItem(aiContext);

  return {
    title: seed.title || targetCustom?.title || "",
    subtitle: seed.subtitle || targetCustom?.subtitle || "",
    description: seed.description || targetCustom?.description || "",
    tone: seed.tone || targetCustom?.tone || "Professional",
  };
}

function getSectionBadgeLabel(sectionKey) {
  switch (sectionKey) {
    case "summary":
      return "Summary";
    case "projects":
      return "Projects";
    case "experience":
      return "Experience";
    case "certifications":
      return "Certifications";
    case "achievements":
      return "Achievements";
    default:
      return sectionKey || "Section";
  }
}

function getContextBadge(aiContext = null) {
  if (typeof aiContext?.index === "number") {
    return `Item ${aiContext.index + 1}`;
  }
  return "";
}

function GeminiModal({
  isOpen,
  onClose,
  onApply,
  sectionKey,
  userData,
  aiContext = null,
}) {
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [summaryForm, setSummaryForm] = useState(
    getInitialSummaryForm(userData, aiContext)
  );
  const [projectForm, setProjectForm] = useState(
    getInitialProjectForm(userData, aiContext)
  );
  const [experienceForm, setExperienceForm] = useState(
    getInitialExperienceForm(userData, aiContext)
  );
  const [certificationForm, setCertificationForm] = useState(
    getInitialCertificationForm(userData, aiContext)
  );
  const [achievementForm, setAchievementForm] = useState(
    getInitialAchievementForm(userData, aiContext)
  );
  const [customForm, setCustomForm] = useState(
    getInitialCustomForm(userData, aiContext)
  );

  const isSummarySection = sectionKey === "summary";
  const isProjectsSection = sectionKey === "projects";
  const isExperienceSection = sectionKey === "experience";
  const isCertificationsSection = sectionKey === "certifications";
  const isAchievementsSection = sectionKey === "achievements";
  const isCustomSection = sectionKey?.startsWith("custom_");

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.lenis?.stop();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.lenis?.start();
    };
  }, [isOpen]);



  useEffect(() => {
    if (!isOpen) return;

    setGeneratedContent("");
    setErrorMessage("");
    setCopied(false);

    setSummaryForm(getInitialSummaryForm(userData, aiContext));
    setProjectForm(getInitialProjectForm(userData, aiContext));
    setExperienceForm(getInitialExperienceForm(userData, aiContext));
    setCertificationForm(getInitialCertificationForm(userData, aiContext));
    setAchievementForm(getInitialAchievementForm(userData, aiContext));
    setCustomForm(getInitialCustomForm(userData, aiContext));
  }, [isOpen, sectionKey, userData, aiContext]);

  const summaryValidation = useMemo(() => {
    if (!isSummarySection) return "";
    if (!summaryForm.targetRole?.trim()) return "Primary Profession / Field missing from profile. Please update onboarding.";
    if (!summaryForm.skills.trim()) return "Top skills are required.";
    if (!summaryForm.careerGoal.trim()) return "Tell us about yourself first.";
    return "";
  }, [isSummarySection, summaryForm]);

  const projectValidation = useMemo(() => {
    if (!isProjectsSection) return "";
    if (!projectForm.title.trim()) return "Project title is required.";
    if (!projectForm.technologies.trim()) return "Technologies used are required.";
    if (!projectForm.description.trim()) return "Project description is required.";
    return "";
  }, [isProjectsSection, projectForm]);

  const experienceValidation = useMemo(() => {
    if (!isExperienceSection) return "";
    if (!experienceForm.role.trim()) return "Role is required.";
    if (!experienceForm.company.trim())
      return "Company / organization is required.";
    if (!experienceForm.responsibilities.trim())
      return "Job description / Work details are required.";
    if (!experienceForm.toolsUsed.trim())
      return "Tools / technologies used are required.";
    return "";
  }, [isExperienceSection, experienceForm]);

  const certificationValidation = useMemo(() => {
    if (!isCertificationsSection) return "";
    if (!certificationForm.name.trim()) return "Certification name is required.";
    if (!certificationForm.issuingBody.trim()) return "Issuing body is required.";
    if (!certificationForm.skillsCovered.trim()) {
      return "Skills covered / description is required.";
    }
    return "";
  }, [isCertificationsSection, certificationForm]);

  const achievementValidation = useMemo(() => {
    if (!isAchievementsSection) return "";
    if (!achievementForm.category.trim()) return "Category is required.";
    if (!achievementForm.title.trim()) return "Title is required.";
    if (!achievementForm.organizedBy.trim())
      return "Organized by / rank is required.";
    if (!achievementForm.description.trim())
      return "Description input is required.";
    return "";
  }, [isAchievementsSection, achievementForm]);

  const customValidation = useMemo(() => {
    if (!isCustomSection) return "";
    if (!customForm.title.trim()) return "Title is required.";
    if (!customForm.description.trim()) return "Description input is required.";
    return "";
  }, [isCustomSection, customForm]);

  if (!isOpen) return null;

  const handleSummaryFieldChange = (field, value) => {
    setSummaryForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProjectFieldChange = (field, value) => {
    setProjectForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExperienceFieldChange = (field, value) => {
    setExperienceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCertificationFieldChange = (field, value) => {
    setCertificationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAchievementFieldChange = (field, value) => {
    setAchievementForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomFieldChange = (field, value) => {
    setCustomForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerate = async () => {
    try {
      if (isSummarySection && summaryValidation) {
        setErrorMessage(summaryValidation);
        return;
      }

      if (isProjectsSection && projectValidation) {
        setErrorMessage(projectValidation);
        return;
      }

      if (isExperienceSection && experienceValidation) {
        setErrorMessage(experienceValidation);
        return;
      }

      if (isCertificationsSection && certificationValidation) {
        setErrorMessage(certificationValidation);
        return;
      }

      if (isAchievementsSection && achievementValidation) {
        setErrorMessage(achievementValidation);
        return;
      }

      if (isCustomSection && customValidation) {
        setErrorMessage(customValidation);
        return;
      }

      setIsGenerating(true);
      setErrorMessage("");
      setGeneratedContent("");
      setCopied(false);

      let sectionFormData = {};

      if (isSummarySection) sectionFormData = summaryForm;
      if (isProjectsSection) sectionFormData = projectForm;
      if (isExperienceSection) sectionFormData = experienceForm;
      if (isCertificationsSection) sectionFormData = certificationForm;
      if (isAchievementsSection) sectionFormData = achievementForm;
      if (isCustomSection) sectionFormData = customForm;

      const text = await generateResumeSection(
        sectionKey,
        userData,
        sectionFormData
      );

      setGeneratedContent(text || "No content returned.");
    } catch (error) {
      setErrorMessage(error?.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };


  const handleCopy = async () => {
    if (!generatedContent) return;

    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleApply = () => {
    const content = generatedContent.trim();
    if (!content) return;

    onApply({
      content,
      sectionKey,
      field: sectionKey === "summary" ? "text" : aiContext?.field || "description",
      index: aiContext?.index,
      clientKey: aiContext?.clientKey || null,
      item: aiContext?.item || null,
    });
  };

  const badgeContext = getContextBadge(aiContext);

  const modalUI = (
    <div data-lenis-prevent className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/45 backdrop-blur-[3px]">

      <div className="flex min-h-screen items-start justify-center p-4 sm:p-6">
        <div className="my-4 w-full max-w-4xl rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                AI Assistant
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--color-primary)]">
                Generate with AI
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r lg:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[rgba(53,0,139,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  {getSectionBadgeLabel(sectionKey)}
                </span>

                {badgeContext ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {badgeContext}
                  </span>
                ) : null}
              </div>

              {isSummarySection ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Target Role" required>
                      <input
                        type="text"
                        value={summaryForm.targetRole}
                        onChange={(e) =>
                          handleSummaryFieldChange("targetRole", e.target.value)
                        }
                        placeholder="e.g. Backend Developer"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Experience / Status">
                      <input
                        type="text"
                        value={summaryForm.currentStatus}
                        onChange={(e) =>
                          handleSummaryFieldChange("currentStatus", e.target.value)
                        }
                        placeholder="e.g. Fresher / Student / 3+ Years Exp"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <CompactField label="Background / Education (Optional)">
                    <input
                      type="text"
                      value={summaryForm.education}
                      onChange={(e) =>
                        handleSummaryFieldChange("education", e.target.value)
                      }
                      placeholder="e.g. B.Tech Computer Science, Coding Bootcamp..."
                      className={inputClassName()}
                    />
                  </CompactField>

                  <CompactField label="Top Skills" required>
                    <textarea
                      rows={3}
                      value={summaryForm.skills}
                      onChange={(e) =>
                        handleSummaryFieldChange("skills", e.target.value)
                      }
                      placeholder="e.g. React, JavaScript, Project Management, SEO..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Describe yourself / What are you?" required>
                    <textarea
                      rows={4}
                      value={summaryForm.careerGoal}
                      onChange={(e) =>
                        handleSummaryFieldChange("careerGoal", e.target.value)
                      }
                      placeholder="e.g. I am a passionate developer who loves building user-centric products and solving complex problems..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Summary Tone">
                    <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                      <div className="flex gap-2 px-1">
                        {SUMMARY_TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => handleSummaryFieldChange("tone", tone)}
                            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                              summaryForm.tone === tone
                                ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CompactField>
                </div>
              ) : isProjectsSection ? (
                <div className="space-y-3">
                  <CompactField label="Project Title" required>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) =>
                        handleProjectFieldChange("title", e.target.value)
                      }
                      placeholder="Career Copilot Resume Builder"
                      className={inputClassName()}
                    />
                  </CompactField>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Project Type">
                      <input
                        type="text"
                        value={projectForm.projectType}
                        onChange={(e) =>
                          handleProjectFieldChange("projectType", e.target.value)
                        }
                        placeholder="Academic / Personal / Internship"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Organization / Source">
                      <input
                        type="text"
                        value={projectForm.organization}
                        onChange={(e) =>
                          handleProjectFieldChange("organization", e.target.value)
                        }
                        placeholder="College / Company / Self"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <CompactField label="Technologies Used" required>
                    <textarea
                      rows={2}
                      value={projectForm.technologies}
                      onChange={(e) =>
                        handleProjectFieldChange("technologies", e.target.value)
                      }
                      placeholder="e.g. React, Node.js, Python, SQL..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Project Description" required>
                    <textarea
                      rows={6}
                      value={projectForm.description}
                      onChange={(e) =>
                        handleProjectFieldChange("description", e.target.value)
                      }
                      placeholder="Describe what the project is, your specific role, the problems you solved, and the final impact or result..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Tone">
                    <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                      <div className="flex gap-2 px-1">
                        {PROJECT_TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => handleProjectFieldChange("tone", tone)}
                            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                              projectForm.tone === tone
                                ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CompactField>
                </div>
              ) : isExperienceSection ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Role" required>
                      <input
                        type="text"
                        value={experienceForm.role}
                        onChange={(e) =>
                          handleExperienceFieldChange("role", e.target.value)
                        }
                        placeholder="Software Engineer Intern"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Company / Organization" required>
                      <input
                        type="text"
                        value={experienceForm.company}
                        onChange={(e) =>
                          handleExperienceFieldChange("company", e.target.value)
                        }
                        placeholder="ABC Technologies"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Employment Type">
                      <input
                        type="text"
                        value={experienceForm.employmentType}
                        onChange={(e) =>
                          handleExperienceFieldChange(
                            "employmentType",
                            e.target.value
                          )
                        }
                        placeholder="Internship / Full-time / Part-time"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="City / State">
                      <input
                        type="text"
                        value={experienceForm.cityState}
                        onChange={(e) =>
                          handleExperienceFieldChange("cityState", e.target.value)
                        }
                        placeholder="Hyderabad, India"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <CompactField label="Job Description / What did you do?" required>
                    <textarea
                      rows={6}
                      value={experienceForm.responsibilities}
                      onChange={(e) =>
                        handleExperienceFieldChange(
                          "responsibilities",
                          e.target.value
                        )
                      }
                      placeholder="Describe your daily tasks, specific projects you handled, and the key results or impact you achieved..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Tools / Technologies Used" required>
                    <textarea
                      rows={3}
                      value={experienceForm.toolsUsed}
                      onChange={(e) =>
                        handleExperienceFieldChange("toolsUsed", e.target.value)
                      }
                      placeholder="e.g. React, Python, SQL, Jira, Docker..."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <CompactField label="Tone">
                    <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                      <div className="flex gap-2 px-1">
                        {EXPERIENCE_TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => handleExperienceFieldChange("tone", tone)}
                            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                              experienceForm.tone === tone
                                ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CompactField>
                </div>
              ) : isCertificationsSection ? (
                <div className="space-y-3">
                  <CompactField label="Certification Name" required>
                    <input
                      type="text"
                      value={certificationForm.name}
                      onChange={(e) =>
                        handleCertificationFieldChange("name", e.target.value)
                      }
                      placeholder="AWS Cloud Practitioner"
                      className={inputClassName()}
                    />
                  </CompactField>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Issuing Body" required>
                      <input
                        type="text"
                        value={certificationForm.issuingBody}
                        onChange={(e) =>
                          handleCertificationFieldChange(
                            "issuingBody",
                            e.target.value
                          )
                        }
                        placeholder="Amazon Web Services"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Credential ID">
                      <input
                        type="text"
                        value={certificationForm.credentialId}
                        onChange={(e) =>
                          handleCertificationFieldChange(
                            "credentialId",
                            e.target.value
                          )
                        }
                        placeholder="Optional credential ID"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Skills Covered / Description" required>
                      <textarea
                        rows={4}
                        value={certificationForm.skillsCovered}
                        onChange={(e) =>
                          handleCertificationFieldChange(
                            "skillsCovered",
                            e.target.value
                          )
                        }
                        placeholder="Cloud fundamentals, IAM, EC2, S3, deployment basics..."
                        className={textareaClassName()}
                      />
                    </CompactField>

                    <CompactField label="Tone">
                      <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex gap-2 px-1">
                          {CERTIFICATION_TONE_OPTIONS.map((tone) => (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => handleCertificationFieldChange("tone", tone)}
                              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                                certificationForm.tone === tone
                                  ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CompactField>

                  </div>
                  
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 italic">
                    <span className="font-bold text-slate-600">Note:</span> Due to resume single page constraints, descriptions are removed for Certifications and Achievements to ensure professional brevity.
                  </p>
                </div>
              ) : isAchievementsSection ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Category" required>
                      <input
                        type="text"
                        value={achievementForm.category}
                        onChange={(e) =>
                          handleAchievementFieldChange(
                            "category",
                            e.target.value
                          )
                        }
                        placeholder="Hackathon / Award / Leadership / Activity"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Title" required>
                      <input
                        type="text"
                        value={achievementForm.title}
                        onChange={(e) =>
                          handleAchievementFieldChange("title", e.target.value)
                        }
                        placeholder="Smart India Hackathon"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Organized By / Rank" required>
                      <input
                        type="text"
                        value={achievementForm.organizedBy}
                        onChange={(e) =>
                          handleAchievementFieldChange(
                            "organizedBy",
                            e.target.value
                          )
                        }
                        placeholder="National Level / 1st Place / XYZ College"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Tone">
                      <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex gap-2 px-1">
                          {ACHIEVEMENT_TONE_OPTIONS.map((tone) => (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => handleAchievementFieldChange("tone", tone)}
                              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                                achievementForm.tone === tone
                                  ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CompactField>

                  </div>

                  <CompactField label="Description Input" required>
                    <textarea
                      rows={5}
                      value={achievementForm.description}
                      onChange={(e) =>
                        handleAchievementFieldChange(
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Mention what was built, contribution, recognition received, and why it matters."
                      className={textareaClassName()}
                    />
                  </CompactField>

                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 italic">
                    <span className="font-bold text-slate-600">Note:</span> Due to resume single page constraints, descriptions are removed for Certifications and Achievements to ensure professional brevity.
                  </p>
                </div>
              ) : isCustomSection ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CompactField label="Title" required>
                      <input
                        type="text"
                        value={customForm.title}
                        onChange={(e) =>
                          handleCustomFieldChange("title", e.target.value)
                        }
                        placeholder="e.g. Research Assistant"
                        className={inputClassName()}
                      />
                    </CompactField>

                    <CompactField label="Subtitle / Context">
                      <input
                        type="text"
                        value={customForm.subtitle}
                        onChange={(e) =>
                          handleCustomFieldChange("subtitle", e.target.value)
                        }
                        placeholder="e.g. Remote / ABC University"
                        className={inputClassName()}
                      />
                    </CompactField>
                  </div>

                  <CompactField label="Tone">
                    <div className="mask-horizontal relative -mx-1 flex overflow-x-auto pb-2 scrollbar-hide">
                      <div className="flex gap-2 px-1">
                        {CUSTOM_TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => handleCustomFieldChange("tone", tone)}
                            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                              customForm.tone === tone
                                ? "border-[var(--color-primary)] bg-violet-50 text-[var(--color-primary)]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CompactField>


                  <CompactField label="Description Input" required>
                    <textarea
                      rows={5}
                      value={customForm.description}
                      onChange={(e) =>
                        handleCustomFieldChange("description", e.target.value)
                      }
                      placeholder="What should the AI focus on for this entry?"
                      className={textareaClassName()}
                    />
                  </CompactField>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Section form will be added soon.
                </div>
              )}
            </div>

            <div className="p-5 lg:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Output
                </h3>

                {generatedContent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Check size={13} />
                    Ready
                  </span>
                ) : null}
              </div>

              <div className="min-h-[280px] rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-4">
                {errorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : generatedContent ? (
                  <div className="max-h-[320px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {generatedContent}
                  </div>
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-slate-400">
                    <Sparkles size={22} />
                    <p className="mt-3 text-sm">Generated content will appear here.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(53,0,139,0.18)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles size={15} />
                  {isGenerating ? "Generating..." : "Generate"}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!generatedContent}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clipboard size={15} />
                  {copied ? "Copied" : "Copy"}
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!generatedContent}
                  className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.22)] bg-[rgba(249,115,22,0.08)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={15} />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalUI, document.body);
}

function CompactField({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function inputClassName() {
  return "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]";
}

function textareaClassName() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]";
}

export default GeminiModal;