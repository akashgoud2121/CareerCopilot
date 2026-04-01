export const RESUME_SECTIONS = [
  { key: "contact", label: "Contact", type: "single", aiEnabled: false },
  { key: "summary", label: "Summary", type: "single", aiEnabled: true },
  { key: "skills", label: "Skills", type: "list", aiEnabled: false },
  { key: "education", label: "Education", type: "list", aiEnabled: false },
  { key: "projects", label: "Projects", type: "list", aiEnabled: true },
  { key: "certifications", label: "Certifications", type: "list", aiEnabled: true },
  { key: "achievements", label: "Achievements", type: "list", aiEnabled: true },
  { key: "experience", label: "Experience", type: "list", aiEnabled: true },
];

export const SKILL_CATEGORY_SUGGESTIONS = {
  "Programming Languages": [
    "Python",
    "Java",
    "C++",
    "JavaScript",
    "TypeScript",
    "SQL",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
  ],
  "Frontend Frameworks & Libraries": [
    "React",
    "Next.js",
    "Vue.js",
    "Angular",
    "Svelte",
    "jQuery",
  ],
  "Styling & UI Libraries": [
    "Tailwind CSS",
    "Bootstrap",
    "Material-UI (MUI)",
    "Chakra UI",
    "Sass",
    "LESS",
  ],
  Other: [],
};

export const EDUCATION_CATEGORIES = [
  "Higher Education (University)",
  "Intermediate / Diploma",
  "Schooling",
  "Other",
];

export const PROJECT_TYPES = [
  "Major Project",
  "Minor Project",
  "Academic Project",
  "Personal Project",
  "Internship Project",
  "Freelance Project",
  "Open Source Project",
  "Other",
];

export const ACHIEVEMENT_CATEGORIES = [
  "Hackathon",
  "Competition",
  "Award",
  "Scholarship",
  "Leadership",
  "Volunteering",
  "Activity",
  "Other",
];

export const MONTH_OPTIONS = [
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

export const YEAR_OPTIONS = Array.from({ length: 21 }, (_, index) =>
  String(2015 + index)
);

export const makeClientKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `ck_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createEmptyContactData = () => ({
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  otherLinks: [{ label: "", url: "" }],
});

export const createEmptySummaryData = () => ({
  text: "",
});

export const createEmptySkillCategoryItem = () => ({
  clientKey: makeClientKey(),
  category: "Programming Languages",
  customCategory: "",
  skills: "",
});

export const createEmptyEducationItem = () => ({
  clientKey: makeClientKey(),
  category: "",
  institution: "",
  degreeMajor: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  cgpaOrPercentage: "",
  cityState: "",
});

export const createEmptyProjectItem = () => ({
  clientKey: makeClientKey(),
  title: "",
  link: "",
  projectType: "Major Project",
  organization: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  description: "",
  currentlyWorking: false,
});

export const createEmptyCertificationItem = () => ({
  clientKey: makeClientKey(),
  name: "",
  issuingBody: "",
  issuedMonth: "",
  issuedYear: "",
  credentialId: "",
  link: "",
  description: "",
  skillsCovered: "",
});

export const createEmptyAchievementItem = () => ({
  clientKey: makeClientKey(),
  category: "",
  title: "",
  organizerOrRank: "",
  month: "",
  year: "",
  link: "",
  description: "",
});

export const createEmptyExperienceItem = () => ({
  clientKey: makeClientKey(),
  role: "",
  company: "",
  employmentType: "",
  location: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  currentlyWorking: false,
  description: "",
});

export const createEmptyCustomSectionItem = () => ({
  clientKey: makeClientKey(),
  title: "",
  subtitle: "",
  month: "",
  year: "",
  description: "",
});

export const createEmptyResumeData = () => ({
  contact: createEmptyContactData(),

  summary: createEmptySummaryData(),

  skills: [createEmptySkillCategoryItem()],

  education: [createEmptyEducationItem()],

  projects: [createEmptyProjectItem()],

  certifications: [createEmptyCertificationItem()],

  achievements: [createEmptyAchievementItem()],

  experience: [createEmptyExperienceItem()],
});

export const getSectionHint = (sectionKey) => {
  const hints = {
    contact:
      "Add your basic details clearly so recruiters can contact you easily.",
    summary:
      "Write a short, strong summary that matches your current profile and goals.",
    skills:
      "Group your skills by category so the resume stays neat and easy to scan.",
    education:
      "Add your academic background in a clean chronological format.",
    projects:
      "Highlight your best projects with impact, technologies, and clarity.",
    certifications:
      "Include certifications that strengthen your student or fresher profile.",
    achievements:
      "Show recognitions, hackathons, rankings, or notable activities.",
    experience:
      "Add internships, freelance work, or professional experience if available.",
  };

  return hints[sectionKey] || "Fill this section clearly and keep it relevant.";
};

export const sortResumeItemsByDate = (items) => {
  if (!items || !Array.isArray(items)) return [];

  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const parseMonthYear = (month, year, isEnd = false) => {
    const y = parseInt(year, 10);
    if (!y) return isEnd ? 999999 : 0;

    if (!month) return y * 100 + (isEnd ? 12 : 1);

    const normalizedMonth = String(month).toLowerCase().trim();
    const m = monthMap[normalizedMonth] || 0;

    return y * 100 + m;
  };

  return [...items].sort((a, b) => {
    const endA =
      !a.endMonth && !a.endYear
        ? 999999
        : parseMonthYear(a.endMonth, a.endYear, true);

    const endB =
      !b.endMonth && !b.endYear
        ? 999999
        : parseMonthYear(b.endMonth, b.endYear, true);

    if (endA !== endB) return endB - endA;

    const startA = parseMonthYear(a.startMonth, a.startYear, false);
    const startB = parseMonthYear(b.startMonth, b.startYear, false);

    return startB - startA;
  });
};