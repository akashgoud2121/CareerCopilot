import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const CUSTOM_CATEGORY_VALUE = "__custom__";

const SKILL_CATEGORIES = [
  "Programming",
  "Web Development",
  "Data Science",
  "AI / ML",
  "Cloud / DevOps",
  "Databases",
  "Tools / Platforms",
  "SoftwareTesting/QA",
  "Soft Skills",
];

const SKILL_SUGGESTIONS = {
  Programming: [
    "Python",
    "Java",
    "C",
    "C++",
    "JavaScript",
    "TypeScript",
    "SQL",
    "OOP",
  ],
  "Web Development": [
    "HTML",
    "CSS",
    "React",
    "Node.js",
    "Express.js",
    "Tailwind CSS",
    "REST APIs",
    "Responsive Design",
  ],
  "Data Science": [
    "Pandas",
    "NumPy",
    "Matplotlib",
    "EDA",
    "Data Analysis",
    "Statistics",
    "Feature Engineering",
    "Data Visualization",
  ],
  "AI / ML": [
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "Scikit-learn",
    "NLP",
    "Computer Vision",
    "Model Training",
  ],
  "Cloud / DevOps": [
    "AWS",
    "Azure",
    "Docker",
    "Kubernetes",
    "Jenkins",
    "Terraform",
    "CI/CD",
    "Linux",
  ],
  Databases: [
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Firebase",
    "Supabase",
    "Database Design",
  ],
  "Tools / Platforms": [
    "Git",
    "GitHub",
    "VS Code",
    "Postman",
    "Figma",
    "Google Colab",
    "Jupyter Notebook",
  ],
  "SoftwareTesting/QA": [
    "Manual Testing",
    "Automation Testing",
    "Selenium",
    "Jest / Vitest",
    "Cypress",
    "Unit Testing",
    "API Testing",
    "Bug Tracking (Jira)",
  ],
  "Soft Skills": [
    "Communication",
    "Problem Solving",
    "Teamwork",
    "Leadership",
    "Time Management",
    "Adaptability",
    "Presentation Skills",
  ],
};

const makeClientKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `ck_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const createEmptySkillRow = () => ({
  clientKey: makeClientKey(),
  category: "",
  customCategory: "",
  skills: [],
  customSkill: "",
});

function normalizeSkills(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized = value
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;

        return {
          clientKey: makeClientKey(),
          category: "",
          customCategory: "",
          skills: [trimmed],
          customSkill: "",
        };
      }

      if (item && typeof item === "object") {
        const rawCategory =
          typeof item.category === "string" ? item.category.trim() : "";

        const isKnownCategory = SKILL_CATEGORIES.includes(rawCategory);

        let normalizedSkills = [];

        if (Array.isArray(item.skills)) {
          normalizedSkills = item.skills
            .filter((skill) => typeof skill === "string")
            .map((skill) => skill.trim())
            .filter(Boolean);
        } else if (typeof item.skills === "string" && item.skills.trim() !== "") {
          normalizedSkills = item.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean);
        } else if (typeof item.skill === "string" && item.skill.trim() !== "") {
          normalizedSkills = [item.skill.trim()];
        }

        return {
          clientKey:
            typeof item.clientKey === "string" && item.clientKey.trim()
              ? item.clientKey
              : makeClientKey(),
          category: isKnownCategory
            ? rawCategory
            : rawCategory
              ? CUSTOM_CATEGORY_VALUE
              : "",
          customCategory: isKnownCategory ? "" : rawCategory,
          skills: normalizedSkills,
          customSkill: "",
        };
      }

      return null;
    })
    .filter(Boolean);

  return normalized;
}

function validateSkills(rows) {
  if (rows.length === 0) return "";

  const validRows = rows.filter((row) => {
    const effectiveCategory =
      row.category === CUSTOM_CATEGORY_VALUE
        ? row.customCategory.trim()
        : row.category.trim();

    const selectedSkills = row.skills.filter((skill) => skill.trim() !== "");

    return effectiveCategory && selectedSkills.length > 0;
  });

  if (validRows.length === 0) {
    return "Please complete your skill entries or remove empty ones.";
  }

  return "";
}

function SkillsForm({ value, setResumeData, showValidationErrors = false }) {
  const [rows, setRows] = useState(() => normalizeSkills(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) {
      setRows(normalizeSkills(value));
    }
  }, [value, touched]);

  const pushToParent = (updatedRows) => {
    const cleanedRows = updatedRows
      .map((row) => {
        const effectiveCategory =
          row.category === CUSTOM_CATEGORY_VALUE
            ? row.customCategory.trim()
            : row.category.trim();

        const cleanedSkills = Array.isArray(row.skills)
          ? row.skills
              .filter((skill) => typeof skill === "string")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : [];

        if (!effectiveCategory && cleanedSkills.length === 0) return null;

        return {
          clientKey: row.clientKey,
          category: effectiveCategory,
          skills: cleanedSkills,
        };
      })
      .filter(Boolean);

    setResumeData((prev) => ({
      ...prev,
      skills: cleanedRows,
    }));
  };

  const syncRows = (updatedRows, shouldPush = true) => {
    setRows(updatedRows);
    if (shouldPush) {
      pushToParent(updatedRows);
    }
  };

  const addSkillRow = () => {
    const updatedRows = [...rows, createEmptySkillRow()];
    syncRows(updatedRows, true);
    setTouched(true);
  };

  const removeSkillRow = (clientKey) => {
    const updatedRows = rows.filter((row) => row.clientKey !== clientKey);
    syncRows(updatedRows, true);
    setTouched(true);
  };

  const handleCategoryChange = (clientKey, category) => {
    const updatedRows = rows.map((row) =>
      row.clientKey === clientKey
        ? {
            ...row,
            category,
            customCategory:
              category === CUSTOM_CATEGORY_VALUE ? row.customCategory : "",
            skills: [],
            customSkill: "",
          }
        : row
    );

    syncRows(updatedRows, true);
    setTouched(true);
  };

  const handleCustomCategoryChange = (clientKey, customCategory) => {
    const updatedRows = rows.map((row) =>
      row.clientKey === clientKey
        ? {
            ...row,
            customCategory,
          }
        : row
    );

    syncRows(updatedRows, false);
    setTouched(true);
  };

  const handleCustomCategoryBlur = () => {
    pushToParent(rows);
  };

  const toggleSkill = (clientKey, skill) => {
    const updatedRows = rows.map((row) => {
      if (row.clientKey !== clientKey) return row;

      const exists = row.skills.includes(skill);

      return {
        ...row,
        skills: exists
          ? row.skills.filter((item) => item !== skill)
          : [...row.skills, skill],
      };
    });

    syncRows(updatedRows, true);
    setTouched(true);
  };

  const handleCustomSkillChange = (clientKey, newValue) => {
    const updatedRows = rows.map((row) =>
      row.clientKey === clientKey
        ? {
            ...row,
            customSkill: newValue,
          }
        : row
    );

    setRows(updatedRows);
  };

  const addCustomSkill = (clientKey) => {
    const updatedRows = rows.map((row) => {
      if (row.clientKey !== clientKey) return row;

      const trimmed = row.customSkill.trim();
      if (!trimmed) return row;

      const exists = row.skills.some(
        (skill) => skill.toLowerCase() === trimmed.toLowerCase()
      );

      if (exists) {
        return {
          ...row,
          customSkill: "",
        };
      }

      return {
        ...row,
        skills: [...row.skills, trimmed],
        customSkill: "",
      };
    });

    syncRows(updatedRows, true);
    setTouched(true);
  };

  const removeSelectedSkill = (clientKey, skillToRemove) => {
    const updatedRows = rows.map((row) =>
      row.clientKey === clientKey
        ? {
            ...row,
            skills: row.skills.filter((skill) => skill !== skillToRemove),
          }
        : row
    );

    syncRows(updatedRows, true);
    setTouched(true);
  };

  const handleCustomSkillKeyDown = (e, clientKey) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSkill(clientKey);
    }
  };

  const totalSelectedSkills = rows.reduce(
    (count, row) => count + row.skills.length,
    0
  );
  const error = (touched || showValidationErrors) ? validateSkills(rows) : "";

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Skills
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            Core Skills
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add category-wise skills so your profile stays clean and easy to read.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition-colors hover:bg-slate-50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Plus className="text-[var(--color-primary)]" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                No Skills Added Yet
              </h3>
              <p className="mt-2 max-w-[280px] leading-relaxed text-sm text-slate-500">
                Add your technical and soft skills to showcase your expertise.
              </p>
              <button
                type="button"
                onClick={addSkillRow}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition shadow-md hover:opacity-95 active:scale-95"
              >
                <Plus size={18} />
                Add Your First Skill
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {rows.map((row) => {
                  const effectiveCategory =
                    row.category === CUSTOM_CATEGORY_VALUE
                      ? row.customCategory.trim()
                      : row.category;

                  const suggestions =
                    row.category &&
                    row.category !== CUSTOM_CATEGORY_VALUE &&
                    SKILL_SUGGESTIONS[row.category]
                      ? SKILL_SUGGESTIONS[row.category]
                      : [];

                  return (
                    <div
                      key={row.clientKey}
                      className="rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6"
                    >
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-start">
                        <div>
                          <label
                            htmlFor={`category-${row.clientKey}`}
                            className="mb-2 block text-sm font-semibold text-slate-800"
                          >
                            Category
                            <span className="ml-1 text-red-600">*</span>
                          </label>

                          <select
                            id={`category-${row.clientKey}`}
                            value={row.category}
                            onChange={(e) =>
                              handleCategoryChange(row.clientKey, e.target.value)
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
                          >
                            <option value="">Select category</option>
                            {SKILL_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                            <option value={CUSTOM_CATEGORY_VALUE}>
                              Custom Category
                            </option>
                          </select>

                          {row.category === CUSTOM_CATEGORY_VALUE && (
                            <input
                              type="text"
                              value={row.customCategory}
                              onChange={(e) =>
                                handleCustomCategoryChange(row.clientKey, e.target.value)
                              }
                              onBlur={handleCustomCategoryBlur}
                              placeholder="Enter custom category"
                              className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
                            />
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-800">
                            Skills
                            <span className="ml-1 text-red-600">*</span>
                          </label>

                          {row.category ? (
                            <>
                              {suggestions.length > 0 ? (
                                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
                                  {suggestions.map((skill) => {
                                    const selected = row.skills.includes(skill);

                                    return (
                                      <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(row.clientKey, skill)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                          selected
                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/6 text-[var(--color-primary)]"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                      >
                                        {skill}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                                  Add custom skills for this category.
                                </div>
                              )}

                              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                <input
                                  type="text"
                                  value={row.customSkill}
                                  onChange={(e) =>
                                    handleCustomSkillChange(row.clientKey, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleCustomSkillKeyDown(e, row.clientKey)
                                  }
                                  placeholder="Add other skill"
                                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => addCustomSkill(row.clientKey)}
                                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--color-primary)] bg-white px-4 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/5"
                                >
                                  Add
                                </button>
                              </div>

                              {(effectiveCategory || row.skills.length > 0) && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {effectiveCategory || "Category"}
                                  </p>

                                  {row.skills.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {row.skills.map((skill) => (
                                        <span
                                          key={skill}
                                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                        >
                                          {skill}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeSelectedSkill(row.clientKey, skill)
                                            }
                                            className="text-slate-500 hover:text-red-500"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-sm text-slate-500">
                                      No skills selected yet.
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                              Select a category first to view or add skills.
                            </div>
                          )}
                        </div>

                        <div className="lg:pt-8">
                          <button
                            type="button"
                            onClick={() => removeSkillRow(row.clientKey)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-red-600 transition hover:bg-red-100"
                            aria-label="Remove skill row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={addSkillRow}
                  disabled={rows.length >= 12}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition shadow-sm ${
                    rows.length >= 12
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-[var(--color-primary)] text-white hover:opacity-95"
                  }`}
                >
                  <Plus size={16} />
                  Add Another Category
                </button>
                {rows.length >= 10 && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                    Recommended: Max 10 categories for 1-page fit
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">
                      Skills Summary
                    </label>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Review your skill categories before moving to the next section.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      totalSelectedSkills > 40 ? "text-red-500" : totalSelectedSkills > 30 ? "text-amber-500" : "text-slate-400"
                    }`}>
                      {totalSelectedSkills} / 40 <span className="ml-1 opacity-60">Total Skills</span>
                    </span>
                  </div>
                </div>

                {error ? (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    ⚠️ {error}
                  </p>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-slate-500 italic">
                    All good! Your skills are ready for the resume.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </section>
  );
}

export default SkillsForm;