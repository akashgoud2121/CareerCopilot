import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Building2,
  BookOpen,
  CalendarDays,
  Award,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { createEmptyEducationItem } from "../../../utils/resumeSchema";

const EDUCATION_CATEGORIES = [
  "Higher Education (University)",
  "Intermediate / Diploma",
  "Schooling",
  "Certification / Special Program",
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
  for (let year = currentYear + 8; year >= 1980; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function getMonthNumber(monthName) {
  return MONTH_OPTIONS.find((month) => month.value === monthName)?.number || 0;
}

function normalizeEducationValue(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyEducationItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyEducationItem().clientKey,
    }))
    .filter(Boolean);

  return normalized;
}

function validateEducationItem(item) {
  const errors = {};

  if (!item.category?.trim()) {
    errors.category = "Education category is required.";
  }

  if (!item.institution?.trim()) {
    errors.institution = "University / College name is required.";
  }

  if (!item.degreeMajor?.trim()) {
    errors.degreeMajor = "Degree & major is required.";
  }

  if (!item.startMonth) {
    errors.startMonth = "Start month is required.";
  }

  if (!item.startYear) {
    errors.startYear = "Start year is required.";
  }

  if (!item.endMonth) {
    errors.endMonth = "End month is required.";
  }

  if (!item.endYear) {
    errors.endYear = "End year is required.";
  }

  if (!item.cityState?.trim()) {
    errors.cityState = "City / State is required.";
  }

  if (item.cgpaOrPercentage?.trim()) {
    const cgpaValue = item.cgpaOrPercentage.trim();
    const cgpaRegex = /^([0-9]{1,2}(\.[0-9]{1,2})?)%?$|^[0-9](\.[0-9]{1,2})?$/;

    if (!cgpaRegex.test(cgpaValue)) {
      errors.cgpaOrPercentage =
        "Enter a valid CGPA or percentage, for example 8.57 or 92%.";
    }
  }

  if (item.startMonth && item.startYear && item.endMonth && item.endYear) {
    const startYear = Number(item.startYear);
    const endYear = Number(item.endYear);
    const startMonth = getMonthNumber(item.startMonth);
    const endMonth = getMonthNumber(item.endMonth);

    if (
      endYear < startYear ||
      (endYear === startYear && endMonth < startMonth)
    ) {
      errors.dateRange = "End date must be after the start date.";
    }
  }

  return errors;
}

function sortEducationChronologically(items) {
  return [...items].sort((a, b) => {
    const aEndYear = Number(a.endYear) || 0;
    const bEndYear = Number(b.endYear) || 0;

    if (bEndYear !== aEndYear) {
      return bEndYear - aEndYear;
    }

    const aEndMonth = getMonthNumber(a.endMonth);
    const bEndMonth = getMonthNumber(b.endMonth);

    if (bEndMonth !== aEndMonth) {
      return bEndMonth - aEndMonth;
    }

    const aStartYear = Number(a.startYear) || 0;
    const bStartYear = Number(b.startYear) || 0;

    if (bStartYear !== aStartYear) {
      return bStartYear - aStartYear;
    }

    const aStartMonth = getMonthNumber(a.startMonth);
    const bStartMonth = getMonthNumber(b.startMonth);

    return bStartMonth - aStartMonth;
  });
}

