import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { IoDownload, IoDocumentText } from "react-icons/io5";
import { generateWordDocument } from "../../utils/resumeExport";

import ClassicTemplate from "./templates/ClassicTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import MinimalTemplate from "./templates/MinimalTemplate";
import {
  fetchResumeReadModel,
  readModelToResumeData,
} from "../../services/resumeReadModelApi";

const PAPER_WIDTH = 794;
const PAPER_HEIGHT = 1122;

const FIT_PRESETS = [
  {
    bodyFont: 11.2,
    smallFont: 10.1,
    headingFont: 11.2,
    lineHeight: 1.3,
    sectionGap: 8,
    itemGap: 6,
    pagePaddingX: 26,
    pagePaddingY: 20,
    bulletGap: 1,
    skillCategoryWidth: 100,
  },
  {
    bodyFont: 10.9,
    smallFont: 9.9,
    headingFont: 10.9,
    lineHeight: 1.27,
    sectionGap: 7,
    itemGap: 5,
    pagePaddingX: 24,
    pagePaddingY: 18,
    bulletGap: 1,
    skillCategoryWidth: 96,
  },
  {
    bodyFont: 10.6,
    smallFont: 9.6,
    headingFont: 10.6,
    lineHeight: 1.23,
    sectionGap: 6,
    itemGap: 4,
    pagePaddingX: 22,
    pagePaddingY: 16,
    bulletGap: 1,
    skillCategoryWidth: 92,
  },
  {
    bodyFont: 10.3,
    smallFont: 9.3,
    headingFont: 10.3,
    lineHeight: 1.19,
    sectionGap: 5,
    itemGap: 4,
    pagePaddingX: 20,
    pagePaddingY: 14,
    bulletGap: 0,
    skillCategoryWidth: 88,
  },
];

const TEMPLATES = [
  {
    id: "classic",
    name: "Classic ATS",
    desc: "Traditional recruiter-friendly layout for internships and jobs.",
  },
  {
    id: "modern",
    name: "Modern Split",
    desc: "Clean visual layout for creative and tech profiles.",
  },
  {
    id: "minimal",
    name: "Minimalist",
    desc: "Light and simple layout with less visual density.",
  },
];

