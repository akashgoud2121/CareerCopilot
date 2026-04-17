import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Tag,
  FolderKanban,
  Building2,
  CalendarDays,
  Link as LinkIcon,
  FileText,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { createEmptyAchievementItem, isObjectiveText } from "../../../utils/resumeSchema";

const ACHIEVEMENT_CATEGORIES = [
  "Hackathon",
  "Competition",
  "Award",
  "Scholarship",
  "Leadership",
  "Certification",
  "Research",
  "Volunteer Activity",
  "Sports",
  "Cultural Activity",
  "Club / Student Activity",
  "Other",
];

const MONTH_OPTIONS = [
  { label: "January", value: "January", number: 1 },
  { label: "February", value: "February", number: 2 },
  { label: "March", value: "March", number: 3 },
  { label: "April", value: "April", number: 4 },
  { label: "May", value: "May", number: 5 },
  { label: "June", value: "June", number: 6 },
  { label: "July", value: "July", number: 7 },
  { label: "August", value: "August", number: 8 },
  { label: "September", value: "September", number: 9 },
  { label: "October", value: "October", number: 10 },
  { label: "November", value: "November", number: 11 },
  { label: "December", value: "December", number: 12 },
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1990; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function getMonthNumber(monthName) {
  return MONTH_OPTIONS.find((month) => month.value === monthName)?.number || 0;
}

function normalizeAchievements(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyAchievementItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyAchievementItem().clientKey,
    }))
    .filter(Boolean);

  return normalized;
}