function EducationForm({ value, setResumeData, showValidationErrors = false }) {

  const [touched, setTouched] = useState(false);
  const [qualificationErrors, setQualificationErrors] = useState([]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const educationList = normalizeEducationValue(value);

  useEffect(() => {
    const allErrors = educationList.map((item) => validateEducationItem(item));
    setQualificationErrors(allErrors);
  }, [value]);

  const saveEducation = (items) => {
    const normalizedItems = normalizeEducationValue(items);
    const sortedItems = sortEducationChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      education: sortedItems,
    }));
  };

  const updateEducationItem = (clientKey, field, fieldValue) => {
    const updatedItems = educationList.map((item) =>
      item.clientKey === clientKey
        ? {
            ...item,
            [field]: fieldValue,
          }
        : item
    );

    saveEducation(updatedItems);
  };

  const addEducation = () => {
    const updatedItems = [...educationList, createEmptyEducationItem()];
    saveEducation(updatedItems);
    setTouched(true);
  };

  const removeEducation = (clientKey) => {
    const updatedItems = educationList.filter(
      (item) => item.clientKey !== clientKey
    );
    saveEducation(updatedItems);
    setTouched(true);
  };

  const getFieldError = (index, field) => {
    if (!touched && !showValidationErrors) return "";
    return qualificationErrors[index]?.[field] || "";
  };

  const totalErrors = (touched || showValidationErrors)
    ? qualificationErrors.reduce(
        (count, item) => count + Object.keys(item).length,
        0
      )
    : 0;

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Education
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            Education Details
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add your academic qualifications in a clear and recruiter-friendly
            format.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {educationList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                <GraduationCap className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Qualifications Added</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-500 leading-relaxed">
                Add your degrees, schools, or certifications to build your academic profile.
              </p>
              <button
                type="button"
                onClick={addEducation}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Your First Qualification
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {educationList.map((item, index) => {
              const cardErrors = qualificationErrors[index] || {};

              return (
                <div
                  key={item.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Qualification {index + 1}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Enter the details exactly as they should appear on your
                        resume.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEducation(item.clientKey)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Remove qualification ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Education Category"
                      required
                      icon={<GraduationCap size={16} />}
                      error={getFieldError(index, "category")}
                    >
                      <select
                        value={item.category || ""}
                        onChange={(e) => {
                          updateEducationItem(item.clientKey, "category", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "category")
                        )}
                      >
                        <option value="">Select category</option>
                        {EDUCATION_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </FieldWrapper>

                    <FieldWrapper
                      label="University / College Name"
                      required
                      icon={<Building2 size={16} />}
                      error={getFieldError(index, "institution")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.institution || ""}
                        placeholder="e.g., State University of Technology"
                        onChange={(e) => {
                          updateEducationItem(item.clientKey, "institution", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "institution")
                        )}
                      />
                      <CharacterCounter current={item.institution?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Degree & Major"
                      required
                      icon={<BookOpen size={16} />}
                      error={getFieldError(index, "degreeMajor")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.degreeMajor || ""}
                        placeholder="e.g., B.Tech in Computer Science"
                        onChange={(e) => {
                          updateEducationItem(item.clientKey, "degreeMajor", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "degreeMajor")
                        )}
                      />
                      <CharacterCounter current={item.degreeMajor?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="CGPA / Percentage"
                      icon={<Award size={16} />}
                      error={getFieldError(index, "cgpaOrPercentage")}
                    >
                      <input
                        type="text"
                        maxLength={20}
                        value={item.cgpaOrPercentage || ""}
                        placeholder="e.g., 8.5 or 92%"
                        onChange={(e) => {
                          updateEducationItem(
                            item.clientKey,
                            "cgpaOrPercentage",
                            e.target.value
                          );
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "cgpaOrPercentage")
                        )}
                      />
                      <CharacterCounter current={item.cgpaOrPercentage?.length || 0} max={20} />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
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
                            updateEducationItem(item.clientKey, "startMonth", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "startMonth")
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
                          value={item.startYear || ""}
                          onChange={(e) => {
                            updateEducationItem(item.clientKey, "startYear", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "startYear")
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

                      {(getFieldError(index, "startMonth") ||
                        getFieldError(index, "startYear")) && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {getFieldError(index, "startMonth") ||
                            getFieldError(index, "startYear")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <CalendarDays size={16} />
                        </span>
                        <span>
                          End Date (or Expected)
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={item.endMonth || ""}
                          onChange={(e) => {
                            updateEducationItem(item.clientKey, "endMonth", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "endMonth") ||
                              !!getFieldError(index, "dateRange")
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
                          value={item.endYear || ""}
                          onChange={(e) => {
                            updateEducationItem(item.clientKey, "endYear", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "endYear") ||
                              !!getFieldError(index, "dateRange")
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

                      {(getFieldError(index, "endMonth") ||
                        getFieldError(index, "endYear") ||
                        getFieldError(index, "dateRange")) && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {getFieldError(index, "dateRange") ||
                            getFieldError(index, "endMonth") ||
                            getFieldError(index, "endYear")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="City / State"
                      required
                      icon={<MapPin size={16} />}
                      error={getFieldError(index, "cityState")}
                    >
                      <input
                        type="text"
                        value={item.cityState || ""}
                        placeholder="e.g., City, State"
                        onChange={(e) => {
                          updateEducationItem(item.clientKey, "cityState", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "cityState")
                        )}
                      />
                    </FieldWrapper>
                  </div>

                  {(touched || showValidationErrors) && Object.keys(cardErrors).length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-700">
                        Please complete this qualification properly.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {educationList.length > 0 && (
              <button
                type="button"
                onClick={addEducation}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Another Qualification
              </button>
            )}

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
      {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
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
    <p className={`mt-1.5 text-right text-[11px] font-bold uppercase tracking-wider ${
      isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-slate-400"
    }`}>
      {current} / {max} <span className="ml-1 opacity-60">chars</span>
    </p>
  );
}

export default EducationForm;