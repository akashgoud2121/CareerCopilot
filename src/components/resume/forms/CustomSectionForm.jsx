import React, { useEffect, useMemo, useState } from "react";
import {
  Type,
  Subtitles,
  CalendarDays,
  FileText,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { createEmptyCustomSectionItem, isObjectiveText } from "../../../utils/resumeSchema";

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

function normalizeCustomItems(value) {
  // If value is undefined, it means data is still loading from DB.
  // Returning null allows the parent to decide whether to show a loader or nothing.
  if (value === undefined) return null;

  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyCustomSectionItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyCustomSectionItem().clientKey,
    }))
    .filter(Boolean);

  return normalized;
}

function validateCustomItem(item) {
  const errors = {};

  if (!item.title?.trim()) {
    errors.title = "Title is required.";
  }

  // Smart Validation for Objective-style text
  if (isObjectiveText(item.title)) {
    errors.title = "This looks like a summary or is too long (limit: 10 words). Please keep titles concise.";
  } else if (isObjectiveText(item.subtitle)) {
    errors.subtitle = "Subtitle looks like a summary or exceeds 10 words. Please keep it concise.";
  }

  if (!item.description?.trim()) {
    errors.description = "Description is required.";
  } else if (item.description.trim().length < 10) {
    errors.description = "Please add a more meaningful description.";
  }

  return errors;
}

function sortItemsChronologically(items) {
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

function CustomSectionForm({
  sectionKey,
  label,
  value,
  setResumeData,
  onOpenAIModal,
}) {
  const [touched, setTouched] = useState(false);
  const [itemErrors, setItemErrors] = useState([]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const items = useMemo(() => normalizeCustomItems(value), [value]);

  useEffect(() => {
    if (!items) return;
    const allErrors = items.map((item) => validateCustomItem(item));
    setItemErrors(allErrors);
  }, [items]);

  const saveItems = (newItems) => {
    const normalizedItems = normalizeCustomItems(newItems);
    const sortedItems = sortItemsChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      [sectionKey]: sortedItems,
    }));
  };

  const updateItem = (clientKey, field, fieldValue) => {
    const updatedItems = items.map((item) =>
      item.clientKey === clientKey
        ? {
            ...item,
            [field]: fieldValue,
          }
        : item
    );

    saveItems(updatedItems);
  };

  const addItem = () => {
    const updatedItems = [...items, createEmptyCustomSectionItem()];
    saveItems(updatedItems);
    setTouched(true);
  };

  const removeItem = (clientKey) => {
    const updatedItems = items.filter((item) => item.clientKey !== clientKey);

    saveItems(updatedItems);
    setTouched(true);
  };

  const getFieldError = (index, field) => {
    if (!touched) return "";
    return itemErrors[index]?.[field] || "";
  };

  const totalErrors = touched
    ? itemErrors.reduce(
        (count, item) => count + Object.keys(item).length,
        0
      )
    : 0;

  const openAIModal = (index, item) => {
    if (!onOpenAIModal) return;

    onOpenAIModal(sectionKey, {
      index,
      clientKey: item?.clientKey,
      field: "description",
      item,
      initialData: {
        title: item?.title || "",
        subtitle: item?.subtitle || "",
        description: item?.description || "",
        tone: "Professional",
      },
      systemContext: `This is for a custom resume section titled "${label}".`,
    });
  };

  if (items === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
          <p className="text-slate-500 animate-pulse">Syncing {label}...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Custom Section
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
                {label}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add entries to your custom section. This can be research, volunteer work, hobbies, or anything that makes your profile unique.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                <Plus className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Entries in {label}</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-500 leading-relaxed">
                Add information to this section to make your profile unique.
              </p>
              <button
                type="button"
                onClick={addItem}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Your First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item, index) => {
              const cardErrors = itemErrors[index] || {};

              return (
                <div
                  key={item.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Entry {index + 1}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.clientKey)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Remove entry ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Title"
                      required
                      icon={<Type size={16} />}
                      error={getFieldError(index, "title")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.title || ""}
                        placeholder="e.g. Research Assistant / Volunteer"
                        onChange={(e) => {
                          updateItem(item.clientKey, "title", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "title")
                        )}
                      />
                      <CharacterCounter current={item.title?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Subtitle / Context (Optional)"
                      icon={<Subtitles size={16} />}
                      error={getFieldError(index, "subtitle")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.subtitle || ""}
                        placeholder="e.g. Remote / Freelance / University"
                        onChange={(e) => {
                          updateItem(item.clientKey, "subtitle", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "subtitle")
                        )}
                      />
                      <CharacterCounter current={item.subtitle?.length || 0} max={100} />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="text-slate-500">
                        <CalendarDays size={16} />
                      </span>
                      <span>Date (Optional)</span>
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-md">
                      <select
                        value={item.month || ""}
                        onChange={(e) => {
                          updateItem(item.clientKey, "month", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(false)}
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
                          updateItem(item.clientKey, "year", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(false)}
                      >
                        <option value="">Year</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
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
                          onClick={() => openAIModal(index, item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                        >
                          <Sparkles size={15} />
                          Generate with AI
                        </button>
                      )}
                    </div>

                    <textarea
                      data-lenis-prevent="true"
                      rows={4}
                      maxLength={600}
                      value={item.description || ""}
                      onChange={(e) => {
                        updateItem(item.clientKey, "description", e.target.value);
                        setTouched(true);
                      }}
                      placeholder="Share additional details, achievements, or context related to this entry..."
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
                </div>
              );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {items.length > 0 && (
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Entry
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

export default CustomSectionForm;
