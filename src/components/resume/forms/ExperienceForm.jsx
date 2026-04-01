import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createEmptyExperienceItem } from "../../../utils/resumeSchema";

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 35 }, (_, index) => String(currentYear - index));
}

function normalizeExperience(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [createEmptyExperienceItem()];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyExperienceItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyExperienceItem().clientKey,
      location: item?.location || item?.cityState || "",
    }))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [createEmptyExperienceItem()];
}

function getMonthIndex(month) {
  const index = MONTH_OPTIONS.findIndex((m) => m === month);
  return index === -1 ? -1 : index;
}

function validateExperience(item) {
  const errors = {};

  if (!item.role?.trim()) {
    errors.role = "Role is required.";
  }

  if (!item.company?.trim()) {
    errors.company = "Company / organization is required.";
  }

  if (!item.employmentType?.trim()) {
    errors.employmentType = "Employment type is required.";
  }

  if (!item.location?.trim()) {
    errors.location = "Location is required.";
  }

  if (!item.startMonth?.trim()) {
    errors.startMonth = "Start month is required.";
  }

  if (!item.startYear?.trim()) {
    errors.startYear = "Start year is required.";
  }

  if (!item.currentlyWorking) {
    if (!item.endMonth?.trim()) {
      errors.endMonth = "End month is required.";
    }

    if (!item.endYear?.trim()) {
      errors.endYear = "End year is required.";
    }
  }

  if (
    item.startMonth &&
    item.startYear &&
    !item.currentlyWorking &&
    item.endMonth &&
    item.endYear
  ) {
    const startYear = Number(item.startYear);
    const endYear = Number(item.endYear);
    const startMonth = getMonthIndex(item.startMonth);
    const endMonth = getMonthIndex(item.endMonth);

    if (
      !Number.isNaN(startYear) &&
      !Number.isNaN(endYear) &&
      startMonth !== -1 &&
      endMonth !== -1
    ) {
      if (
        endYear < startYear ||
        (endYear === startYear && endMonth < startMonth)
      ) {
        errors.dateRange = "End date must be after start date.";
      }
    }
  }

  if (!item.description?.trim()) {
    errors.description = "Description is required.";
  } else if (item.description.trim().length < 40) {
    errors.description = "Description should be at least 40 characters.";
  }

  return errors;
}

function sortExperienceChronologically(items = []) {
  return [...items].sort((a, b) => {
    const aCurrent = a?.currentlyWorking ? 1 : 0;
    const bCurrent = b?.currentlyWorking ? 1 : 0;

    if (aCurrent !== bCurrent) {
      return bCurrent - aCurrent;
    }

    const aEndYear = Number(a?.endYear || a?.startYear || 0);
    const bEndYear = Number(b?.endYear || b?.startYear || 0);

    if (bEndYear !== aEndYear) {
      return bEndYear - aEndYear;
    }

    const aEndMonth = getMonthIndex(a?.endMonth || a?.startMonth || "");
    const bEndMonth = getMonthIndex(b?.endMonth || b?.startMonth || "");

    if (bEndMonth !== aEndMonth) {
      return bEndMonth - aEndMonth;
    }

    const aStartYear = Number(a?.startYear || 0);
    const bStartYear = Number(b?.startYear || 0);

    if (bStartYear !== aStartYear) {
      return bStartYear - aStartYear;
    }

    const aStartMonth = getMonthIndex(a?.startMonth || "");
    const bStartMonth = getMonthIndex(b?.startMonth || "");

    return bStartMonth - aStartMonth;
  });
}

