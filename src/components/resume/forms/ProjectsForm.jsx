import React, { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  LayoutTemplate,
  Building2,
  Link as LinkIcon,
  CalendarDays,
  FileText,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { createEmptyProjectItem } from "../../../utils/resumeSchema";

const PROJECT_TYPE_OPTIONS = [
  "Academic",
  "Personal",
  "Freelance",
  "Internship",
  "Research",
  "Team Project",
  "Client Project",
  "Open Source",
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
  for (let year = currentYear + 3; year >= 2000; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function getMonthNumber(monthName) {
  return MONTH_OPTIONS.find((month) => month.value === monthName)?.number || 0;
}

function normalizeProjects(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => ({
      ...createEmptyProjectItem(),
      ...item,
      clientKey: item?.clientKey || createEmptyProjectItem().clientKey,
    }))
    .filter(Boolean);

  return normalized;
}

function isValidUrl(url) {
  if (!url?.trim()) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProject(project) {
  const errors = {};

  if (!project.title?.trim()) {
    errors.title = "Project title is required.";
  }

  if (!project.projectType?.trim()) {
    errors.projectType = "Project type is required.";
  }

  if (!project.organization?.trim()) {
    errors.organization = "Organization / source is required.";
  }

  if (!project.startMonth) {
    errors.startMonth = "Start month is required.";
  }

  if (!project.startYear) {
    errors.startYear = "Start year is required.";
  }

  if (!project.currentlyWorking) {
    if (!project.endMonth) {
      errors.endMonth = "End month is required.";
    }

    if (!project.endYear) {
      errors.endYear = "End year is required.";
    }
  }

  if (project.link?.trim() && !isValidUrl(project.link)) {
    errors.link = "Enter a valid project URL starting with http:// or https://";
  }

  if (!project.description?.trim()) {
    errors.description = "Project description is required.";
  } else if (project.description.trim().length < 30) {
    errors.description = "Description should be at least 30 characters.";
  } else if (project.description.trim().length > 600) {
    errors.description = "Description is too long for a 1-page ATS resume (limit: 600 chars).";
  }

  if (
    project.startMonth &&
    project.startYear &&
    !project.currentlyWorking &&
    project.endMonth &&
    project.endYear
  ) {
    const startYear = Number(project.startYear);
    const endYear = Number(project.endYear);
    const startMonth = getMonthNumber(project.startMonth);
    const endMonth = getMonthNumber(project.endMonth);

    if (
      endYear < startYear ||
      (endYear === startYear && endMonth < startMonth)
    ) {
      errors.dateRange = "End date must be after the start date.";
    }
  }

  return errors;
}

function sortProjectsChronologically(items) {
  return [...items].sort((a, b) => {
    const aCurrent = a.currentlyWorking ? 1 : 0;
    const bCurrent = b.currentlyWorking ? 1 : 0;

    if (bCurrent !== aCurrent) {
      return bCurrent - aCurrent;
    }

    const aEndYear = Number(a.endYear || a.startYear) || 0;
    const bEndYear = Number(b.endYear || b.startYear) || 0;
    if (bEndYear !== aEndYear) {
      return bEndYear - aEndYear;
    }

    const aEndMonth = getMonthNumber(a.endMonth || a.startMonth);
    const bEndMonth = getMonthNumber(b.endMonth || b.startMonth);
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

function ProjectsForm({ value, setResumeData, onOpenAIModal, showValidationErrors = false }) {
  const [touched, setTouched] = useState(false);
  const [projectErrors, setProjectErrors] = useState([]);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const projects = normalizeProjects(value);

  useEffect(() => {
    const allErrors = projects.map((project) => validateProject(project));
    setProjectErrors(allErrors);
  }, [value]);

  const saveProjects = (items) => {
    const normalizedItems = normalizeProjects(items);
    const sortedItems = sortProjectsChronologically(normalizedItems);

    setResumeData((prev) => ({
      ...prev,
      projects: sortedItems,
    }));
  };

  const updateProject = (clientKey, field, fieldValue) => {
    const updatedProjects = projects.map((project) => {
      if (project.clientKey !== clientKey) return project;

      const updatedProject = {
        ...project,
        [field]: fieldValue,
      };

      if (field === "currentlyWorking" && fieldValue) {
        updatedProject.endMonth = "";
        updatedProject.endYear = "";
      }

      return updatedProject;
    });

    saveProjects(updatedProjects);
  };

  const addProject = () => {
    const updatedProjects = [...projects, createEmptyProjectItem()];
    saveProjects(updatedProjects);
    setTouched(true);
  };

  const removeProject = (clientKey) => {
    const updatedProjects = projects.filter(
      (project) => project.clientKey !== clientKey
    );

    saveProjects(updatedProjects);
    setTouched(true);
  };

  const getFieldError = (index, field) => {
    if (!touched && !showValidationErrors) return "";
    return projectErrors[index]?.[field] || "";
  };
  const totalErrors = (touched || showValidationErrors)
    ? projectErrors.reduce((count, item) => count + Object.keys(item).length, 0)
    : 0;

  const openProjectAIModal = (index, project) => {
    if (!onOpenAIModal) return;

    onOpenAIModal("projects", {
      index,
      clientKey: project?.clientKey,
      field: "description",
      item: project,
      initialData: {
        title: project?.title || "",
        projectType: project?.projectType || "",
        organization: project?.organization || "",
        technologies: "",
        role: "",
        problemSolved: project?.description || "",
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
              Projects
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
              Project Details
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add strong projects that clearly show your skills, work, tools,
              and impact.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-all hover:bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                <FolderKanban className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Projects Added</h3>
              <p className="mt-2 max-w-[280px] text-sm text-slate-500 leading-relaxed">
                Add projects that highlight your practical skills and real-world impact.
              </p>
              <button
                type="button"
                onClick={addProject}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 shadow-md active:scale-95"
              >
                <Plus size={18} />
                Add Your First Project
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map((project, index) => {
              const cardErrors = projectErrors[index] || {};

              return (
                <div
                  key={project.clientKey}
                  className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        Project {index + 1}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Add the project exactly the way you want it to appear on
                        your resume.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProject(project.clientKey)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label={`Remove project ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrapper
                      label="Project Title"
                      required
                      icon={<FolderKanban size={16} />}
                      error={getFieldError(index, "title")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={project.title || ""}
                        placeholder="e.g., Your Project Title"
                        onChange={(e) => {
                          updateProject(project.clientKey, "title", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(!!getFieldError(index, "title"))}
                      />
                      <CharacterCounter current={project.title?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Project Type"
                      required
                      icon={<LayoutTemplate size={16} />}
                      error={getFieldError(index, "projectType")}
                    >
                      <select
                        value={project.projectType || ""}
                        onChange={(e) => {
                          updateProject(project.clientKey, "projectType", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "projectType")
                        )}
                      >
                        <option value="">Select project type</option>
                        {PROJECT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FieldWrapper>

                    <FieldWrapper
                      label="Organization / Source"
                      required
                      icon={<Building2 size={16} />}
                      error={getFieldError(index, "organization")}
                    >
                      <input
                        type="text"
                        maxLength={100}
                        value={project.organization || ""}
                        placeholder="e.g., College / Company / Personal"
                        onChange={(e) => {
                          updateProject(project.clientKey, "organization", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(
                          !!getFieldError(index, "organization")
                        )}
                      />
                      <CharacterCounter current={project.organization?.length || 0} max={100} />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Project Link"
                      icon={<LinkIcon size={16} />}
                      error={getFieldError(index, "link")}
                    >
                      <input
                        type="text"
                        value={project.link || ""}
                        placeholder="https://github.com/yourusername/project"
                        onChange={(e) => {
                          updateProject(project.clientKey, "link", e.target.value);
                          setTouched(true);
                        }}
                        className={getInputClassName(!!getFieldError(index, "link"))}
                      />
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
                          value={project.startMonth || ""}
                          onChange={(e) => {
                            updateProject(project.clientKey, "startMonth", e.target.value);
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
                          value={project.startYear || ""}
                          onChange={(e) => {
                            updateProject(project.clientKey, "startYear", e.target.value);
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
                          End Date
                          {!project.currentlyWorking ? (
                            <span className="ml-1 text-red-600">*</span>
                          ) : null}
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={project.endMonth || ""}
                          onChange={(e) => {
                            updateProject(project.clientKey, "endMonth", e.target.value);
                            setTouched(true);
                          }}
                          disabled={!!project.currentlyWorking}
                          className={getInputClassName(
                            !!getFieldError(index, "endMonth") ||
                              !!getFieldError(index, "dateRange"),
                            !!project.currentlyWorking
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
                          value={project.endYear || ""}
                          onChange={(e) => {
                            updateProject(project.clientKey, "endYear", e.target.value);
                            setTouched(true);
                          }}
                          disabled={!!project.currentlyWorking}
                          className={getInputClassName(
                            !!getFieldError(index, "endYear") ||
                              !!getFieldError(index, "dateRange"),
                            !!project.currentlyWorking
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

                  <div className="mt-5">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!project.currentlyWorking}
                        onChange={(e) => {
                          updateProject(
                            project.clientKey,
                            "currentlyWorking",
                            e.target.checked
                          );
                          setTouched(true);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      This project is currently ongoing
                    </label>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">
                          <FileText size={16} />
                        </span>
                        <span>
                          Project Description
                          <span className="ml-1 text-red-600">*</span>
                        </span>
                      </label>

                      {onOpenAIModal && (
                        <button
                          type="button"
                          onClick={() => openProjectAIModal(index, project)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[rgba(249,115,22,0.14)] sm:text-sm"
                        >
                          <Sparkles size={15} />
                          Generate with AI
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      maxLength={600}
                      value={project.description || ""}
                      placeholder="Explain the project, your role, tools used, what problem it solved, and the result or impact."
                      onChange={(e) => {
                        updateProject(project.clientKey, "description", e.target.value);
                        setTouched(true);
                      }}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                        getFieldError(index, "description")
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-[rgba(53,0,139,0.08)]"
                      }`}
                    />
                    <div className="mt-1 flex justify-end">
                      <CharacterCounter current={project.description?.length || 0} max={600} />
                    </div>

                    {getFieldError(index, "description") ? (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {getFieldError(index, "description")}
                      </p>
                    ) : null}
                  </div>

                  {(touched || showValidationErrors) && Object.keys(cardErrors).length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-700">
                        Please complete this project properly.
                      </p>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {projects.length > 0 && (
              <button
                type="button"
                onClick={addProject}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Another Project
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

export default ProjectsForm;