import { supabase } from "./supabase";
import { createEmptyResumeData } from "../utils/resumeSchema";
import { upsertResumeReadModel, fetchResumeReadModelAsPayload } from "./resumeReadModelApi";


export const CUSTOM_SECTIONS_META_DIRTY_KEY = "__custom_sections_meta__";

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

const makeClientKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `ck_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const parseSkillString = (value) =>
  safeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const resumeSectionCache = new Map();
const inFlightSectionLoads = new Map();

const getResumeCacheEntry = (resumeId) => {
  if (!resumeSectionCache.has(resumeId)) {
    resumeSectionCache.set(resumeId, {
      sections: new Map(),
      customSectionsMeta: [],
      initializedAt: Date.now(),
    });
  }

  return resumeSectionCache.get(resumeId);
};

const setCachedSections = (resumeId, sectionData = {}) => {
  if (!resumeId || !sectionData || typeof sectionData !== "object") return;

  const cacheEntry = getResumeCacheEntry(resumeId);
  Object.entries(sectionData).forEach(([key, value]) => {
    cacheEntry.sections.set(key, cloneValue(value));
  });
};

const getCachedSection = (resumeId, sectionKey) => {
  if (!resumeId || !sectionKey) return null;

  const cacheEntry = getResumeCacheEntry(resumeId);
  if (!cacheEntry.sections.has(sectionKey)) return null;

  return {
    [sectionKey]: cloneValue(cacheEntry.sections.get(sectionKey)),
  };
};

const setCachedCustomSectionsMeta = (resumeId, customSections = []) => {
  if (!resumeId) return;
  const cacheEntry = getResumeCacheEntry(resumeId);
  cacheEntry.customSectionsMeta = cloneValue(
    getArray(customSections).map((section) => ({
      key: safeString(section.key),
      label: safeString(section.label),
    }))
  );
};

const getCachedCustomSectionsMeta = (resumeId) => {
  if (!resumeId) return [];
  const cacheEntry = getResumeCacheEntry(resumeId);
  return cloneValue(cacheEntry.customSectionsMeta || []);
};

const getInFlightKey = (resumeId, sectionKey) => `${resumeId}:${sectionKey}`;

export const clearResumeBuilderCache = (resumeId = null) => {
  if (resumeId) {
    resumeSectionCache.delete(resumeId);
    Array.from(inFlightSectionLoads.keys())
      .filter((key) => key.startsWith(`${resumeId}:`))
      .forEach((key) => inFlightSectionLoads.delete(key));
    return;
  }

  resumeSectionCache.clear();
  inFlightSectionLoads.clear();
};

const normalizeOtherLinks = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const url = safeString(item).trim();
        return url ? { label: "", url } : null;
      }

      if (item && typeof item === "object") {
        const label = safeString(item.label).trim();
        const url = safeString(item.url || item.link || item.value).trim();

        if (!label && !url) return null;

        return { label, url };
      }

      return null;
    })
    .filter(Boolean);
};

const normalizeContactData = (contact = {}) => ({
  fullName: safeString(contact?.fullName),
  email: safeString(contact?.email),
  phone: safeString(contact?.phone),
  location: safeString(contact?.location),
  linkedinUrl: safeString(contact?.linkedinUrl || contact?.linkedin),
  githubUrl: safeString(contact?.githubUrl || contact?.github),
  otherLinks: normalizeOtherLinks(contact?.otherLinks),
});

const normalizeEducationEntries = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        category: safeString(item.category).trim(),
        institution: safeString(item.institution).trim(),
        degreeMajor: safeString(item.degreeMajor).trim(),
        startMonth: safeString(item.startMonth).trim(),
        startYear: safeString(item.startYear).trim(),
        endMonth: safeString(item.endMonth).trim(),
        endYear: safeString(item.endYear).trim(),
        cgpaOrPercentage: safeString(item.cgpaOrPercentage).trim(),
        cityState: safeString(item.cityState).trim(),
      };

      const hasValue = Object.entries(entry).some(([key, val]) =>
        key === "clientKey" ? false : Boolean(val)
      );

      return hasValue ? entry : null;
    })
    .filter(Boolean);
};

const normalizeSkillGroups = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const category = safeString(item.category).trim();
      const customCategory = safeString(item.customCategory).trim();

      let skills = "";
      if (Array.isArray(item.skills)) {
        skills = item.skills
          .map((skill) => safeString(skill).trim())
          .filter(Boolean)
          .join(", ");
      } else {
        skills = safeString(item.skills).trim();
      }

      if (!category && !customCategory && !skills) return null;

      return {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        category,
        customCategory,
        skills,
      };
    })
    .filter(Boolean);
};

const normalizeProjectEntries = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        title: safeString(item.title).trim(),
        link: safeString(item.link).trim(),
        projectType: safeString(item.projectType).trim(),
        organization: safeString(item.organization).trim(),
        startMonth: safeString(item.startMonth).trim(),
        startYear: safeString(item.startYear).trim(),
        endMonth: safeString(item.endMonth).trim(),
        endYear: safeString(item.endYear).trim(),
        description: safeString(item.description).trim(),
        currentlyWorking: Boolean(item.currentlyWorking),
      };

      const hasValue = Object.entries(entry).some(([key, v]) =>
        key === "clientKey" ? false : typeof v === "boolean" ? v : Boolean(v)
      );

      return hasValue ? entry : null;
    })
    .filter(Boolean);
};

const normalizeExperienceEntries = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        role: safeString(item.role).trim(),
        company: safeString(item.company).trim(),
        employmentType: safeString(item.employmentType).trim(),
        location: safeString(item.location).trim(),
        startMonth: safeString(item.startMonth).trim(),
        startYear: safeString(item.startYear).trim(),
        endMonth: safeString(item.endMonth).trim(),
        endYear: safeString(item.endYear).trim(),
        currentlyWorking: Boolean(item.currentlyWorking),
        description: safeString(item.description).trim(),
      };

      const hasValue = Object.entries(entry).some(([key, v]) =>
        key === "clientKey" ? false : typeof v === "boolean" ? v : Boolean(v)
      );

      return hasValue ? entry : null;
    })
    .filter(Boolean);
};

const normalizeCertificationEntries = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        name: safeString(item.name).trim(),
        issuingBody: safeString(item.issuingBody).trim(),
        issuedMonth: safeString(item.issuedMonth).trim(),
        issuedYear: safeString(item.issuedYear).trim(),
        credentialId: safeString(item.credentialId).trim(),
        link: safeString(item.link).trim(),
        description: safeString(item.description).trim(),
        skillsCovered: safeString(item.skillsCovered).trim(),
      };

      const hasValue = Object.entries(entry).some(([key, v]) =>
        key === "clientKey" ? false : Boolean(v)
      );

      return hasValue ? entry : null;
    })
    .filter(Boolean);
};

const normalizeAchievementEntries = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = {
        clientKey: safeString(item.clientKey) || makeClientKey(),
        category: safeString(item.category).trim(),
        title: safeString(item.title).trim(),
        organizerOrRank: safeString(item.organizerOrRank).trim(),
        month: safeString(item.month).trim(),
        year: safeString(item.year).trim(),
        link: safeString(item.link).trim(),
        description: safeString(item.description).trim(),
      };

      const hasValue = Object.entries(entry).some(([key, v]) =>
        key === "clientKey" ? false : Boolean(v)
      );

      return hasValue ? entry : null;
    })
    .filter(Boolean);
};

export const ensureProfileAndResume = async (user) => {
  if (!user?.id) return null;

  const fullNameFromUser =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const { error: profileUpsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullNameFromUser,
    },
    { onConflict: "id" }
  );

  if (profileUpsertError) throw profileUpsertError;

  const { data: existingResume, error: resumeFetchError } = await supabase
    .from("resumes")
    .select("*, saved_jobs(company_name)")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (resumeFetchError) throw resumeFetchError;
  if (existingResume) return existingResume;

  const { data: insertedResume, error: resumeInsertError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      title: "My Resume",
      template_name: "classic",
      resume_status: "draft",
      is_primary: true,
    })
    .select("*, saved_jobs(company_name)")
    .single();

  if (resumeInsertError) {
    if (resumeInsertError.code === "23505") {
      const { data: retryResume, error: retryError } = await supabase
        .from("resumes")
        .select("*, saved_jobs(company_name)")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (retryError) throw retryError;
      if (retryResume) return retryResume;
    }

    throw resumeInsertError;
  }

  return insertedResume;
};

const loadResumeCoreSections = async (resumeId) => {
  if (!resumeId) return { contact: null, summary: null };

  const [
    { data: contactData, error: contactError },
    { data: summaryData, error: summaryError },
    { data: contactLinks, error: linksError },
  ] = await Promise.all([
    supabase
      .from("resume_contact")
      .select("*")
      .eq("resume_id", resumeId)
      .maybeSingle(),
    supabase
      .from("resume_summary")
      .select("*")
      .eq("resume_id", resumeId)
      .maybeSingle(),
    supabase
      .from("resume_contact_links")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (contactError) throw contactError;
  if (summaryError) throw summaryError;
  if (linksError) throw linksError;

  return {
    contact: contactData
      ? {
          fullName: safeString(contactData.full_name),
          email: safeString(contactData.email),
          phone: safeString(contactData.phone),
          location: safeString(contactData.location),
          linkedinUrl: safeString(contactData.linkedin_url),
          githubUrl: safeString(contactData.github_url),
          otherLinks: getArray(contactLinks).map((row) => ({
            label: safeString(row.label),
            url: safeString(row.url),
          })),
        }
      : null,
    summary: summaryData
      ? {
          text: safeString(summaryData.text),
        }
      : null,
  };
};

const cacheCoreSections = (resumeId, coreSections) => {
  setCachedSections(resumeId, {
    contact: normalizeContactData(coreSections?.contact || {}),
    summary: { text: safeString(coreSections?.summary?.text) },
  });
};

const mapEducationRow = (row) => ({
  clientKey: safeString(row.client_key) || makeClientKey(),
  category: safeString(row.category),
  institution: safeString(row.institution),
  degreeMajor: safeString(row.degree_major),
  startMonth: safeString(row.start_month),
  startYear: safeString(row.start_year),
  endMonth: safeString(row.end_month),
  endYear: safeString(row.end_year),
  cgpaOrPercentage: safeString(row.cgpa_or_percentage),
  cityState: safeString(row.city_state),
});

const mapProjectRow = (row) => ({
  clientKey: safeString(row.client_key) || makeClientKey(),
  title: safeString(row.title),
  link: safeString(row.link),
  projectType: safeString(row.project_type),
  organization: safeString(row.organization),
  startMonth: safeString(row.start_month),
  startYear: safeString(row.start_year),
  endMonth: safeString(row.end_month),
  endYear: safeString(row.end_year),
  currentlyWorking: Boolean(row.currently_working),
  description: safeString(row.description),
});

const mapCertificationRow = (row) => ({
  clientKey: safeString(row.client_key) || makeClientKey(),
  name: safeString(row.name),
  issuingBody: safeString(row.issuing_body),
  issuedMonth: safeString(row.issued_month),
  issuedYear: safeString(row.issued_year),
  credentialId: safeString(row.credential_id),
  link: safeString(row.link),
  description: safeString(row.description),
  skillsCovered: safeString(row.skills_covered),
});

const mapAchievementRow = (row) => ({
  clientKey: safeString(row.client_key) || makeClientKey(),
  category: safeString(row.category),
  title: safeString(row.title),
  organizerOrRank: safeString(row.organizer_or_rank),
  month: safeString(row.month),
  year: safeString(row.year),
  link: safeString(row.link),
  description: safeString(row.description),
});

const mapExperienceRow = (row) => ({
  clientKey: safeString(row.client_key) || makeClientKey(),
  role: safeString(row.role),
  company: safeString(row.company),
  employmentType: safeString(row.employment_type),
  location: safeString(row.location),
  startMonth: safeString(row.start_month),
  startYear: safeString(row.start_year),
  endMonth: safeString(row.end_month),
  endYear: safeString(row.end_year),
  currentlyWorking: Boolean(row.currently_working),
  description: safeString(row.description),
});

const loadListSection = async (tableName, resumeId, mapper) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("resume_id", resumeId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return getArray(data).map(mapper);
};

const loadSkillsSection = async (resumeId) => {
  const [
    { data: categories, error: categoriesError },
    { data: skills, error: skillsError },
  ] = await Promise.all([
    supabase
      .from("resume_skill_categories")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("resume_skill_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (categoriesError) throw categoriesError;
  if (skillsError) throw skillsError;

  const skillsByCategoryId = getArray(skills).reduce((acc, row) => {
    if (!acc[row.category_id]) acc[row.category_id] = [];
    acc[row.category_id].push(safeString(row.skill_name));
    return acc;
  }, {});

  return getArray(categories).map((categoryRow) => ({
    clientKey: safeString(categoryRow.client_key) || makeClientKey(),
    category: safeString(categoryRow.category),
    customCategory: safeString(categoryRow.custom_category),
    skills: getArray(skillsByCategoryId[categoryRow.id]).join(", "),
  }));
};

const loadCustomSections = async (resumeId, { includeContent = true } = {}) => {
  if (!resumeId) return [];

  const selectClause = includeContent ? "*" : "section_key, section_title";

  const { data, error } = await supabase
    .from("resume_custom_sections")
    .select(selectClause)
    .eq("resume_id", resumeId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return getArray(data).map((row) => ({
    key: safeString(row.section_key),
    label: safeString(row.section_title),
    ...(includeContent
      ? { content: Array.isArray(row.content_json) ? row.content_json : [] }
      : {}),
  }));
};

const loadCustomSectionContent = async (resumeId, sectionKey) => {
  const { data, error } = await supabase
    .from("resume_custom_sections")
    .select("content_json")
    .eq("resume_id", resumeId)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.content_json) ? data.content_json : [];
};

const repeatableSectionLoaders = {
  skills: async (resumeId) => loadSkillsSection(resumeId),
  education: async (resumeId) =>
    loadListSection("resume_education_items", resumeId, mapEducationRow),
  projects: async (resumeId) =>
    loadListSection("resume_project_items", resumeId, mapProjectRow),
  certifications: async (resumeId) =>
    loadListSection("resume_certification_items", resumeId, mapCertificationRow),
  achievements: async (resumeId) =>
    loadListSection("resume_achievement_items", resumeId, mapAchievementRow),
  experience: async (resumeId) =>
    loadListSection("resume_experience_items", resumeId, mapExperienceRow),
};

const upsertSingleRow = async (tableName, payload) => {
  const { error } = await supabase.from(tableName).upsert(payload, {
    onConflict: "resume_id",
  });

  if (error) throw error;
};

const syncListTable = async ({ resumeId, tableName, items, mapItem }) => {
  if (!resumeId) throw new Error("Resume ID is missing");

  const normalizedItems = Array.isArray(items) ? items : [];

  const rows = normalizedItems
    .map((item, index) => ({
      resume_id: resumeId,
      client_key: safeString(item.clientKey) || makeClientKey(),
      sort_order: index + 1,
      ...mapItem(item),
    }))
    .filter((row) =>
      Object.entries(row).some(([key, value]) => {
        if (["resume_id", "client_key", "sort_order"].includes(key)) return false;
        return typeof value === "boolean" ? value : safeString(value).trim() !== "";
      })
    );

  const incomingKeys = rows.map((row) => row.client_key);

  if (rows.length > 0) {
    // 1. Core Upsert - Single Network Request
    const { error: upsertError } = await supabase.from(tableName).upsert(rows, {
      onConflict: "resume_id,client_key",
    });

    if (upsertError) throw upsertError;

    // 2. Deterministic Cleanup - Single Network Request without pre-read
    const excludeString = `(${incomingKeys.map(k => `"${k}"`).join(",")})`;
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq("resume_id", resumeId)
      .not("client_key", "in", excludeString);

    if (deleteError) throw deleteError;
  } else {
    // 3. Complete Wipe - Only fires if intentional empty state
    const { error: clearError } = await supabase
      .from(tableName)
      .delete()
      .eq("resume_id", resumeId);

    if (clearError) throw clearError;
  }
};

const saveContactSection = async ({ resumeId, resumeData }) => {
  const normalizedContact = normalizeContactData(resumeData.contact);

  await upsertSingleRow("resume_contact", {
    resume_id: resumeId,
    full_name: normalizedContact.fullName,
    email: normalizedContact.email,
    phone: normalizedContact.phone,
    location: normalizedContact.location,
    linkedin_url: normalizedContact.linkedinUrl,
    github_url: normalizedContact.githubUrl,
  });

  const { error: deleteLinksError } = await supabase
    .from("resume_contact_links")
    .delete()
    .eq("resume_id", resumeId);

  if (deleteLinksError) throw deleteLinksError;

  const validLinks = normalizeOtherLinks(normalizedContact.otherLinks)
    .map((item, index) => ({
      resume_id: resumeId,
      label: safeString(item.label).trim(),
      url: safeString(item.url).trim(),
      sort_order: index + 1,
    }))
    .filter((item) => item.url);

  if (validLinks.length > 0) {
    const { error: insertLinksError } = await supabase
      .from("resume_contact_links")
      .insert(validLinks);

    if (insertLinksError) throw insertLinksError;
  }
};

const saveSummarySection = async ({ resumeId, resumeData }) => {
  await upsertSingleRow("resume_summary", {
    resume_id: resumeId,
    text: safeString(resumeData?.summary?.text),
  });
};

const saveEducationSection = async ({ resumeId, resumeData }) => {
  await syncListTable({
    resumeId,
    tableName: "resume_education_items",
    items: normalizeEducationEntries(resumeData.education),
    mapItem: (item) => ({
      category: safeString(item.category).trim(),
      institution: safeString(item.institution).trim(),
      degree_major: safeString(item.degreeMajor).trim(),
      start_month: safeString(item.startMonth).trim(),
      start_year: safeString(item.startYear).trim(),
      end_month: safeString(item.endMonth).trim(),
      end_year: safeString(item.endYear).trim(),
      cgpa_or_percentage: safeString(item.cgpaOrPercentage).trim(),
      city_state: safeString(item.cityState).trim(),
    }),
  });
};

const saveExperienceSection = async ({ resumeId, resumeData }) => {
  await syncListTable({
    resumeId,
    tableName: "resume_experience_items",
    items: normalizeExperienceEntries(resumeData.experience),
    mapItem: (item) => ({
      role: safeString(item.role).trim(),
      company: safeString(item.company).trim(),
      employment_type: safeString(item.employmentType).trim(),
      location: safeString(item.location).trim(),
      start_month: safeString(item.startMonth).trim(),
      start_year: safeString(item.startYear).trim(),
      end_month: safeString(item.endMonth).trim(),
      end_year: safeString(item.endYear).trim(),
      currently_working: Boolean(item.currentlyWorking),
      description: safeString(item.description).trim(),
    }),
  });
};

const saveProjectsSection = async ({ resumeId, resumeData }) => {
  await syncListTable({
    resumeId,
    tableName: "resume_project_items",
    items: normalizeProjectEntries(resumeData.projects),
    mapItem: (item) => ({
      title: safeString(item.title).trim(),
      link: safeString(item.link).trim(),
      project_type: safeString(item.projectType).trim(),
      organization: safeString(item.organization).trim(),
      start_month: safeString(item.startMonth).trim(),
      start_year: safeString(item.startYear).trim(),
      end_month: safeString(item.endMonth).trim(),
      end_year: safeString(item.endYear).trim(),
      currently_working: Boolean(item.currentlyWorking),
      description: safeString(item.description).trim(),
    }),
  });
};

const saveSkillsSection = async ({ resumeId, resumeData }) => {
  const normalizedSkillGroups = normalizeSkillGroups(resumeData.skills).filter(
    (item) => item.category || item.customCategory || parseSkillString(item.skills).length > 0
  );

  // Still need to delete current items because we are re-inserting them based on re-calculated category IDs
  const { error: deleteSkillItemsError } = await supabase
    .from("resume_skill_items")
    .delete()
    .eq("resume_id", resumeId);

  if (deleteSkillItemsError) throw deleteSkillItemsError;

  const categoryRows = normalizedSkillGroups.map((item, index) => ({
    resume_id: resumeId,
    client_key: safeString(item.clientKey) || makeClientKey(),
    category: safeString(item.category || (item.customCategory ? "Custom" : "")).trim(),
    custom_category: safeString(item.customCategory).trim(),
    sort_order: index + 1,
  }));

  const incomingKeys = categoryRows.map((row) => row.client_key);

  if (categoryRows.length > 0) {
    // 1. Upsert categories
    const { data: savedCategories, error: upsertCategoriesError } = await supabase
      .from("resume_skill_categories")
      .upsert(categoryRows, { onConflict: "resume_id,client_key" })
      .select("id, client_key");

    if (upsertCategoriesError) throw upsertCategoriesError;

    // 2. Zero-read delete orphaned categories
    const excludeString = `(${incomingKeys.map(k => `"${k}"`).join(",")})`;
    const { error: deleteCategoriesError } = await supabase
      .from("resume_skill_categories")
      .delete()
      .eq("resume_id", resumeId)
      .not("client_key", "in", excludeString);

    if (deleteCategoriesError) throw deleteCategoriesError;

    const categoryIdMap = new Map(
      getArray(savedCategories).map((row) => [row.client_key, row.id])
    );

    const skillRows = normalizedSkillGroups.flatMap((item) => {
      const categoryId = categoryIdMap.get(item.clientKey);
      if (!categoryId) return [];

      return parseSkillString(item.skills).map((skillName, skillIndex) => ({
        resume_id: resumeId,
        category_id: categoryId,
        skill_name: skillName,
        sort_order: skillIndex + 1,
      }));
    });

    if (skillRows.length > 0) {
      const { error: insertSkillItemsError } = await supabase
        .from("resume_skill_items")
        .insert(skillRows);

      if (insertSkillItemsError) throw insertSkillItemsError;
    }
  } else {
    // 3. Complete Wipe of categories
    const { error: clearCategoriesError } = await supabase
      .from("resume_skill_categories")
      .delete()
      .eq("resume_id", resumeId);

    if (clearCategoriesError) throw clearCategoriesError;
  }
};

const saveCertificationsSection = async ({ resumeId, resumeData }) => {
  await syncListTable({
    resumeId,
    tableName: "resume_certification_items",
    items: normalizeCertificationEntries(resumeData.certifications),
    mapItem: (item) => ({
      name: safeString(item.name).trim(),
      issuing_body: safeString(item.issuingBody).trim(),
      issued_month: safeString(item.issuedMonth).trim(),
      issued_year: safeString(item.issuedYear).trim(),
      credential_id: safeString(item.credentialId).trim(),
      link: safeString(item.link).trim(),
      description: safeString(item.description).trim(),
      skills_covered: safeString(item.skillsCovered).trim(),
    }),
  });
};

const saveAchievementsSection = async ({ resumeId, resumeData }) => {
  await syncListTable({
    resumeId,
    tableName: "resume_achievement_items",
    items: normalizeAchievementEntries(resumeData.achievements),
    mapItem: (item) => ({
      category: safeString(item.category).trim(),
      title: safeString(item.title).trim(),
      organizer_or_rank: safeString(item.organizerOrRank).trim(),
      month: safeString(item.month).trim(),
      year: safeString(item.year).trim(),
      link: safeString(item.link).trim(),
      description: safeString(item.description).trim(),
    }),
  });
};

const saveCustomSectionsToSupabase = async ({
  resumeId,
  customSections,
  resumeData,
}) => {
  const rows = customSections.map((section, index) => {
    const row = {
      resume_id: resumeId,
      section_key: safeString(section.key),
      section_title: safeString(section.label),
      sort_order: index + 1,
    };

    // Only include content_json if it actually exists in the local state.
    // This prevents wiping out database data with an empty array if the section hasn't loaded yet.
    if (Object.prototype.hasOwnProperty.call(resumeData, section.key)) {
      row.content_json = Array.isArray(resumeData[section.key])
        ? resumeData[section.key]
        : [];
    }

    return row;
  });

  const incomingKeys = rows.map((row) => row.section_key);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("resume_custom_sections")
      .upsert(rows, { onConflict: "resume_id,section_key" });

    if (upsertError) throw upsertError;

    // Zero-read delete orphaned custom sections
    const excludeString = `(${incomingKeys.map(k => `"${k}"`).join(",")})`;
    const { error: deleteError } = await supabase
      .from("resume_custom_sections")
      .delete()
      .eq("resume_id", resumeId)
      .not("section_key", "in", excludeString);

    if (deleteError) throw deleteError;
  } else {
    const { error: clearError } = await supabase
      .from("resume_custom_sections")
      .delete()
      .eq("resume_id", resumeId);

    if (clearError) throw clearError;
  }
};


const buildInitializedResumePayload = ({
  resumeId,
  userId,
  emptyResume,
  coreSections,
  repeatableSectionMap = {},
  customSections = [],
  includeCustomContent = false,
}) => {
  const finalCustomSections = getArray(customSections).map(({ key, label }) => ({
    key,
    label,
  }));

  const customSectionSeeds = finalCustomSections.reduce((acc, section) => {
    if (includeCustomContent) {
      acc[section.key] = getArray(
        customSections.find((item) => item.key === section.key)?.content
      );
    }
    return acc;
  }, {});

  const loadedSectionKeys = [
    "contact",
    "summary",
    ...Object.keys(repeatableSectionMap),
    ...(includeCustomContent
      ? finalCustomSections.map((section) => section.key)
      : []),
  ];

  setCachedCustomSectionsMeta(resumeId, finalCustomSections);
  cacheCoreSections(resumeId, coreSections);

  const sectionCachePayload = {
    ...repeatableSectionMap,
    ...customSectionSeeds,
  };
  setCachedSections(resumeId, sectionCachePayload);

  return {
    resumeId,
    userId,
    customSections: finalCustomSections,
    loadedSectionKeys,
    resumeData: {
      ...emptyResume,
      ...customSectionSeeds,
      contact: {
        ...emptyResume.contact,
        ...normalizeContactData(coreSections?.contact || {}),
      },
      summary: {
        ...emptyResume.summary,
        ...(coreSections?.summary
          ? { text: safeString(coreSections.summary.text) }
          : {}),
      },
      skills: repeatableSectionMap.skills || emptyResume.skills,
      education: repeatableSectionMap.education || emptyResume.education,
      projects: repeatableSectionMap.projects || emptyResume.projects,
      certifications:
        repeatableSectionMap.certifications || emptyResume.certifications,
      achievements:
        repeatableSectionMap.achievements || emptyResume.achievements,
      experience: repeatableSectionMap.experience || emptyResume.experience,
    },
  };
};



export const initializeResumeBuilder = async (user, { lazy = true, resumeId = null } = {}) => {
  const userId = user?.id;
  
  let targetResumeRow = null;
  if (!resumeId) {
    targetResumeRow = await ensureProfileAndResume(user);
  } else {
    const { data: checkResume } = await supabase
      .from("resumes")
      .select("*, saved_jobs(company_name)")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!checkResume) {
      targetResumeRow = await ensureProfileAndResume(user);
    } else {
      targetResumeRow = checkResume;
    }
  }
  
  const primaryResumeId = targetResumeRow.id;
  const templateName = targetResumeRow.template_name || "classic";
  const targetCompany = targetResumeRow.saved_jobs?.company_name || "";
  const emptyResume = createEmptyResumeData();

  // HIGH-PERFORMANCE READ-MODEL HYDRATION
  // Bypass all fragmented queries if a compiled read-model exists
  const readModelPayload = await fetchResumeReadModelAsPayload(primaryResumeId);
  const readModelHydration = readModelPayload?.resumeData;
  
  if (readModelHydration && (readModelHydration.contact || readModelHydration.summary)) {
    // 1. Warm the Local Caches immediately with the parsed payload
    setCachedSections(primaryResumeId, readModelHydration);
    
    const normalizedCustomMeta = Array.isArray(readModelHydration.customSections) 
      ? readModelHydration.customSections.map(c => ({ key: c.key, label: c.label }))
      : [];
      
    setCachedCustomSectionsMeta(primaryResumeId, normalizedCustomMeta);

    const loadedKeys = [
      'contact',
      'summary',
      'skills',
      'experience',
      'education',
      'projects',
      'certifications',
      'achievements',
      ...normalizedCustomMeta.map(c => c.key)
    ];

    const mergedData = { ...emptyResume, ...readModelHydration };

    return {
      resumeId: primaryResumeId,
      userId,
      customSections: normalizedCustomMeta,
      loadedSectionKeys: loadedKeys,
      resumeData: mergedData,
      version: readModelPayload?.version,
      hash: getResumeContentHash(readModelHydration, normalizedCustomMeta),
      templateName,
      targetCompany,
    };
  }

  // FALLBACK: If read-model is entirely missing, fetch all fragmented tables immediately
  const [coreSections, repeatableSections, customSections] = await Promise.all([
    loadResumeCoreSections(primaryResumeId),
    Promise.all(
      Object.entries(repeatableSectionLoaders).map(async ([key, loader]) => [
        key,
        await loader(primaryResumeId),
      ])
    ),
    loadCustomSections(primaryResumeId, { includeContent: true }),
  ]);

  const repeatableSectionMap = Object.fromEntries(repeatableSections);
  const normalizedCustomMeta = customSections.map(c => ({ key: c.key, label: c.label }));
  
  // Set caches
  setCachedCustomSectionsMeta(primaryResumeId, normalizedCustomMeta);
  setCachedSections(primaryResumeId, { ...coreSections, ...repeatableSectionMap });

  const payload = buildInitializedResumePayload({
    resumeId: primaryResumeId,
    userId,
    emptyResume,
    coreSections,
    repeatableSectionMap,
    customSections,
    includeCustomContent: true,
  });
  
  // Force loaded keys to contain all sections so ensureSectionLoaded becomes a no-op
  payload.loadedSectionKeys = [
    'contact',
    'summary',
    'skills',
    'experience',
    'education',
    'projects',
    'certifications',
    'achievements',
    ...normalizedCustomMeta.map(c => c.key)
  ];

  return {
    ...payload,
    templateName,
    targetCompany,
  };
};

const loadSectionFresh = async ({ sectionKey, resumeId }) => {
  if (sectionKey === "contact") {
    const core = await loadResumeCoreSections(resumeId);
    const payload = { contact: normalizeContactData(core?.contact || {}) };
    setCachedSections(resumeId, payload);
    return payload;
  }

  if (sectionKey === "summary") {
    const core = await loadResumeCoreSections(resumeId);
    const payload = { summary: { text: safeString(core?.summary?.text) } };
    setCachedSections(resumeId, payload);
    return payload;
  }

  if (repeatableSectionLoaders[sectionKey]) {
    const payload = { [sectionKey]: await repeatableSectionLoaders[sectionKey](resumeId) };
    setCachedSections(resumeId, payload);
    return payload;
  }

  if (typeof sectionKey === "string" && sectionKey.startsWith("custom_")) {
    const payload = { [sectionKey]: await loadCustomSectionContent(resumeId, sectionKey) };
    setCachedSections(resumeId, payload);
    return payload;
  }

  return {};
};

export const loadResumeSectionByKey = async ({ sectionKey, resumeId, force = false }) => {
  if (!resumeId || !sectionKey || sectionKey === "review") return {};

  if (!force) {
    const cached = getCachedSection(resumeId, sectionKey);
    if (cached) return cached;
  }

  const inFlightKey = getInFlightKey(resumeId, sectionKey);
  if (inFlightSectionLoads.has(inFlightKey)) {
    return inFlightSectionLoads.get(inFlightKey);
  }

  const loadPromise = loadSectionFresh({ sectionKey, resumeId }).finally(() => {
    inFlightSectionLoads.delete(inFlightKey);
  });

  inFlightSectionLoads.set(inFlightKey, loadPromise);
  return loadPromise;
};

export const loadResumeSectionsByKeys = async ({
  sectionKeys,
  resumeId,
  force = false,
}) => {
  const uniqueKeys = Array.from(
    new Set((Array.isArray(sectionKeys) ? sectionKeys : []).filter(Boolean))
  ).filter((sectionKey) => sectionKey !== "review");

  if (!resumeId || uniqueKeys.length === 0) return {};

  const entries = await Promise.all(
    uniqueKeys.map(async (sectionKey) =>
      loadResumeSectionByKey({ sectionKey, resumeId, force })
    )
  );

  return entries.reduce(
    (acc, sectionData) => ({
      ...acc,
      ...sectionData,
    }),
    {}
  );
};

const refreshCacheAfterSave = ({
  sectionKey,
  resumeId,
  userId,
  resumeData,
  customSections,
}) => {
  if (!resumeId) return;

  switch (sectionKey) {
    case "contact":
      setCachedSections(resumeId, {
        contact: normalizeContactData(resumeData.contact || {}),
      });
      break;
    case "summary":
      setCachedSections(resumeId, {
        summary: { text: safeString(resumeData?.summary?.text) },
      });
      break;
    case "skills":
      setCachedSections(resumeId, {
        skills: normalizeSkillGroups(resumeData.skills),
      });
      break;
    case "education":
      setCachedSections(resumeId, {
        education: normalizeEducationEntries(resumeData.education),
      });
      break;
    case "projects":
      setCachedSections(resumeId, {
        projects: normalizeProjectEntries(resumeData.projects),
      });
      break;
    case "certifications":
      setCachedSections(resumeId, {
        certifications: normalizeCertificationEntries(resumeData.certifications),
      });
      break;
    case "achievements":
      setCachedSections(resumeId, {
        achievements: normalizeAchievementEntries(resumeData.achievements),
      });
      break;
    case "experience":
      setCachedSections(resumeId, {
        experience: normalizeExperienceEntries(resumeData.experience),
      });
      break;
    case CUSTOM_SECTIONS_META_DIRTY_KEY:
    default:
      if (
        sectionKey === CUSTOM_SECTIONS_META_DIRTY_KEY ||
        (typeof sectionKey === "string" && sectionKey.startsWith("custom_"))
      ) {
        setCachedCustomSectionsMeta(resumeId, customSections || []);

        const customPayload = getArray(customSections).reduce((acc, section) => {
          acc[section.key] = Array.isArray(resumeData?.[section.key])
            ? resumeData[section.key]
            : [];
          return acc;
        }, {});

        setCachedSections(resumeId, customPayload);
      }
      break;
  }
};

const persistSectionByKey = async ({
  sectionKey,
  resumeId,
  userId,
  resumeData,
  customSections,
}) => {
  switch (sectionKey) {
    case "contact":
      await saveContactSection({ resumeId, resumeData });
      break;
    case "summary":
      await saveSummarySection({ resumeId, resumeData });
      break;
    case "skills":
      await saveSkillsSection({ resumeId, resumeData });
      break;
    case "education":
      await saveEducationSection({ resumeId, resumeData });
      break;
    case "projects":
      await saveProjectsSection({ resumeId, resumeData });
      break;
    case "certifications":
      await saveCertificationsSection({ resumeId, resumeData });
      break;
    case "achievements":
      await saveAchievementsSection({ resumeId, resumeData });
      break;
    case "experience":
      await saveExperienceSection({ resumeId, resumeData });
      break;
    case "review":
      break;
    case CUSTOM_SECTIONS_META_DIRTY_KEY:
      await saveCustomSectionsToSupabase({ resumeId, customSections, resumeData });
      break;
    default:
      if (typeof sectionKey === "string" && sectionKey.startsWith("custom_")) {
        await saveCustomSectionsToSupabase({ resumeId, customSections, resumeData });
      }
      break;
  }

  refreshCacheAfterSave({
    sectionKey,
    resumeId,
    userId,
    resumeData,
    customSections,
  });
};

export const saveResumeSectionByKey = async ({
  sectionKey,
  resumeId,
  userId,
  resumeData,
  customSections,
  regenerateReadModel = true, version = null,
}) => {
  await persistSectionByKey({
    sectionKey,
    resumeId,
    userId,
    resumeData,
    customSections,
  });

  if (regenerateReadModel) {
    return upsertResumeReadModel({
      resumeId,
      userId,
      resumeData,
      customSections,
    });
  }
  
  return { savedSectionKey: sectionKey };
};

export const saveResumeSectionsBatch = async ({
  sectionKeys,
  resumeId,
  userId,
  resumeData,
  customSections,
  regenerateReadModel = true,
  version = null,
}) => {
  const uniqueKeys = Array.from(
    new Set((Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys]).filter(Boolean))
  ).filter((sectionKey) => sectionKey !== "review");

  if (uniqueKeys.length === 0 && !regenerateReadModel) {
    return { savedSectionKeys: [] };
  }

  await Promise.all(
    uniqueKeys.map((sectionKey) =>
      persistSectionByKey({
        sectionKey,
        resumeId,
        userId,
        resumeData,
        customSections,
      })
    )
  );

  if (regenerateReadModel) {
    const result = await upsertResumeReadModel({
      resumeId,
      userId,
      resumeData,
      customSections,
      version,
    });
    
    return { 
      savedSectionKeys: uniqueKeys,
      version: result?.version,
      documentJson: result?.documentJson
    };
  }

  return { savedSectionKeys: uniqueKeys };
};

export const saveAllResumeSections = async ({
  resumeId,
  userId,
  resumeData,
  customSections,
}) => {
  const keys = [
    "contact",
    "summary",
    "skills",
    "education",
    "projects",
    "certifications",
    "achievements",
    "experience",
    CUSTOM_SECTIONS_META_DIRTY_KEY,
  ];

  return saveResumeSectionsBatch({
    sectionKeys: keys,
    resumeId,
    userId,
    resumeData,
    customSections,
    regenerateReadModel: true,
  });
};

/**
 * Regenerates the full document snapshot (Read Model) for a resume by fetching all fragmented data.
 * Used for "healing" the Dashboard for older resumes.
 */
export const regenerateResumeSnapshot = async (resumeId, userId) => {
  if (!resumeId || !userId) throw new Error("Missing resumeId or userId for snapshot regeneration");

  // 1. Fetch fragmented data
  const [core, customSections] = await Promise.all([
    loadResumeCoreSections(resumeId),
    loadCustomSections(resumeId, true)
  ]);

  const [skills, education, experience, projects, certifications, achievements] = await Promise.all([
    repeatableSectionLoaders.skills(resumeId),
    repeatableSectionLoaders.education(resumeId),
    repeatableSectionLoaders.experience(resumeId),
    repeatableSectionLoaders.projects(resumeId),
    repeatableSectionLoaders.certifications(resumeId),
    repeatableSectionLoaders.achievements(resumeId),
  ]);

  const fullResumeData = {
    ...core,
    skills,
    education,
    experience,
    projects,
    certifications,
    achievements
  };

  // 2. Build and save the read model
  const result = await upsertResumeReadModel({
    resumeId,
    userId,
    resumeData: fullResumeData,
    customSections
  });

  return result;
};

/**
 * Creates a deterministic, content-only hash of resume data for synchronization guards.
 * Strips out database metadata (IDs, timestamps) to prevent false-positive sync triggers.
 */
export const getResumeContentHash = (resumeData, customSections = []) => {
  if (!resumeData) return "";

  const normalizeEntry = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const { 
      id, user_id, resume_id, 
      created_at, updated_at, 
      display_order, ...clean 
    } = entry;
    
    return Object.fromEntries(
      Object.entries(clean).sort().map(([k, v]) => [
        k, 
        Array.isArray(v) ? v.map(normalizeEntry) : v
      ])
    );
  };

  const normalizeList = (list) => {
    if (!Array.isArray(list)) return [];
    return list
      .filter(Boolean)
      .map(normalizeEntry)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  };

  const snapshot = {
    contact: normalizeEntry(resumeData.contact),
    summary: normalizeEntry(resumeData.summary),
    template_name: resumeData.template_name || "classic",
    skills: normalizeList(resumeData.skills),
    education: normalizeList(resumeData.education),
    experience: normalizeList(resumeData.experience),
    projects: normalizeList(resumeData.projects),
    certifications: normalizeList(resumeData.certifications),
    achievements: normalizeList(resumeData.achievements),
    customSections: (customSections || []).map(normalizeEntry).sort((a, b) => (a.key || '').localeCompare(b.key || ''))
  };

  return JSON.stringify(snapshot);
};