const waitForFrames = async (count = 2) => {
  for (let i = 0; i < count; i += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

const getPreviewStatusMeta = (status) => {
  if (status === "up_to_date") {
    return {
      title: "Preview is current",
      textClass: "text-emerald-700",
      pillClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }

  if (status === "saving" || status === "updating") {
    return {
      title: status === "saving" ? "Saving changes..." : "Refreshing preview...",
      textClass: "text-amber-700",
      pillClass: "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }

  if (status === "error") {
    return {
      title: "Preview may be stale",
      textClass: "text-rose-700",
      pillClass: "bg-rose-50 text-rose-700 border border-rose-200",
    };
  }

  return {
    title: "Live editing mode",
    textClass: "text-slate-600",
    pillClass: "bg-slate-100 text-slate-600 border border-slate-200",
  };
};

export default function ResumePreview({
  resumeData,
  resumeId,
  isSyncing = false,
  projectionStatus = "idle",
  projectionMessage = "",
  latestProjectedVersion = null,
  onTemplateChange,
}) {
  const safeResumeData = useMemo(() => resumeData || {}, [resumeData]);
  const latestLiveDataRef = useRef(safeResumeData);

  const [template, setTemplate] = useState("classic");

  useEffect(() => {
    if (safeResumeData.template_name) {
      setTemplate(safeResumeData.template_name);
    }
  }, [safeResumeData.template_name]);

  const [fitIndex, setFitIndex] = useState(0);
  const [viewScale, setViewScale] = useState(1);
  const [needsMultiPage, setNeedsMultiPage] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isPreparingWord, setIsPreparingWord] = useState(false);
  const [previewData, setPreviewData] = useState(safeResumeData);

  const pageRef = useRef(null);
  const wrapperRef = useRef(null);

  const statusMeta = getPreviewStatusMeta(projectionStatus);
  const fitConfig = FIT_PRESETS[fitIndex];

  const isDataComplete = useMemo(() => {
    if (!safeResumeData.contact?.fullName) return false;
    // Basic heuristic: check if common sections are arrays if they exist in schema
    const coreKeys = ["education", "experience", "skills", "projects"];
    for (const key of coreKeys) {
      if (safeResumeData[key] !== undefined && !Array.isArray(safeResumeData[key])) {
        return false;
      }
    }
    return true;
  }, [safeResumeData]);

  const exportInProgress = isPreparingPdf || isPreparingWord || isPrinting || isSyncing;

  const scaledPreviewWidth = Math.round(PAPER_WIDTH * viewScale);
  const scaledPreviewHeight = Math.round(PAPER_HEIGHT * viewScale);

  useEffect(() => {
    latestLiveDataRef.current = safeResumeData;

    if (!exportInProgress) {
      setPreviewData(safeResumeData);
    }
  }, [safeResumeData, exportInProgress]);

  const getReadModelBackedResumeData = useCallback(async () => {
    if (!resumeId) return safeResumeData;

    try {
      const readModelRow = await fetchResumeReadModel(resumeId);

      if (readModelRow?.document_json) {
        return readModelToResumeData(readModelRow.document_json);
      }
    } catch (error) {
      console.error("Read model export fallback failed:", error);
    }

    return safeResumeData;
  }, [resumeId, safeResumeData]);

  const renderTemplate = useCallback(() => {
    const props = {
      resumeData: previewData,
      fitConfig,
      paperHeight: PAPER_HEIGHT,
      paperWidth: PAPER_WIDTH,
    };

    switch (template) {
      case "classic":
        return <ClassicTemplate {...props} />;
      case "modern":
        return <ModernTemplate {...props} />;
      case "minimal":
        return <MinimalTemplate {...props} />;
      default:
        return <ClassicTemplate {...props} />;
    }
  }, [fitConfig, previewData, template]);

  useEffect(() => {
    setFitIndex(0);
    setNeedsMultiPage(false);
  }, [template, previewData]);

  useEffect(() => {
    if (!pageRef.current || isPrinting) return;

    let raf1;
    let raf2;
    let timeoutId;
    let cancelled = false;

    const measureAndFit = () => {
      const el = pageRef.current;
      if (!el || cancelled) return;

      const contentHeight = Math.ceil(el.scrollHeight || el.offsetHeight || 0);
      if (!contentHeight) return;

      if (contentHeight <= PAPER_HEIGHT) {
        setNeedsMultiPage(false);
        return;
      }

      if (fitIndex < FIT_PRESETS.length - 1) {
        setFitIndex((prev) => Math.min(prev + 1, FIT_PRESETS.length - 1));
        return;
      }

      setNeedsMultiPage(true);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measureAndFit);
    });

    timeoutId = window.setTimeout(measureAndFit, 200);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeoutId);
    };
  }, [fitIndex, isPrinting, previewData, template]);

  useEffect(() => {
    if (isPrinting) return;

    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const updateViewScale = () => {
      const width = wrapperEl.clientWidth || 0;

      if (!width) {
        setViewScale(1);
        return;
      }

      // We need to account for both the wrapper padding AND the resume container internal margins.
      // 48px buffer provides "breathing room" to ensure NO horizontal scrollbar is triggered.
      const availableWidth = Math.max(width - 48, 280);
      const nextScale =
        availableWidth < PAPER_WIDTH
          ? Math.max(availableWidth / PAPER_WIDTH, 0.38)
          : 1;

      setViewScale(nextScale);
    };

    updateViewScale();

    let observer;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateViewScale);
      observer.observe(wrapperEl);
    } else {
      window.addEventListener("resize", updateViewScale);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", updateViewScale);
      }
    };
  }, [isPrinting]);

  useEffect(() => {
    const onBeforePrint = () => {
      document.body.classList.add("printing-resume");
      setIsPrinting(true);
    };

    const onAfterPrint = () => {
      document.body.classList.remove("printing-resume");
      setIsPrinting(false);
      setIsPreparingPdf(false);
      setIsPreparingWord(false);
      setPreviewData(latestLiveDataRef.current);
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const handleDownloadPDF = async () => {
    try {
      setIsPreparingPdf(true);

      // 1. Create a hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "100%";
      iframe.style.bottom = "100%";
      iframe.style.width = "210mm";
      iframe.style.height = "297mm";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;

      // 2. Clone all styles from the main document
      let styleString = "";
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || []).map(rule => rule.cssText).join("\n");
          styleString += rules + "\n";
        } catch (e) {
          // Cross-origin styles might fail, fallback to link tags
          if (sheet.href) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            iframeDoc.head.appendChild(link);
          }
        }
      });

      const styleTag = document.createElement("style");
      styleTag.textContent = styleString;
      iframeDoc.head.appendChild(styleTag);

      // 3. Inject the resume content
      // We use the live internal resume data for the absolute latest version
      const resumeContent = pageRef.current.innerHTML;
      iframeDoc.body.innerHTML = `
        <div class="resume-print-root" style="width: 210mm; height: 297mm; overflow: visible; background: #ffffff;">
          <div class="resume-print-shell" style="width: 210mm; height: 297mm; background: #ffffff;">
            <div class="resume-print-page" style="width: 210mm; height: 297mm; background: #ffffff;">
              ${resumeContent}
            </div>
          </div>
        </div>
      `;

      // 4. Wait for all resources (fonts, images) to load in the iframe
      await new Promise((resolve) => {
        const checkLoaded = () => {
          if (iframeDoc.readyState === "complete") {
            // Extra small timeout for font rendering
            setTimeout(resolve, 300);
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });

      // 5. Trigger print from the iframe context
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // 6. Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPreparingPdf(false);
      }, 1000);

    } catch (error) {
      console.error("PDF export failed:", error);
      setIsPreparingPdf(false);
      alert("PDF export failed. Please try again.");
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsPreparingWord(true);
      // Use the live data directly for Word export as well.
      await generateWordDocument(safeResumeData);
    } catch (error) {
      console.error("Word export failed:", error);
      alert("Word export failed. Please try again.");
    } finally {
      setIsPreparingWord(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10">
      <aside className="no-print w-full space-y-5 xl:w-[280px] xl:sticky xl:top-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Template Selection
            </h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[10px] font-bold text-[var(--color-primary)]">
              {TEMPLATES.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2.5">
            {TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTemplate(item.id);
                  if (onTemplateChange) onTemplateChange(item.id);
                }}
                disabled={exportInProgress}
                className={`group relative overflow-hidden rounded-2xl border-2 p-3.5 text-left transition-all duration-300 ${
                  template === item.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-md"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-bold transition-colors ${
                      template === item.id
                        ? "text-[var(--color-primary)]"
                        : "text-slate-700"
                    }`}
                  >
                    {item.name}
                  </p>
                  {template === item.id && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
           <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${projectionStatus === 'up_to_date' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {statusMeta.title}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Export Options</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            Professional PDF & Word for ATS.
          </p>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={exportInProgress || !isDataComplete}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IoDownload size={18} />
              {isSyncing 
                ? "Syncing Data..." 
                : (isPreparingPdf || isPrinting ? "Preparing PDF..." : "Download PDF")}
            </button>

            <button
              type="button"
              onClick={handleDownloadWord}
              disabled={exportInProgress}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IoDocumentText size={18} />
              Download Word
            </button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm sm:p-6 lg:p-10">
          <div className="no-print mb-8 flex flex-col gap-4 border-b border-slate-200/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Standard Viewport
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
                {TEMPLATES.find((item) => item.id === template)?.name || "Classic ATS"}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-500">
                SCALE {Math.round(viewScale * 100)}%
              </span>
              <span className="inline-flex rounded-lg border border-slate-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold tracking-widest text-indigo-700 uppercase">
                HD PREVIEW
              </span>
            </div>
          </div>

          <div
            ref={wrapperRef}
            className="resume-print-root flex justify-center overflow-x-auto overflow-y-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-inner sm:p-10"
          >
            <div className="flex justify-center relative">
              <div
                style={{
                  width: isPrinting ? "210mm" : `${scaledPreviewWidth}px`,
                  height: isPrinting ? "297mm" : `${scaledPreviewHeight}px`,
                  position: "relative",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <div
                  className="resume-print-shell bg-white"
                  style={{
                    width: `${PAPER_WIDTH}px`,
                    minWidth: `${PAPER_WIDTH}px`,
                    height: `${PAPER_HEIGHT}px`,
                    minHeight: `${PAPER_HEIGHT}px`,
                    maxHeight: `${PAPER_HEIGHT}px`,
                    transform: isPrinting ? "none" : `scale(${viewScale})`,
                    transformOrigin: "top left",
                    boxShadow: isPrinting
                      ? "none"
                      : "0 25px 80px -20px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    background: "#ffffff",
                    borderRadius: isPrinting ? "0" : "2px",
                  }}
                >
                  <div
                    ref={pageRef}
                    className="resume-print-page"
                    style={{
                      width: `${PAPER_WIDTH}px`,
                      height: `${PAPER_HEIGHT}px`,
                      minHeight: `${PAPER_HEIGHT}px`,
                      maxHeight: `${PAPER_HEIGHT}px`,
                      overflow: "hidden",
                      background: "#ffffff",
                    }}
                  >
                    {renderTemplate()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}