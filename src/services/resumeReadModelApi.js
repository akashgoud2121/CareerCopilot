import { supabase } from "./supabase";
import { sortResumeItemsByDate } from "../utils/resumeSchema";

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
};

const getArray = (value) => (Array.isArray(value) ? value : []);

const cloneValue = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const normalizeStringArray = (value) =>
  getArray(value)
    .map((item) => safeString(item).trim())
    .filter(Boolean);

const flattenCustomSectionText = (value) => {
  if (value === null || value === undefined) return [];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const text = safeString(value).trim();
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenCustomSectionText);
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "title",
      "name",
      "role",
      "company",
      "organization",
      "institution",
      "label",
      "subtitle",
      "text",
      "description",
      "summary",
      "value",
      "link",
    ];

    const preferred = preferredKeys
      .map((key) => safeString(value?.[key]).trim())
      .filter(Boolean);

    if (preferred.length > 0) {
      return preferred;
    }

    return Object.entries(value)
      .filter(
        ([key]) =>
          ![
            "id",
            "clientKey",
            "resumeId",
            "sortOrder",
            "createdAt",
            "updatedAt",
            "__typename",
          ].includes(key)
      )
      .flatMap(([, nestedValue]) => flattenCustomSectionText(nestedValue));
  }

  return [];
};

const normalizeContact = (contact = {}) => ({
  fullName: safeString(contact.fullName).trim(),
  email: safeString(contact.email).trim(),
  phone: safeString(contact.phone).trim(),
  location: safeString(contact.location).trim(),
  linkedinUrl: safeString(contact.linkedinUrl).trim(),
  githubUrl: safeString(contact.githubUrl).trim(),
  otherLinks: getArray(contact.otherLinks)
    .map((item) => ({
      label: safeString(item?.label).trim(),
      url: safeString(item?.url).trim(),
    }))
    .filter((item) => item.label || item.url),
});

const normalizeSummary = (summary = {}) => ({
  text: safeString(summary.text).trim(),
});

const normalizeSkills = (skills = []) =>
  getArray(skills)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      category: safeString(item?.category).trim(),
      customCategory: safeString(item?.customCategory).trim(),
      skills: Array.isArray(item?.skills)
        ? normalizeStringArray(item.skills)
        : safeString(item?.skills)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    }))
    .filter(
      (item) => item.category || item.customCategory || item.skills.length > 0
    );

const normalizeEducation = (education = []) =>
  getArray(education)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      category: safeString(item?.category).trim(),
      institution: safeString(item?.institution).trim(),
      degreeMajor: safeString(item?.degreeMajor).trim(),
      startMonth: safeString(item?.startMonth).trim(),
      startYear: safeString(item?.startYear).trim(),
      endMonth: safeString(item?.endMonth).trim(),
      endYear: safeString(item?.endYear).trim(),
      cgpaOrPercentage: safeString(item?.cgpaOrPercentage).trim(),
      cityState: safeString(item?.cityState).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(
        ([key, value]) => key !== "clientKey" && Boolean(value)
      )
    );

const normalizeProjects = (projects = []) =>
  getArray(projects)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      title: safeString(item?.title).trim(),
      link: safeString(item?.link).trim(),
      projectType: safeString(item?.projectType).trim(),
      organization: safeString(item?.organization).trim(),
      startMonth: safeString(item?.startMonth).trim(),
      startYear: safeString(item?.startYear).trim(),
      endMonth: safeString(item?.endMonth).trim(),
      endYear: safeString(item?.endYear).trim(),
      currentlyWorking: Boolean(item?.currentlyWorking),
      description: safeString(item?.description).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(([key, value]) =>
        key !== "clientKey"
          ? typeof value === "boolean"
            ? value
            : Boolean(value)
          : false
      )
    );

const normalizeExperience = (experience = []) =>
  getArray(experience)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      role: safeString(item?.role).trim(),
      company: safeString(item?.company).trim(),
      employmentType: safeString(item?.employmentType).trim(),
      location: safeString(item?.location).trim(),
      startMonth: safeString(item?.startMonth).trim(),
      startYear: safeString(item?.startYear).trim(),
      endMonth: safeString(item?.endMonth).trim(),
      endYear: safeString(item?.endYear).trim(),
      currentlyWorking: Boolean(item?.currentlyWorking),
      description: safeString(item?.description).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(([key, value]) =>
        key !== "clientKey"
          ? typeof value === "boolean"
            ? value
            : Boolean(value)
          : false
      )
    );

const normalizeCertifications = (certifications = []) =>
  getArray(certifications)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      name: safeString(item?.name).trim(),
      issuingBody: safeString(item?.issuingBody).trim(),
      issuedMonth: safeString(item?.issuedMonth).trim(),
      issuedYear: safeString(item?.issuedYear).trim(),
      credentialId: safeString(item?.credentialId).trim(),
      link: safeString(item?.link).trim(),
      description: safeString(item?.description).trim(),
      skillsCovered: safeString(item?.skillsCovered).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(
        ([key, value]) => key !== "clientKey" && Boolean(value)
      )
    );

