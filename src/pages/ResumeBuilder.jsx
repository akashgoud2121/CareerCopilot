import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

import {
  CUSTOM_SECTIONS_META_DIRTY_KEY,
  initializeResumeBuilder,
  loadResumeSectionByKey,
  loadResumeSectionsByKeys,
  saveResumeSectionsBatch,
} from "../services/resumeBuilderApi";
import ResumeSectionRenderer from "../components/resume/ResumeSectionRenderer";
import GeminiModal from "../components/resume/GeminiModal";
import ResumePreview from "../components/resume/ResumePreview";
import { RESUME_SECTIONS } from "../utils/resumeSchema";
import {
  getLatestProjectionJob,
  getProjectionJobById,
  requestResumeProjection,
  waitForProjectionCompletion,
} from "../services/resumeProjectionJobsApi";
import { fetchResumeReadModel } from "../services/resumeReadModelApi";
import { createResumeVersionSnapshot } from "../services/resumeVersionsApi";

function ResumeBuilder() {
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);
  const backgroundSaveQueueRef = useRef(Promise.resolve());

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddSectionInput, setShowAddSectionInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [customSections, setCustomSections] = useState([]);
  const [resumeData, setResumeData] = useState({});
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiModalSection, setGeminiModalSection] = useState(null);
  const [geminiModalContext, setGeminiModalContext] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [loadedSections, setLoadedSections] = useState(new Set());
  const [loadingSections, setLoadingSections] = useState(new Set());
  const [dirtySections, setDirtySections] = useState(new Set());

  const USE_ASYNC_PROJECTION =
    import.meta.env.VITE_USE_ASYNC_PROJECTION === "true";

  const [projectionStatus, setProjectionStatus] = useState("idle");
  const [projectionMessage, setProjectionMessage] = useState("");
  const [latestProjectedVersion, setLatestProjectedVersion] = useState(null);
  const [activeProjectionJobId, setActiveProjectionJobId] = useState(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const allSections = useMemo(() => {
    return [
      ...RESUME_SECTIONS,
      ...customSections.map((section) => ({
        ...section,
        type: "custom",
        aiEnabled: false,
      })),
      {
        key: "review",
        label: "Review & Generate",
        type: "system",
        aiEnabled: false,
      },
    ];
  }, [customSections]);

  const currentSection = allSections[currentStep];

  const progressPercent =
    allSections.length > 1
      ? Math.round(((currentStep + 1) / allSections.length) * 100)
      : 0;

  const nonReviewSectionKeys = useMemo(
    () =>
      allSections
        .filter((section) => section.key !== "review")
        .map((section) => section.key),
    [allSections]
  );

  const missingReviewSectionKeys = useMemo(
    () =>
      nonReviewSectionKeys.filter((sectionKey) => !loadedSections.has(sectionKey)),
    [nonReviewSectionKeys, loadedSections]
  );

  const isCurrentSectionLoading =
    !!currentSection?.key &&
    currentSection.key !== "review" &&
    loadingSections.has(currentSection.key) &&
    !loadedSections.has(currentSection.key);

  const isReviewLoading =
    currentSection?.key === "review" && missingReviewSectionKeys.length > 0;

  const shouldTrackProjection =
    USE_ASYNC_PROJECTION &&
    !!resumeId &&
    (
      projectionStatus === "saving" ||
      projectionStatus === "updating" ||
      !!activeProjectionJobId ||
      currentSection?.key === "review"
    );

  const getCurrentStatus = () => {
    try {
      const raw = localStorage.getItem("career_copilot_onboarding_data");
      if (!raw) return "Student";

      const parsed = JSON.parse(raw);
      return (
        (typeof parsed?.currentStatus === "string" &&
          parsed.currentStatus.trim()) ||
        "Student"
      );
    } catch {
      return "Student";
    }
  };

  const getProjectionBadgeClasses = () => {
    if (projectionStatus === "up_to_date") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }

    if (projectionStatus === "saving" || projectionStatus === "updating") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }

    if (projectionStatus === "error") {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }

    return "bg-slate-100 text-slate-600 border border-slate-200";
  };

  const getProjectionBadgeText = () => {
    if (projectionStatus === "saving") return "Saving...";
    if (projectionStatus === "updating") return "Syncing preview...";
    if (projectionStatus === "up_to_date") return "Up to date";
    if (projectionStatus === "error") return "Saved offline";
    return "Not synced yet";
  };

  const markSectionsDirty = useCallback((keys) => {
    const normalizedKeys = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    if (normalizedKeys.length === 0) return;

    setDirtySections((prev) => {
      const next = new Set(prev);
      normalizedKeys.forEach((key) => next.add(key));
      return next;
    });
  }, []);

  const clearSavedDirtyKeys = useCallback((savedKeys) => {
    if (!Array.isArray(savedKeys) || savedKeys.length === 0) return;

    setDirtySections((prev) => {
      const next = new Set(prev);

      savedKeys.forEach((key) => {
        if (key === CUSTOM_SECTIONS_META_DIRTY_KEY) {
          next.delete(CUSTOM_SECTIONS_META_DIRTY_KEY);
          Array.from(next)
            .filter(
              (dirtyKey) =>
                typeof dirtyKey === "string" && dirtyKey.startsWith("custom_")
            )
            .forEach((dirtyKey) => next.delete(dirtyKey));
          return;
        }

        next.delete(key);
      });

      return next;
    });
  }, []);

  const normalizeDirtyKeysForSave = useCallback((keys) => {
    const uniqueKeys = Array.from(
      new Set((Array.isArray(keys) ? keys : []).filter(Boolean))
    );

    const filteredKeys = uniqueKeys.filter((key) => key !== "review");

    const hasCustomWork = filteredKeys.some(
      (key) =>
        key === CUSTOM_SECTIONS_META_DIRTY_KEY || key.startsWith("custom_")
    );

    const normalizedKeys = filteredKeys.filter(
      (key) =>
        key !== CUSTOM_SECTIONS_META_DIRTY_KEY && !key.startsWith("custom_")
    );

    if (hasCustomWork) {
      normalizedKeys.push(CUSTOM_SECTIONS_META_DIRTY_KEY);
    }

    return normalizedKeys;
  }, []);

  const refreshProjectionState = useCallback(
    async (explicitJobId = null) => {
      if (!resumeId) return null;

      try {
        const trackedJobId = explicitJobId ?? activeProjectionJobId;

        const [trackedJob, readModelRow] = await Promise.all([
          trackedJobId
            ? getProjectionJobById({ jobId: trackedJobId }).catch(() => null)
            : Promise.resolve(null),
          fetchResumeReadModel(resumeId),
        ]);

        if (
          readModelRow?.version !== undefined &&
          readModelRow?.version !== null
        ) {
          setLatestProjectedVersion(readModelRow.version);
        }

        let latestJob = trackedJob;

        if (!latestJob) {
          latestJob = await getLatestProjectionJob({ resumeId });
        }

        if (!latestJob) {
          if (readModelRow?.version !== undefined && readModelRow?.version !== null) {
            setProjectionStatus("up_to_date");
            setProjectionMessage("Preview is up to date.");
          } else {
            setProjectionStatus("idle");
            setProjectionMessage("");
          }
          return null;
        }

        if (latestJob.status === "completed") {
          setProjectionStatus("up_to_date");
          setProjectionMessage("Preview is up to date.");
          if (trackedJobId && latestJob.id === trackedJobId) {
            setActiveProjectionJobId(null);
          }
        } else if (latestJob.status === "failed") {
          setProjectionStatus("error");
          setProjectionMessage(
            latestJob.error_message || "Preview update failed."
          );
          if (trackedJobId && latestJob.id === trackedJobId) {
            setActiveProjectionJobId(null);
          }
        } else {
          setProjectionStatus("updating");
          setProjectionMessage("Updating preview...");
        }

        return latestJob;
      } catch (error) {
        console.error("Failed to refresh projection state:", error);
        setProjectionStatus("error");
        setProjectionMessage("Could not refresh preview status.");
        return null;
      }
    },
    [activeProjectionJobId, resumeId]
  );

  const saveDirtySections = useCallback(
    async (requestedKeys = Array.from(dirtySections), options = {}) => {
      const { background = false } = options;

      if (!resumeId || !userId) {
        return { ok: false, projectionJobId: null };
      }

      const currentDirtyKeys = Array.from(dirtySections);

      if (currentDirtyKeys.length === 0) {
        return { ok: true, projectionJobId: activeProjectionJobId };
      }

      const requested =
        Array.isArray(requestedKeys) && requestedKeys.length > 0
          ? requestedKeys
          : currentDirtyKeys;

      const shouldAlsoSaveCustomMeta = dirtySections.has(
        CUSTOM_SECTIONS_META_DIRTY_KEY
      );

      let keysToSave = requested.filter(
        (key) =>
          currentDirtyKeys.includes(key) ||
          key === CUSTOM_SECTIONS_META_DIRTY_KEY
      );

      if (shouldAlsoSaveCustomMeta) {
        keysToSave.push(CUSTOM_SECTIONS_META_DIRTY_KEY);
      }

      keysToSave = normalizeDirtyKeysForSave(keysToSave);

      if (keysToSave.length === 0) {
        return { ok: true, projectionJobId: activeProjectionJobId };
      }

      try {
        if (!background) {
          setIsSaving(true);
        }

        if (USE_ASYNC_PROJECTION) {
          setProjectionStatus("saving");
          setProjectionMessage(
            background ? "Saving in background..." : "Saving changes..."
          );

          await saveResumeSectionsBatch({
            sectionKeys: keysToSave,
            resumeId,
            userId,
            resumeData,
            customSections,
            regenerateReadModel: false,
          });

          clearSavedDirtyKeys(keysToSave);

          setProjectionStatus("updating");
          setProjectionMessage(
            background
              ? "Saved. Preview updating in background..."
              : "Changes saved. Preview updating..."
          );

          let projectionJobId = null;

          try {
            const projectionResult = await requestResumeProjection({
              resumeId,
              userId,
            });

            projectionJobId = projectionResult?.job?.id ?? null;

            if (projectionJobId) {
              setActiveProjectionJobId(projectionJobId);
            }

            if (!projectionResult?.workerTriggered) {
              setProjectionMessage("Changes saved. Preview update queued...");
            }
          } catch (projectionError) {
            console.error("Projection request failed:", projectionError);
            setProjectionStatus("error");
            setProjectionMessage(
              "Changes saved, but preview update failed."
            );
          }

          return { ok: true, projectionJobId };
        }

        await saveResumeSectionsBatch({
          sectionKeys: keysToSave,
          resumeId,
          userId,
          resumeData,
          customSections,
          regenerateReadModel: true,
        });

        clearSavedDirtyKeys(keysToSave);
        setActiveProjectionJobId(null);

        const latestReadModel = await fetchResumeReadModel(resumeId);
        if (
          latestReadModel?.version !== undefined &&
          latestReadModel?.version !== null
        ) {
          setLatestProjectedVersion(latestReadModel.version);
        }

        setProjectionStatus("up_to_date");
        setProjectionMessage("Preview is up to date.");

        return { ok: true, projectionJobId: null };
      } catch (error) {
        console.error("Dirty section save failed:", error);
        setProjectionStatus("error");
        setProjectionMessage("Failed to save your changes.");
        return { ok: false, projectionJobId: null };
      } finally {
        if (!background) {
          setIsSaving(false);
        }
      }
    },
    [
      activeProjectionJobId,
      clearSavedDirtyKeys,
      customSections,
      dirtySections,
      normalizeDirtyKeysForSave,
      resumeData,
      resumeId,
      userId,
      USE_ASYNC_PROJECTION,
    ]
  );

  const saveCurrentSectionDraft = useCallback(async () => {
    if (!currentSection?.key) {
      return { ok: true, projectionJobId: activeProjectionJobId };
    }

    if (currentSection.key === "review") {
      return saveDirtySections(Array.from(dirtySections));
    }

    return saveDirtySections([currentSection.key]);
  }, [
    activeProjectionJobId,
    currentSection?.key,
    dirtySections,
    saveDirtySections,
  ]);

  const saveAllSectionsDraft = useCallback(async () => {
    return saveDirtySections(Array.from(dirtySections));
  }, [dirtySections, saveDirtySections]);

  const saveSectionsInBackground = useCallback(
    (sectionKeys) => {
      backgroundSaveQueueRef.current = backgroundSaveQueueRef.current
        .catch(() => true)
        .then(() =>
          saveDirtySections(sectionKeys, {
            background: true,
          })
        );

      return backgroundSaveQueueRef.current;
    },
    [saveDirtySections]
  );

  const ensureSectionLoaded = useCallback(
    async (sectionKey) => {
      if (!resumeId || !sectionKey || sectionKey === "review") return;
      if (loadedSections.has(sectionKey) || loadingSections.has(sectionKey)) {
        return;
      }

      try {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.add(sectionKey);
          return next;
        });

        const sectionData = await loadResumeSectionByKey({
          sectionKey,
          resumeId,
        });

        if (sectionData && typeof sectionData === "object") {
          setResumeData((prev) => ({
            ...prev,
            ...sectionData,
          }));
        }

        setLoadedSections((prev) => {
          const next = new Set(prev);
          next.add(sectionKey);
          return next;
        });
      } catch (error) {
        console.error(`Failed to lazy load section: ${sectionKey}`, error);
      } finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionKey);
          return next;
        });
      }
    },
    [loadedSections, loadingSections, resumeId]
  );

  const ensureSectionsLoaded = useCallback(
    async (sectionKeys = []) => {
      if (!resumeId) return;

      const uniqueKeys = Array.from(
        new Set(
          sectionKeys.filter(
            (sectionKey) =>
              sectionKey &&
              sectionKey !== "review" &&
              !loadedSections.has(sectionKey) &&
              !loadingSections.has(sectionKey)
          )
        )
      );

      if (uniqueKeys.length === 0) return;

      try {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          uniqueKeys.forEach((key) => next.add(key));
          return next;
        });

        const loadedData = await loadResumeSectionsByKeys({
          sectionKeys: uniqueKeys,
          resumeId,
        });

        if (loadedData && typeof loadedData === "object") {
          setResumeData((prev) => ({
            ...prev,
            ...loadedData,
          }));
        }

        setLoadedSections((prev) => {
          const next = new Set(prev);
          uniqueKeys.forEach((key) => next.add(key));
          return next;
        });
      } catch (error) {
        console.error("Failed to lazy load multiple sections:", error);
      } finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          uniqueKeys.forEach((key) => next.delete(key));
          return next;
        });
      }
    },
    [loadedSections, loadingSections, resumeId]
  );

  const sectionAwareSetResumeData = useCallback(
    (updater) => {
      const activeSectionKey = currentSection?.key;

      setResumeData((prev) =>
        typeof updater === "function" ? updater(prev) : updater
      );

      if (activeSectionKey && activeSectionKey !== "review") {
        markSectionsDirty(activeSectionKey);
      }
    },
    [currentSection?.key, markSectionsDirty]
  );

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initPage = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const geminiKey = localStorage.getItem("career_copilot_gemini_key");
        const onboardingDone = localStorage.getItem(
          "career_copilot_onboarding_done"
        );

        if (!geminiKey) {
          navigate("/connect-gemini");
          return;
        }

        if (onboardingDone !== "true") {
          navigate("/onboarding");
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const urlResumeId = params.get("id");
        const urlAction = params.get("action");

        const {
          resumeId: primaryResumeId,
          userId: loadedUserId,
          customSections: loadedCustomSections,
          resumeData: loadedResumeData,
          loadedSectionKeys,
        } = await initializeResumeBuilder(user, {
          lazy: true,
          resumeId: urlResumeId,
        });

        // Also fetch the template_name from the resumes table
        const { data: resumeRow } = await supabase
          .from("resumes")
          .select("template_name")
          .eq("id", primaryResumeId)
          .single();

        setResumeId(primaryResumeId);
        setUserId(loadedUserId);
        setCustomSections(loadedCustomSections);
        setResumeData({
          ...loadedResumeData,
          template_name: resumeRow?.template_name || "classic",
        });
        setLoadedSections(new Set(loadedSectionKeys));
        setDirtySections(new Set());

        if (urlAction === "download" || urlAction === "magic") {
          const totalLength = RESUME_SECTIONS.length + loadedCustomSections.length + 1;
          setCurrentStep(totalLength - 1);
        }
      } catch (error) {
        console.error("ResumeBuilder init error:", error);
      } finally {
        setCheckingAccess(false);
      }
    };

    initPage();
  }, [navigate]);

  useEffect(() => {
    if (!resumeId || !currentSection?.key) return;

    if (currentSection.key === "review") {
      if (missingReviewSectionKeys.length > 0) {
        ensureSectionsLoaded(missingReviewSectionKeys);
      }
      return;
    }

    ensureSectionLoaded(currentSection.key);
  }, [
    currentSection?.key,
    ensureSectionLoaded,
    ensureSectionsLoaded,
    missingReviewSectionKeys,
    resumeId,
  ]);

  useEffect(() => {
    if (!resumeId || currentSection?.key !== "review") return;
    refreshProjectionState();
  }, [currentSection?.key, refreshProjectionState, resumeId]);

  useEffect(() => {
    if (!shouldTrackProjection) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await refreshProjectionState(activeProjectionJobId);
    };

    poll();
    const intervalId = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeProjectionJobId, refreshProjectionState, shouldTrackProjection]);

  const handleAddCustomSection = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;

    const key = `custom_${trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;

    const newSection = {
      key,
      label: trimmed,
    };

    setCustomSections((prev) => [...prev, newSection]);

    setResumeData((prev) => ({
      ...prev,
      [key]: [],
    }));

    setLoadedSections((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    markSectionsDirty([CUSTOM_SECTIONS_META_DIRTY_KEY, key]);

    setNewSectionName("");
    setShowAddSectionInput(false);

    // Auto-navigate to the newly created section which will be at RESUME_SECTIONS.length + current customSections.length
    queueCurrentSectionBackgroundSave();
    setShowValidationErrors(false);
    
    // We use setTimeout to allow state (like customSections) to update before changing the step, 
    // ensuring the renderer matches the new allSections array correctly.
    setTimeout(() => {
      setCurrentStep(RESUME_SECTIONS.length + customSections.length);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handleRemoveCustomSection = (sectionKey) => {
    const updatedSections = customSections.filter(
      (section) => section.key !== sectionKey
    );

    setCustomSections(updatedSections);

    setResumeData((prev) => {
      const updated = { ...prev };
      delete updated[sectionKey];
      return updated;
    });

    setLoadedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionKey);
      return next;
    });

    setDirtySections((prev) => {
      const next = new Set(prev);
      next.delete(sectionKey);
      next.add(CUSTOM_SECTIONS_META_DIRTY_KEY);
      return next;
    });

    const updatedAllSections = [
      ...RESUME_SECTIONS,
      ...updatedSections.map((section) => ({
        ...section,
        type: "custom",
        aiEnabled: false,
      })),
      {
        key: "review",
        label: "Review & Generate",
        type: "system",
        aiEnabled: false,
      },
    ];

    const updatedIndex = Math.min(currentStep, updatedAllSections.length - 1);
    setCurrentStep(Math.max(updatedIndex, 0));
  };

  const handleOpenAIModal = (sectionKey, context = null) => {
    setGeminiModalSection(sectionKey);
    setGeminiModalContext(context);
    setIsGeminiModalOpen(true);
  };

  const handleApplyAIContent = (payload) => {
    const content =
      typeof payload === "string" ? payload.trim() : payload?.content?.trim();

    if (!content) return;

    const sectionKey =
      typeof payload === "string"
        ? geminiModalSection
        : payload?.sectionKey || geminiModalSection;

    const targetField =
      typeof payload === "string"
        ? sectionKey === "summary"
          ? "text"
          : "description"
        : payload?.field || (sectionKey === "summary" ? "text" : "description");

    const targetClientKey =
      typeof payload === "string" ? null : payload?.clientKey || null;

    const targetIndex =
      typeof payload === "string"
        ? null
        : typeof payload?.index === "number"
          ? payload.index
          : null;

    setResumeData((prev) => {
      if (sectionKey === "summary") {
        return {
          ...prev,
          summary: {
            ...prev.summary,
            text: content,
          },
        };
      }

      if (
        ["experience", "projects", "certifications", "achievements"].includes(
          sectionKey
        )
      ) {
        const currentSectionData = Array.isArray(prev[sectionKey])
          ? [...prev[sectionKey]]
          : [];

        if (currentSectionData.length === 0) {
          return prev;
        }

        let resolvedIndex = -1;

        if (targetClientKey) {
          resolvedIndex = currentSectionData.findIndex(
            (item) => item?.clientKey === targetClientKey
          );
        }

        if (resolvedIndex < 0 && targetIndex !== null) {
          resolvedIndex = targetIndex;
        }

        if (resolvedIndex < 0) {
          resolvedIndex = currentSectionData.length - 1;
        }

        const existingValue =
          typeof currentSectionData[resolvedIndex]?.[targetField] === "string"
            ? currentSectionData[resolvedIndex][targetField]
            : "";

        currentSectionData[resolvedIndex] = {
          ...currentSectionData[resolvedIndex],
          [targetField]: existingValue
            ? `${existingValue}\n\n${content}`
            : content,
        };

        return {
          ...prev,
          [sectionKey]: currentSectionData,
        };
      }

      return prev;
    });

    if (sectionKey) {
      markSectionsDirty(sectionKey);
    }

    setIsGeminiModalOpen(false);
    setGeminiModalSection(null);
    setGeminiModalContext(null);
  };

  const handleTemplateChange = async (templateId) => {
    if (!resumeId) return;

    // Update local state first for immediate UI response
    setResumeData((prev) => ({
      ...prev,
      template_name: templateId,
    }));

    try {
      const { error } = await supabase
        .from("resumes")
        .update({ template_name: templateId })
        .eq("id", resumeId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  };

  const handleSaveDraft = async () => {
    const saveResult = await saveAllSectionsDraft();

    if (!saveResult.ok || !resumeId || !userId) return;

    try {
      setIsSaving(true);
      setProjectionMessage("Preparing version snapshot...");

      const jobIdToWaitFor =
        saveResult.projectionJobId || activeProjectionJobId || null;

      if (USE_ASYNC_PROJECTION && jobIdToWaitFor) {
        setProjectionStatus("updating");
        setProjectionMessage("Waiting for preview update...");
        await waitForProjectionCompletion({
          jobId: jobIdToWaitFor,
          timeoutMs: 12000,
          pollMs: 800,
        });
        setActiveProjectionJobId(null);
      } else if (USE_ASYNC_PROJECTION) {
        await refreshProjectionState();
      }

      const readModelRow = await fetchResumeReadModel(resumeId);

      if (!readModelRow?.document_json) {
        throw new Error("No read model available for snapshot");
      }

      await createResumeVersionSnapshot({
        resumeId,
        userId,
        version: readModelRow.version,
        snapshotJson: readModelRow.document_json,
        source: "manual_save",
      });

      setLatestProjectedVersion(readModelRow.version ?? null);
      setProjectionStatus("up_to_date");
      setProjectionMessage("Draft saved and version snapshot created.");
    } catch (error) {
      console.error("Save Draft snapshot failed:", error);
      setProjectionStatus("error");
      setProjectionMessage("Draft saved, but version snapshot failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const validateSectionDataByKey = (key) => {
    if (!key) return true;

    if (key === "contact") {
      const contact = resumeData.contact || {};
      return !!(
        contact.fullName?.trim() &&
        contact.email?.trim() &&
        contact.phone?.trim() &&
        contact.location?.trim()
      );
    }

    if (key === "education") {
      const education = Array.isArray(resumeData.education) ? resumeData.education : [];
      const validRows = education.filter(
        (item) =>
          item.category?.trim() &&
          item.institution?.trim() &&
          item.degreeMajor?.trim() &&
          item.startMonth &&
          item.startYear &&
          item.endMonth &&
          item.endYear &&
          item.cityState?.trim()
      );
      return validRows.length > 0;
    }

    if (key === "experience") {
      const experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
      const validRows = experience.filter(
        (item) =>
          item.role?.trim() &&
          item.company?.trim() &&
          item.employmentType?.trim() &&
          item.location?.trim() &&
          item.startMonth &&
          item.startYear &&
          (item.currentlyWorking || (item.endMonth && item.endYear)) &&
          item.description?.trim() &&
          item.description.trim().length >= 40
      );
      return validRows.length > 0;
    }

    if (key === "projects") {
      const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
      const validRows = projects.filter(
        (item) =>
          item.title?.trim() &&
          item.projectType?.trim() &&
          item.organization?.trim() &&
          item.startMonth &&
          item.startYear &&
          (item.currentlyWorking || (item.endMonth && item.endYear)) &&
          item.description?.trim() &&
          item.description.trim().length >= 30
      );
      return validRows.length > 0;
    }

    if (key === "skills") {
      const skills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
      const validRows = skills.filter(
        (item) =>
          item.category?.trim() !== "" &&
          item.skills &&
          item.skills.length > 0
      );
      return validRows.length > 0;
    }

    if (key === "summary") {
      const summary = resumeData.summary || {};
      const text = summary.text?.trim() || "";
      return !!text && text.length >= 40;
    }

    if (key === "achievements") {
      const achievements = Array.isArray(resumeData.achievements) ? resumeData.achievements : [];
      const validRows = achievements.filter(
        (item) =>
          item.category?.trim() &&
          item.title?.trim() &&
          item.organizerOrRank?.trim() &&
          item.month &&
          item.year &&
          item.description?.trim() &&
          item.description.trim().length >= 20
      );
      return validRows.length > 0;
    }

    if (key === "certifications") {
      const certifications = Array.isArray(resumeData.certifications) ? resumeData.certifications : [];
      const validRows = certifications.filter(
        (item) =>
          item.name?.trim() &&
          item.issuingBody?.trim() &&
          item.issuedMonth &&
          item.issuedYear &&
          item.description?.trim()
      );
      return validRows.length > 0;
    }

    if (key.startsWith("custom_")) {
      const customData = Array.isArray(resumeData[key]) ? resumeData[key] : [];
      const validRows = customData.filter(
        (item) =>
          item.title?.trim() &&
          item.description?.trim() &&
          item.description.trim().length >= 10
      );
      return validRows.length > 0;
    }

    return true;
  };



  const queueCurrentSectionBackgroundSave = useCallback(() => {
    if (!currentSection?.key) return;

    if (currentSection.key === "review") {
      if (dirtySections.size > 0) {
        saveSectionsInBackground(Array.from(dirtySections));
      }
      return;
    }

    if (dirtySections.has(currentSection.key)) {
      saveSectionsInBackground([currentSection.key]);
    }
  }, [currentSection?.key, dirtySections, saveSectionsInBackground]);

  const handleGoToSection = (index) => {
    if (index === currentStep) return;

    const isTargetReview = allSections[index]?.key === "review";

    if (isTargetReview) {
      // Final sweep: ensure all sections are valid before going to Review
      for (let i = 0; i < index; i++) {
        const sectionToValidate = allSections[i]?.key;
        if (!validateSectionDataByKey(sectionToValidate)) {
          setShowValidationErrors(true);
          
          if (i !== currentStep) {
            queueCurrentSectionBackgroundSave();
            setCurrentStep(i);
            window.scrollTo({ top: 0, behavior: "auto" });
          }
          return;
        }
      }
    } else if (index > currentStep) {
      // Jumping forward to a regular section: only block if current view is invalid
      if (!validateSectionDataByKey(currentSection?.key)) {
        setShowValidationErrors(true);
        return;
      }
    }

    setShowValidationErrors(false);
    queueCurrentSectionBackgroundSave();
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToPrevious = () => {
    queueCurrentSectionBackgroundSave();
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToNext = () => {
    const nextStep = Math.min(currentStep + 1, allSections.length - 1);
    const isTargetReview = allSections[nextStep]?.key === "review";

    if (isTargetReview) {
      // Final sweep: ensure all sections are valid before going to Review
      for (let i = 0; i < nextStep; i++) {
        const sectionToValidate = allSections[i]?.key;
        if (!validateSectionDataByKey(sectionToValidate)) {
          setShowValidationErrors(true);
          
          if (i !== currentStep) {
            queueCurrentSectionBackgroundSave();
            setCurrentStep(i);
            window.scrollTo({ top: 0, behavior: "auto" });
          }
          return;
        }
      }
    } else {
      // Normal next step: only block if current view is invalid
      if (!validateSectionDataByKey(currentSection?.key)) {
        setShowValidationErrors(true);
        return;
      }
    }

    setShowValidationErrors(false);
    queueCurrentSectionBackgroundSave();
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const renderActionButtons = ({ compact = false } = {}) => {
    const buttonBase =
      "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
    const containerClass = compact
      ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"
      : "flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end";

    return (
      <div className={containerClass}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
        >
          Back to Dashboard
        </button>

        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className={`${buttonBase} border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5`}
        >
          {isSaving
            ? "Saving..."
            : dirtySections.size > 0
              ? "Save Draft"
              : "All Saved"}
        </button>

        <button
          type="button"
          onClick={goToPrevious}
          disabled={currentStep === 0 || isSaving}
          className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
        >
          ← Previous
        </button>

        {currentStep < allSections.length - 1 && (
          <button
            type="button"
            onClick={goToNext}
            disabled={isSaving}
            className={`${buttonBase} bg-[var(--color-primary)] text-white hover:bg-[var(--color-secondary)]`}
          >
            {isSaving ? "Saving..." : "Next →"}
          </button>
        )}
      </div>
    );
  };

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-muted)]">
          Loading resume builder...
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--color-bg-alt)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 sm:py-5 md:px-6 lg:px-8 xl:px-10">
        <div className="mb-5 xl:hidden">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Current Section
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--color-primary)]">
                  {currentSection?.label}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {currentStep + 1} / {allSections.length}
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {allSections.map((section, index) => {
                const isActive = index === currentStep;
                const isCustom = section.type === "custom";

                return (
                  <div
                    key={section.key}
                    className={`shrink-0 rounded-2xl border transition ${
                      isActive
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleGoToSection(index)}
                      disabled={isSaving}
                      className="flex min-w-[180px] items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {section.label}
                        </span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          {isCustom ? "Custom section" : "Resume section"}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              {!showAddSectionInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddSectionInput(true)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  + Add Section
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Enter section name"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="flex-1 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-secondary)]"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSectionInput(false);
                        setNewSectionName("");
                      }}
                      className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-[110px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Sections
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {allSections.length}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs text-[var(--color-muted)]">
                  Section{" "}
                  <span className="font-semibold text-[var(--color-text)]">
                    {currentStep + 1}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[var(--color-text)]">
                    {allSections.length}
                  </span>
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">
                  {currentSection?.label}
                </p>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {allSections.map((section, index) => {
                  const isActive = currentStep === index;
                  const isCustom = section.type === "custom";

                  return (
                    <div
                      key={section.key}
                      className={`group relative flex items-center justify-between rounded-2xl border transition-all duration-200 ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleGoToSection(index)}
                        disabled={isSaving}
                        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isActive
                              ? "bg-[var(--color-primary)] text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {section.label}
                          </span>
                          <span className="block text-xs text-[var(--color-muted)]">
                            {isCustom ? "Custom section" : "Resume section"}
                          </span>
                        </span>
                      </button>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSection(section.key)}
                          className="mr-3 text-xs font-semibold text-red-500 transition hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                {!showAddSectionInput ? (
                  <button
                    type="button"
                    onClick={() => setShowAddSectionInput(true)}
                    className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    + Add Section
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Enter section name"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddCustomSection}
                        className="flex-1 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-secondary)]"
                      >
                        Add
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSectionInput(false);
                          setNewSectionName("");
                        }}
                        className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--color-primary)]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        Resume Builder
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Step {currentStep + 1} of {allSections.length}
                      </span>

                      {dirtySections.size > 0 && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Unsaved changes: {dirtySections.size}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-[var(--color-text)] sm:text-xl">
                      {currentSection?.label}
                    </h2>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--color-muted)]">
                        {progressPercent}% complete
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3 xl:items-end">
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getProjectionBadgeClasses()}`}
                      >
                        {getProjectionBadgeText()}
                      </span>

                      {latestProjectedVersion !== null ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-[var(--color-muted)]">
                          Version {latestProjectedVersion}
                        </span>
                      ) : null}
                    </div>

                    {projectionMessage ? (
                      <p className="max-w-xl text-sm text-[var(--color-muted)] xl:text-right">
                        {projectionMessage}
                      </p>
                    ) : null}

                    {renderActionButtons()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6 lg:p-7">
              {currentSection?.key === "review" ? (
                isReviewLoading ? (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <p className="text-sm font-medium text-[var(--color-muted)]">
                      Loading all resume sections for review...
                    </p>
                  </div>
                ) : (
                  <ResumePreview
                    resumeData={{
                      ...resumeData,
                      customSections: customSections.map((cs) => ({
                        key: cs.key,
                        label: cs.label,
                        content: resumeData[cs.key] || [],
                      })),
                    }}
                    resumeId={resumeId}
                    projectionStatus={projectionStatus}
                    projectionMessage={projectionMessage}
                    latestProjectedVersion={latestProjectedVersion}
                    onTemplateChange={handleTemplateChange}
                  />
                )
              ) : isCurrentSectionLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <p className="text-sm font-medium text-[var(--color-muted)]">
                    Loading {currentSection?.label?.toLowerCase()}...
                  </p>
                </div>
              ) : (
                <div key={currentSection.key} className="min-w-0">
                  <ResumeSectionRenderer
                    currentSection={currentSection}
                    resumeData={resumeData}
                    setResumeData={sectionAwareSetResumeData}
                    onOpenAIModal={handleOpenAIModal}
                    showValidationErrors={showValidationErrors}
                  />
                </div>
              )}
            </div>

            {currentSection?.key !== "review" && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm sm:px-5 sm:py-6">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Tips for success
                </p>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-6">
                  <div className="flex items-center justify-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
                    <span className="text-[13px] font-medium text-[var(--color-muted)]">
                      Keep it simple and direct.
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-accent-1)]" />
                    <span className="text-[13px] font-medium text-[var(--color-muted)]">
                      Add only details that improve it.
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-accent-2)]" />
                    <span className="text-[13px] font-medium text-[var(--color-muted)]">
                      Focus on clarity first.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Keep your progress safe
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Save your latest edits before moving on or generating the final version.
                  </p>
                </div>

                {renderActionButtons({ compact: true })}
              </div>
            </div>
          </main>
        </div>
      </div>

      <GeminiModal
        isOpen={isGeminiModalOpen}
        onClose={() => {
          setIsGeminiModalOpen(false);
          setGeminiModalSection(null);
          setGeminiModalContext(null);
        }}
        onApply={handleApplyAIContent}
        sectionKey={geminiModalSection}
        aiContext={geminiModalContext}
        userData={{
          contact: resumeData.contact || {},
          summary: resumeData.summary || {},
          education: Array.isArray(resumeData.education)
            ? resumeData.education
            : [],
          skills: Array.isArray(resumeData.skills) ? resumeData.skills : [],
          experience: Array.isArray(resumeData.experience)
            ? resumeData.experience
            : [],
          projects: Array.isArray(resumeData.projects) ? resumeData.projects : [],
          certifications: Array.isArray(resumeData.certifications)
            ? resumeData.certifications
            : [],
          achievements: Array.isArray(resumeData.achievements)
            ? resumeData.achievements
            : [],
          currentStatus: getCurrentStatus(),
        }}
      />
    </section>
  );
}

export default ResumeBuilder;