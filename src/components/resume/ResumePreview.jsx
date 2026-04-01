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

  const fitConfig = FIT_PRESETS[fitIndex];
  const exportInProgress = isPreparingPdf || isPreparingWord || isPrinting;
  const statusMeta = getPreviewStatusMeta(projectionStatus);

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

      const availableWidth = Math.max(width - 40, 280);
      const nextScale =
        availableWidth < PAPER_WIDTH
          ? Math.max(availableWidth / PAPER_WIDTH, 0.42)
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

      const exportData = await getReadModelBackedResumeData();
      setPreviewData(exportData);

      await waitForFrames(3);
      document.body.classList.add("printing-resume");
      setIsPrinting(true);

      await waitForFrames(2);
      window.print();
    } catch (error) {
      console.error("PDF export failed:", error);
      document.body.classList.remove("printing-resume");
      setIsPrinting(false);
      setIsPreparingPdf(false);
      setPreviewData(latestLiveDataRef.current);
      alert("PDF export failed. Please try again.");
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsPreparingWord(true);
      const exportData = await getReadModelBackedResumeData();
      await generateWordDocument(exportData);
    } catch (error) {
      console.error("Word export failed:", error);
      alert("Word export failed. Please try again.");
    } finally {
      setIsPreparingWord(false);
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="no-print xl:sticky xl:top-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Choose Template
              </h3>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[10px] font-bold text-[var(--color-primary)]">
                3
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
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm shadow-[var(--color-primary)]/10"
                      : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-md"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-bold transition-colors ${
                        template === item.id
                          ? "text-[var(--color-primary)]"
                          : "text-slate-700 group-hover:text-slate-900"
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
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 transition-colors group-hover:text-slate-600">
                    {item.desc}
                  </p>
                  
                  {/* Subtle accent line for selected state */}
                  {template === item.id && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {fitIndex > 0 && !needsMultiPage && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-700">
                Auto Adjusted
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-amber-900">
                Content density was reduced slightly to keep the resume within a
                cleaner single-page layout.
              </p>
            </div>
          )}

          {needsMultiPage && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-rose-700">
                Too Much Content
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-rose-900">
                This content is exceeding safe single-page limits. It should
                move to a multi-page template instead of shrinking further.
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.pillClass}`}
              >
                {statusMeta.title}
              </span>

              {latestProjectedVersion !== null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                  Version {latestProjectedVersion}
                </span>
              ) : null}
            </div>

            <p className={`mt-3 text-sm font-semibold ${statusMeta.textClass}`}>
              Preview Status
            </p>

            {projectionMessage ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {projectionMessage}
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Preview uses the latest available read model when export is prepared.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Export Resume</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              Download your resume in standard formats.
            </p>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={exportInProgress}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IoDownload size={18} />
                {isPreparingPdf || isPrinting ? "Preparing PDF..." : "Download PDF"}
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={exportInProgress}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IoDocumentText size={18} />
                {isPreparingWord ? "Preparing Word..." : "Download Word"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="no-print mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Live Preview
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-800">
                {TEMPLATES.find((item) => item.id === template)?.name || "Classic ATS"}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                Scale {Math.round(viewScale * 100)}%
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                A4 Preview
              </span>
            </div>
          </div>

          <div
            ref={wrapperRef}
            className="resume-print-root overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-100/80 p-3 sm:p-5"
          >
            <div className="flex justify-center">
              <div
                style={{
                  width: isPrinting ? `${PAPER_WIDTH}px` : `${scaledPreviewWidth}px`,
                  height: isPrinting
                    ? `${PAPER_HEIGHT}px`
                    : `${scaledPreviewHeight}px`,
                  position: "relative",
                }}
              >
                <div
                  className="resume-print-shell bg-white ring-1 ring-slate-200"
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
                      : "0 18px 40px rgba(15, 23, 42, 0.10)",
                    overflow: "hidden",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    background: "#ffffff",
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