const normalizeAchievements = (achievements = []) =>
  getArray(achievements)
    .map((item) => ({
      clientKey: safeString(item?.clientKey).trim(),
      category: safeString(item?.category).trim(),
      title: safeString(item?.title).trim(),
      organizerOrRank: safeString(item?.organizerOrRank).trim(),
      month: safeString(item?.month).trim(),
      year: safeString(item?.year).trim(),
      link: safeString(item?.link).trim(),
      description: safeString(item?.description).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(
        ([key, value]) => key !== "clientKey" && Boolean(value)
      )
    );

const normalizeCustomSections = (customSections = [], resumeData = {}) =>
  getArray(customSections)
    .map((section) => {
      const key = safeString(section?.key).trim();
      const label = safeString(section?.label).trim();
      const content = cloneValue(getArray(resumeData?.[key]));
      const textContent = flattenCustomSectionText(content).join("\n");

      if (!key || !label) return null;
      if (!content.length && !textContent) return null;

      return {
        key,
        label,
        content,
        textContent,
      };
    })
    .filter(Boolean);

export const buildResumeReadModel = ({
  resumeId,
  userId,
  resumeData,
  customSections,
}) => ({
  resumeId,
  userId,
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  contact: normalizeContact(resumeData?.contact || {}),
  summary: normalizeSummary(resumeData?.summary || {}),
  skills: normalizeSkills(resumeData?.skills || []),
  education: sortResumeItemsByDate(normalizeEducation(resumeData?.education || [])),
  projects: sortResumeItemsByDate(normalizeProjects(resumeData?.projects || [])),
  experience: sortResumeItemsByDate(normalizeExperience(resumeData?.experience || [])),
  certifications: normalizeCertifications(resumeData?.certifications || []),
  achievements: normalizeAchievements(resumeData?.achievements || []),
  customSections: normalizeCustomSections(customSections || [], resumeData || {}),
});

export const readModelToResumeData = (documentJson = {}) => {
  const customSections = Array.isArray(documentJson?.customSections)
    ? documentJson.customSections
    : [];

  const customSectionContentMap = Object.fromEntries(
    customSections.map((section) => [
      String(section?.key || "").trim(),
      Array.isArray(section?.content) ? section.content : [],
    ])
  );

  return {
    contact: documentJson?.contact || {},
    summary: documentJson?.summary || {},
    skills: Array.isArray(documentJson?.skills) ? documentJson.skills : [],
    education: Array.isArray(documentJson?.education) ? documentJson.education : [],
    projects: Array.isArray(documentJson?.projects) ? documentJson.projects : [],
    experience: Array.isArray(documentJson?.experience) ? documentJson.experience : [],
    certifications: Array.isArray(documentJson?.certifications)
      ? documentJson.certifications
      : [],
    achievements: Array.isArray(documentJson?.achievements)
      ? documentJson.achievements
      : [],
    customSections,
    ...customSectionContentMap,
  };
};

// Simple in-memory cache to reduce database load during rapid navigation
const readModelCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export const seedResumeReadModelCache = (resumeId, readModelData) => {
  if (!resumeId || !readModelData) return;
  readModelCache.set(resumeId, {
    data: readModelData,
    timestamp: Date.now(),
  });
};

const inFlightFetchModel = new Map();

export const fetchResumeReadModel = async (resumeId, forceRefresh = false) => {
  if (!resumeId) throw new Error("resumeId is required");

  // Check cache unless forceRefresh is true
  if (!forceRefresh) {
    const cached = readModelCache.get(resumeId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  if (inFlightFetchModel.has(resumeId)) {
    return inFlightFetchModel.get(resumeId);
  }

  const fetchPromise = (async () => {
    const { data, error } = await supabase
      .from("resume_full_documents")
      .select("*")
      .eq("resume_id", resumeId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      readModelCache.set(resumeId, {
        data,
        timestamp: Date.now(),
      });
    }

    return data || null;
  })();

  inFlightFetchModel.set(resumeId, fetchPromise);
  fetchPromise.finally(() => inFlightFetchModel.delete(resumeId));

  return fetchPromise;
};

export const fetchResumeReadModelAsPayload = async (resumeId) => {
  const row = await fetchResumeReadModel(resumeId);
  if (!row?.document_json) return null;
  return {
    version: row.version,
    document_json: row.document_json,
    resumeData: readModelToResumeData(row.document_json)
  };
};

export const upsertResumeReadModel = async ({
  resumeId,
  userId,
  resumeData,
  customSections,
  version = null,
}) => {
  if (!resumeId) throw new Error("resumeId is required");
  if (!userId) throw new Error("userId is required");

  const documentJson = buildResumeReadModel({
    resumeId,
    userId,
    resumeData,
    customSections,
  });

  let nextVersion = version;

  if (nextVersion === null || nextVersion === undefined) {
    const existing = await fetchResumeReadModel(resumeId);
    const currentVersion = Number(existing?.version ?? 0);
    nextVersion = Number.isFinite(currentVersion) ? currentVersion + 1 : 1;
  }

  const { data, error } = await supabase
    .from("resume_full_documents")
    .upsert(
      {
        resume_id: resumeId,
        user_id: userId,
        document_json: documentJson,
        version: nextVersion,
      },
      { onConflict: "resume_id" }
    )
    .select("resume_id, version, document_json, updated_at")
    .single();

  if (error) throw error;

  return {
    version: data?.version ?? nextVersion,
    documentJson: data?.document_json ?? documentJson,
    updatedAt: data?.updated_at ?? null,
  };
};