function isValidUrl(url) {
  if (!url?.trim()) return true;

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateAchievement(item) {
  const errors = {};

  if (!item.category?.trim()) {
    errors.category = "Category is required.";
  }

  if (!item.title?.trim()) {
    errors.title = "Hackathon name / project title is required.";
  }

  if (!item.organizerOrRank?.trim()) {
    errors.organizerOrRank = "Organized by / rank is required.";
  }

  // Smart Validation for Objective-style text
  if (isObjectiveText(item.title)) {
    errors.title = "This looks like a summary or is too long (limit: 10 words). Please keep titles concise.";
  } else if (isObjectiveText(item.organizerOrRank)) {
    errors.organizerOrRank = "Organizer name looks like a summary or exceeds 10 words. Please keep it concise.";
  }

  if (!item.month) {
    errors.month = "Month is required.";
  }

  if (!item.year) {
    errors.year = "Year is required.";
  }

  if (item.link?.trim() && !isValidUrl(item.link)) {
    errors.link = "Enter a valid link.";
  }

  if (!item.description?.trim()) {
    errors.description = "Description is required.";
  } else if (item.description.trim().length < 20) {
    errors.description = "Please add a more meaningful description.";
  }

  return errors;
}

function sortAchievementsChronologically(items) {
  return [...items].sort((a, b) => {
    const aYear = Number(a.year) || 0;
    const bYear = Number(b.year) || 0;

    if (bYear !== aYear) {
      return bYear - aYear;
    }

    const aMonth = getMonthNumber(a.month);
    const bMonth = getMonthNumber(b.month);

    return bMonth - aMonth;
  });
}

function AchievementsForm({ value, setResumeData, onOpenAIModal }) {
  const [touched, setTouched] = useState(false);
  const [achievementErrors, setAchievementErrors] = useState([]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const achievements = normalizeAchievements(value);

  useEffect(() => {
    const allErrors = achievements.map((item) => validateAchievement(item));
    setAchievementErrors(allErrors);
  }, [value]);

  const saveAchievements = (items) => {
    const normalizedItems = normalizeAchievements(items);
    const sortedItems = sortAchievementsChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      achievements: sortedItems,
    }));
  };

  const updateAchievement = (clientKey, field, fieldValue) => {
    const updatedItems = achievements.map((item) =>
      item.clientKey === clientKey
        ? {
            ...item,
            [field]: fieldValue,
          }
        : item
    );

    saveAchievements(updatedItems);
  };

  const addAchievement = () => {
    const updatedItems = [...achievements, createEmptyAchievementItem()];
    saveAchievements(updatedItems);
    setTouched(true);
  };

  const removeAchievement = (clientKey) => {
    const updatedItems = achievements.filter(
      (item) => item.clientKey !== clientKey
    );

    saveAchievements(updatedItems);
    setTouched(true);
  };

  const getFieldError = (index, field) => {
    if (!touched) return "";
    return achievementErrors[index]?.[field] || "";
  };

  const totalErrors = touched
    ? achievementErrors.reduce(
        (count, item) => count + Object.keys(item).length,
        0
      )
    : 0;

  const openAchievementAIModal = (index, item) => {
    if (!onOpenAIModal) return;

    onOpenAIModal("achievements", {
      index,
      clientKey: item?.clientKey,
      field: "description",
      item,
      initialData: {
        category: item?.category || "",
        title: item?.title || "",
        organizedBy: item?.organizerOrRank || "",
        description: item?.description || "",
        tone: "Professional",
      },
    });
  };

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Achievements
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
                Achievements & Activities
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add hackathons, competitions, awards, rankings, and meaningful
                activities that make your profile stronger.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                <Trophy className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Achievements Added</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-500 leading-relaxed">
                Add hackathons, awards, or activities that make your profile stand out.
              </p>
              <button
                type="button"
                onClick={addAchievement}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Your First Achievement
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {achievements.map((item, index) => {
              const cardErrors = achievementErrors[index] || {};

              return (
                <div
                  key={item.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Achievement / Activity {index + 1}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Add the achievement exactly as you want it to appear on
                        the resume.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAchievement(item.clientKey)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Remove achievement ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Category"
                      required
                      icon={<Tag size={16} />}
                      error={getFieldError(index, "category")}
                    >
                      <select
                        value={item.category || ""}
                        onChange={(e) => {
                          updateAchievement(item.clientKey, "category", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "category")
                        )}
                      >
                        <option value="">Select category</option>
                        {ACHIEVEMENT_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </FieldWrapper>

                    <FieldWrapper
                      label="Hackathon Name / Project Title"
                      required
                      icon={<FolderKanban size={16} />}
                      error={getFieldError(index, "title")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.title || ""}
                        placeholder="e.g. National Hackathon / 1st Place Coding Contest"
                        onChange={(e) => {
                          updateAchievement(item.clientKey, "title", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "title")
                        )}
                      />
                      <CharacterCounter current={item.title?.length || 0} max={100} />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Organized by / Rank"
                      required
                      icon={<Building2 size={16} />}
                      error={getFieldError(index, "organizerOrRank")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.organizerOrRank || ""}
                        placeholder="e.g. Smart India Hackathon / IIT Bombay"
                        onChange={(e) => {
                          updateAchievement(
                            item.clientKey,
                            "organizerOrRank",
                            e.target.value
                          );
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "organizerOrRank")
                        )}
                      />
                      <CharacterCounter current={item.organizerOrRank?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Achievement Link (Optional)"
                      icon={<LinkIcon size={16} />}
                      error={getFieldError(index, "link")}
                    >
                      <input
                        type="text"
                        value={item.link || ""}
                        placeholder="e.g., your-project-link.com"
                        onChange={(e) => {
                          updateAchievement(item.clientKey, "link", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "link")
                        )}
                      />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="text-slate-500">
                        <CalendarDays size={16} />
                      </span>
                      <span>
                        Date
                        <span className="ml-1 text-red-600">*</span>
                      </span>
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-md">
                      <select
                        value={item.month || ""}
                        onChange={(e) => {
                          updateAchievement(item.clientKey, "month", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "month")
                        )}
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.year || ""}
                        onChange={(e) => {
                          updateAchievement(item.clientKey, "year", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "year")
                        )}
                      >
                        <option value="">Year</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(getFieldError(index, "month") ||
                      getFieldError(index, "year")) && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {getFieldError(index, "month") ||
                          getFieldError(index, "year")}
                      </p>
                    )}
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
                          onClick={() => openAchievementAIModal(index, item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                        >
                          <Sparkles size={15} />
                          Generate with AI
                        </button>
                      )}
                    </div>

                    <textarea
                      data-lenis-prevent="true"
                      rows={5}
                      value={item.description || ""}
                      onChange={(e) => {
                        updateAchievement(item.clientKey, "description", e.target.value);
                        setTouched(true);
                      }}
                      placeholder="- Secured 1st place out of over 500 competing teams at the Smart India Hackathon by developing a full-stack web application...
- Engineered a predictive model and integrated APIs to solve a real-world problem..."
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                        getFieldError(index, "description")
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
                      }`}
                    />

                    {getFieldError(index, "description") ? (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {getFieldError(index, "description")}
                      </p>
                    ) : null}
                  </div>

                  {touched && Object.keys(cardErrors).length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-700">
                        Please complete this achievement / activity properly.
                      </p>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {achievements.length > 0 && (
              <button
                type="button"
                onClick={addAchievement}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Achievement/Activity
              </button>
            )}

            {touched && totalErrors > 0 && (
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

function FieldWrapper({ label, required = false, icon, error, children }) {
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

function getInputClassName(hasError) {
  return `h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
  }`;
}

function CharacterCounter({ current, max }) {
  const isClose = current > max * 0.85;
  const isOver = current >= max;

  return (
    <p
      className={`mt-1.5 text-right text-[11px] font-bold uppercase tracking-wider ${
        isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-slate-400"
      }`}
    >
      {current} / {max} <span className="ml-1 opacity-60">chars</span>
    </p>
  );
}

export default AchievementsForm;