function ExperienceForm({ value, setResumeData, onOpenAIModal, showValidationErrors = false }) {
  const [errors, setErrors] = useState([]);
  const [touched, setTouched] = useState(false);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const experiences = normalizeExperience(value);

  useEffect(() => {
    setErrors(experiences.map((exp) => validateExperience(exp)));
  }, [value]);

  const saveExperiences = (items) => {
    const normalizedItems = normalizeExperience(items);
    const sorted = sortExperienceChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      experience: sorted,
    }));
  };

  const updateExperience = (clientKey, field, fieldValue) => {
    const updated = experiences.map((item) => {
      if (item.clientKey !== clientKey) return item;

      const updatedItem = {
        ...item,
        [field]: fieldValue,
      };

      if (field === "currentlyWorking" && fieldValue) {
        updatedItem.endMonth = "";
        updatedItem.endYear = "";
      }

      return updatedItem;
    });

    saveExperiences(updated);
  };

  const addExperience = () => {
    const updated = [...experiences, createEmptyExperienceItem()];
    saveExperiences(updated);
    setTouched(true);
  };

  const removeExperience = (clientKey) => {
    const updated = experiences.filter((item) => item.clientKey !== clientKey);
    saveExperiences(updated.length ? updated : [createEmptyExperienceItem()]);
    setTouched(true);
  };

  const getError = (index, field) => {
    if (!touched && !showValidationErrors) return "";
    return errors[index]?.[field] || "";
  };

  const totalErrors = (touched || showValidationErrors)
    ? errors.reduce((count, item) => count + Object.keys(item).length, 0)
    : 0;

  const openExperienceAIModal = (index, item) => {
    if (!onOpenAIModal) return;

    onOpenAIModal("experience", {
      index,
      clientKey: item?.clientKey,
      field: "description",
      item,
      initialData: {
        role: item?.role || "",
        company: item?.company || "",
        employmentType: item?.employmentType || "",
        location: item?.location || "",
        responsibilities: item?.description || "",
        toolsUsed: "",
        outcome: "",
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
              Experience
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
              Work Experience
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add internships, jobs, freelance work, or volunteer experience
              that shows responsibility, contribution, and real impact.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="space-y-6">
            {experiences.map((item, index) => {
              const cardErrors = errors[index] || {};

              return (
                <div
                  key={item.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Experience {index + 1}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Add this experience exactly the way you want it to appear
                        on your resume.
                      </p>
                    </div>

                    {experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(item.clientKey)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FieldWrapper
                      icon={<Briefcase size={16} />}
                      label="Role"
                      required
                      error={getError(index, "role")}
                    >
                      <input
                        type="text"
                        value={item.role || ""}
                        onChange={(e) => {
                          updateExperience(item.clientKey, "role", e.target.value);
                          setTouched(true);
                        }}
                        placeholder="e.g., Software Engineer Intern"
                        className={getInputClassName(!!getError(index, "role"))}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      icon={<Building2 size={16} />}
                      label="Company / Organization"
                      required
                      error={getError(index, "company")}
                    >
                      <input
                        type="text"
                        value={item.company || ""}
                        onChange={(e) => {
                          updateExperience(item.clientKey, "company", e.target.value);
                          setTouched(true);
                        }}
                        placeholder="e.g., Company / Organization name"
                        className={getInputClassName(!!getError(index, "company"))}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      icon={<Briefcase size={16} />}
                      label="Employment Type"
                      required
                      error={getError(index, "employmentType")}
                    >
                      <input
                        type="text"
                        value={item.employmentType || ""}
                        onChange={(e) => {
                          updateExperience(
                            item.clientKey,
                            "employmentType",
                            e.target.value
                          );
                          setTouched(true);
                        }}
                        placeholder="Internship / Full-time / Freelance"
                        className={getInputClassName(
                          !!getError(index, "employmentType")
                        )}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      icon={<MapPin size={16} />}
                      label="Location"
                      required
                      error={getError(index, "location")}
                    >
                      <input
                        type="text"
                        value={item.location || ""}
                        onChange={(e) => {
                          updateExperience(item.clientKey, "location", e.target.value);
                          setTouched(true);
                        }}
                        placeholder="e.g., City, State / Remote"
                        className={getInputClassName(
                          !!getError(index, "location")
                        )}
                      />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <CalendarDays size={16} />
                        </span>
                        <span>
                          Start Date
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={item.startMonth || ""}
                          onChange={(e) => {
                            updateExperience(item.clientKey, "startMonth", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getError(index, "startMonth")
                          )}
                        >
                          <option value="">Month</option>
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>

                        <select
                          value={item.startYear || ""}
                          onChange={(e) => {
                            updateExperience(item.clientKey, "startYear", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getError(index, "startYear")
                          )}
                        >
                          <option value="">Year</option>
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(getError(index, "startMonth") ||
                        getError(index, "startYear")) && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {getError(index, "startMonth") ||
                            getError(index, "startYear")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <CalendarDays size={16} />
                        </span>
                        <span>
                          End Date
                          {!item.currentlyWorking ? (
                            <span className="ml-1 text-red-600">*</span>
                          ) : null}
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          disabled={!!item.currentlyWorking}
                          value={item.endMonth || ""}
                          onChange={(e) => {
                            updateExperience(item.clientKey, "endMonth", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getError(index, "endMonth") ||
                              !!getError(index, "dateRange"),
                            !!item.currentlyWorking
                          )}
                        >
                          <option value="">Month</option>
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>

                        <select
                          disabled={!!item.currentlyWorking}
                          value={item.endYear || ""}
                          onChange={(e) => {
                            updateExperience(item.clientKey, "endYear", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getError(index, "endYear") ||
                              !!getError(index, "dateRange"),
                            !!item.currentlyWorking
                          )}
                        >
                          <option value="">Year</option>
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(getError(index, "endMonth") ||
                        getError(index, "endYear") ||
                        getError(index, "dateRange")) && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {getError(index, "dateRange") ||
                            getError(index, "endMonth") ||
                            getError(index, "endYear")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!item.currentlyWorking}
                        onChange={(e) => {
                          updateExperience(
                            item.clientKey,
                            "currentlyWorking",
                            e.target.checked
                          );
                          setTouched(true);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      I currently work here
                    </label>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <FileText size={16} />
                        </span>
                        <span>
                          Description
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      {onOpenAIModal && (
                        <button
                          type="button"
                          onClick={() => openExperienceAIModal(index, item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                        >
                          <Sparkles size={15} />
                          Generate with AI
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      value={item.description || ""}
                      onChange={(e) => {
                        updateExperience(item.clientKey, "description", e.target.value);
                        setTouched(true);
                      }}
                      placeholder="Explain what you worked on, the tools or technologies used, and the impact or outcome."
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                        getError(index, "description")
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
                      }`}
                    />

                    {getError(index, "description") ? (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {getError(index, "description")}
                      </p>
                    ) : null}
                  </div>

                  {(touched || showValidationErrors) && Object.keys(cardErrors).length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-700">
                        Please complete this experience properly.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addExperience}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
            >
              <Plus size={16} />
              Add Experience
            </button>

            {(touched || showValidationErrors) && totalErrors > 0 && (
              <p className="text-sm font-medium text-red-600">
                {totalErrors} validation issue{totalErrors > 1 ? "s" : ""} remaining.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldWrapper({ icon, label, required = false, error, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="text-slate-500">{icon}</span>
        <span>
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </span>
      </label>

      {children}

      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

function getInputClassName(hasError, disabled = false) {
  return `h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
  } ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`;
}

export default ExperienceForm;