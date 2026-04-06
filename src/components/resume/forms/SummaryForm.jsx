import React, { useState } from "react";
import { Sparkles } from "lucide-react";

function SummaryForm({ value, setResumeData, onOpenAIModal, showValidationErrors }) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState("");

  const summaryText = value?.text || "";
  const summaryLength = summaryText.length;

  const validateSummary = (text) => {
    const trimmed = text.trim();

    if (!trimmed) return "Professional summary is required.";
    if (trimmed.length < 40) {
      return "Summary is too short. Write at least 40 characters.";
    }
    return "";
  };

  const handleChange = (e) => {
    const { value: newValue } = e.target;

    setResumeData((prev) => ({
      ...prev,
      summary: {
        ...prev.summary,
        text: newValue,
      },
    }));

    if (touched) {
      setLocalError(validateSummary(newValue));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setLocalError(validateSummary(summaryText));
  };

  const currentError = showValidationErrors ? validateSummary(summaryText) : (touched ? localError : "");

  const openSummaryAIModal = () => {
    if (!onOpenAIModal) return;

    onOpenAIModal("summary", {
      field: "text",
      item: {
        text: summaryText,
      },
      initialData: {
        targetRole: "",
        currentStatus: "",
        education: "",
        skills: "",
        careerGoal: "",
        tone: "Professional",
      },
    });
  };

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
              Professional Summary
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add a short introduction that explains your background, strengths,
              and career goal clearly.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="summary"
                className="text-sm font-semibold text-slate-800"
              >
                Professional Summary
                <span className="ml-1 text-red-600">*</span>
              </label>

              <div className="flex items-center gap-3">
                {onOpenAIModal && (
                  <button
                    type="button"
                    onClick={openSummaryAIModal}
                    className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                  >
                    <Sparkles size={15} />
                    Generate with AI
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="summary"
              name="summary"
              rows={8}
              maxLength={500}
              value={summaryText}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Write a 2-3 sentence summary. Mention your field of study, key skills, and what you're looking for (eg. 'a challenging software engineering internship')."
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 ${
                currentError
                  ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
              }`}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className={`text-sm font-medium ${currentError ? "text-red-600" : "text-slate-500"}`}>
                {currentError || (summaryLength >= 450 ? "Approaching limit for 1-page fit." : "")}
              </p>
              <CharacterCounter current={summaryLength} max={500} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CharacterCounter({ current, max }) {
  const isClose = current > max * 0.85;
  const isOver = current >= max;

  return (
    <p className={`text-right text-[11px] font-bold uppercase tracking-wider ${
      isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-slate-400"
    }`}>
      {current} / {max} <span className="ml-1 opacity-60">chars</span>
    </p>
  );
}

export default SummaryForm;