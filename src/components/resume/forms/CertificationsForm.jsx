import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Building2,
  CalendarDays,
  Link as LinkIcon,
  Hash,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { createEmptyCertificationItem } from "../../../utils/resumeSchema";

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

function normalizeCertifications(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyCertificationItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyCertificationItem().clientKey,
      link: item?.link || item?.credentialUrl || "",
      description: item?.description || item?.skillsCovered || "",
      skillsCovered: item?.skillsCovered || item?.description || "",
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

function validateCertification(item) {
  const errors = {};

  if (!item.name?.trim()) {
    errors.name = "Certification name is required.";
  }

  if (!item.issuingBody?.trim()) {
    errors.issuingBody = "Issuing body is required.";
  }

  if (!item.issuedMonth) {
    errors.issuedMonth = "Issued month is required.";
  }

  if (!item.issuedYear) {
    errors.issuedYear = "Issued year is required.";
  }

  if (item.link?.trim() && !isValidUrl(item.link)) {
    errors.link =
      "Enter a valid credential URL starting with http:// or https://";
  }

  if (!item.description?.trim()) {
    errors.description = "Description is required.";
  } else if (item.description.trim().length < 10) {
    errors.description = "Add a little more detail in the description.";
  } else if (item.description.trim().length > 500) {
    errors.description = "Description is too long for a 1-page resume (limit: 500 chars).";
  }

  return errors;
}

function sortCertificationsChronologically(items) {
  return [...items].sort((a, b) => {
    const aYear = Number(a.issuedYear) || 0;
    const bYear = Number(b.issuedYear) || 0;

    if (bYear !== aYear) {
      return bYear - aYear;
    }

    const aMonth = getMonthNumber(a.issuedMonth);
    const bMonth = getMonthNumber(b.issuedMonth);

    return bMonth - aMonth;
  });
}

function CertificationsForm({ value, setResumeData, onOpenAIModal }) {
  const [touched, setTouched] = useState(false);
  const [certificationErrors, setCertificationErrors] = useState([]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const certifications = normalizeCertifications(value);

  useEffect(() => {
    const allErrors = certifications.map((item) => validateCertification(item));
    setCertificationErrors(allErrors);
  }, [value]);

  const saveCertifications = (items) => {
    const normalizedItems = normalizeCertifications(items);
    const sortedItems = sortCertificationsChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      certifications: sortedItems,
    }));
  };

  const updateCertification = (clientKey, field, fieldValue) => {
    const updatedItems = certifications.map((item) =>
      item.clientKey === clientKey
        ? {
            ...item,
            [field]: fieldValue,
          }
        : item
    );

    saveCertifications(updatedItems);
  };

  const addCertification = () => {
    const updatedItems = [...certifications, createEmptyCertificationItem()];
    saveCertifications(updatedItems);
    setTouched(true);
  };

  const removeCertification = (clientKey) => {
    const updatedItems = certifications.filter(
      (item) => item.clientKey !== clientKey
    );

    saveCertifications(updatedItems);
    setTouched(true);
  };

  const getFieldError = (index, field) => {
    if (!touched) return "";
    return certificationErrors[index]?.[field] || "";
  };

  const totalErrors = touched
    ? certificationErrors.reduce(
        (count, item) => count + Object.keys(item).length,
        0
      )
    : 0;

  const openCertificationAIModal = (index, item) => {
    if (!onOpenAIModal) return;

    onOpenAIModal("certifications", {
      index,
      clientKey: item?.clientKey,
      field: "description",
      item,
      initialData: {
        name: item?.name || "",
        issuingBody: item?.issuingBody || "",
        credentialId: item?.credentialId || "",
        skillsCovered: item?.description || "",
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
              Certifications
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
              Certifications & Courses
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add certifications, credentials, and important learning records
              that strengthen your profile and show continuous growth.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {certifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                <Award className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Certifications Added</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-500 leading-relaxed">
                Add certifications, credentials, or courses that strengthen your profile.
              </p>
              <button
                type="button"
                onClick={addCertification}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Your First Certification
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {certifications.map((item, index) => {
              const cardErrors = certificationErrors[index] || {};

              return (
                <div
                  key={item.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Certification {index + 1}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Add the credential exactly as you want it to appear on
                        the resume.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCertification(item.clientKey)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Remove certification ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Certification Name"
                      required
                      icon={<Award size={16} />}
                      error={getFieldError(index, "name")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.name || ""}
                        placeholder="e.g., Cloud Practitioner / Full-Stack Certificate"
                        onChange={(e) => {
                          updateCertification(item.clientKey, "name", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "name")
                        )}
                      />
                      <CharacterCounter current={item.name?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Issuing Body"
                      required
                      icon={<Building2 size={16} />}
                      error={getFieldError(index, "issuingBody")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={item.issuingBody || ""}
                        placeholder="e.g., Issuing organization name"
                        onChange={(e) => {
                          updateCertification(item.clientKey, "issuingBody", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "issuingBody")
                        )}
                      />
                      <CharacterCounter current={item.issuingBody?.length || 0} max={100} />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <CalendarDays size={16} />
                        </span>
                        <span>
                          Issued Date
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={item.issuedMonth || ""}
                          onChange={(e) => {
                            updateCertification(item.clientKey, "issuedMonth", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "issuedMonth")
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
                          value={item.issuedYear || ""}
                          onChange={(e) => {
                            updateCertification(item.clientKey, "issuedYear", e.target.value);
                            setTouched(true);
                          }}
                          className={getInputClassName(
                            !!getFieldError(index, "issuedYear")
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

                      {(getFieldError(index, "issuedMonth") ||
                        getFieldError(index, "issuedYear")) && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {getFieldError(index, "issuedMonth") ||
                            getFieldError(index, "issuedYear")}
                        </p>
                      )}
                    </div>

                    <FieldWrapper
                      label="Credential ID"
                      icon={<Hash size={16} />}
                      error={getFieldError(index, "credentialId")}
                    >
                      <input
                        type="text"
                        value={item.credentialId || ""}
                        placeholder="e.g., CERT-2024-XXXX"
                        onChange={(e) => {
                          updateCertification(item.clientKey, "credentialId", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(false)}
                      />
                    </FieldWrapper>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Credential URL"
                      icon={<LinkIcon size={16} />}
                      error={getFieldError(index, "link")}
                    >
                      <input
                        type="text"
                        value={item.link || ""}
                        placeholder="https://your-certificate-link.com"
                        onChange={(e) => {
                          updateCertification(item.clientKey, "link", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "link")
                        )}
                      />
                    </FieldWrapper>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-[var(--color-primary)]">
                          <BadgeCheck size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Tip
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Add the certificate link when available. It helps
                            recruiters verify your credential faster.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <BookOpen size={16} />
                        </span>
                        <span>
                          Description
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      {onOpenAIModal && (
                        <button
                          type="button"
                          onClick={() => openCertificationAIModal(index, item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                        >
                          <Sparkles size={15} />
                          Generate with AI
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      maxLength={500}
                      value={item.description || ""}
                      placeholder="Mention the tools, topics, or skills covered by this certification."
                      onChange={(e) => {
                        updateCertification(item.clientKey, "description", e.target.value);
                        setTouched(true);
                      }}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                        getFieldError(index, "description")
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
                      }`}
                    />
                    <div className="mt-1 flex justify-end">
                      <CharacterCounter current={item.description?.length || 0} max={500} />
                    </div>

                    {getFieldError(index, "description") ? (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {getFieldError(index, "description")}
                      </p>
                    ) : null}
                  </div>

                  {touched && Object.keys(cardErrors).length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-700">
                        Please complete this certification properly.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {certifications.length > 0 && (
              <button
                type="button"
                onClick={addCertification}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Certification
              </button>
            )}

            {touched && totalErrors > 0 && (
              <p className="text-sm font-medium text-red-600">
                {totalErrors} validation issue{totalErrors > 1 ? "s" : ""}{" "}
                remaining.
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
    <p className={`mt-1.5 text-right text-[11px] font-bold uppercase tracking-wider ${
      isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-slate-400"
    }`}>
      {current} / {max} <span className="ml-1 opacity-60">chars</span>
    </p>
  );
}

export default CertificationsForm;