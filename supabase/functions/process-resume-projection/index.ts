import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const safeString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
};

const getArray = <T>(value: T[] | unknown): T[] => (Array.isArray(value) ? value : []);

const normalizeStringArray = (value: unknown) =>
  getArray(value as unknown[]).map((item) => safeString(item).trim()).filter(Boolean);

const flattenCustomSectionText = (value: unknown): string[] => {
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
    const obj = value as Record<string, unknown>;
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
      .map((key) => safeString(obj[key]).trim())
      .filter(Boolean);

    if (preferred.length > 0) return preferred;

    return Object.entries(obj)
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

const MONTH_ORDER: Record<string, number> = {
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
};

const getMonthRank = (month: unknown) => {
  const normalized = safeString(month).trim().toLowerCase();
  return MONTH_ORDER[normalized] ?? 0;
};

const getDateScore = (year: unknown, month: unknown) => {
  const yearNumber = Number.parseInt(safeString(year), 10);
  if (!Number.isFinite(yearNumber)) return 0;
  return yearNumber * 100 + getMonthRank(month);
};

const sortResumeItemsByDate = <T extends Record<string, unknown>>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aCurrent = Boolean(a.currentlyWorking);
    const bCurrent = Boolean(b.currentlyWorking);

    if (aCurrent && !bCurrent) return -1;
    if (!aCurrent && bCurrent) return 1;

    const aEnd = aCurrent
      ? Number.MAX_SAFE_INTEGER
      : getDateScore(a.endYear, a.endMonth);
    const bEnd = bCurrent
      ? Number.MAX_SAFE_INTEGER
      : getDateScore(b.endYear, b.endMonth);

    if (aEnd !== bEnd) return bEnd - aEnd;

    const aStart = getDateScore(a.startYear, a.startMonth);
    const bStart = getDateScore(b.startYear, b.startMonth);

    if (aStart !== bStart) return bStart - aStart;

    return 0;
  });
};

const buildReadModelFromRows = ({
  resumeId,
  userId,
  contactRow,
  summaryRow,
  contactLinks,
  skillCategories,
  skillItems,
  educationRows,
  projectRows,
  certificationRows,
  achievementRows,
  experienceRows,
  customSectionRows,
}: {
  resumeId: number;
  userId: string;
  contactRow: Record<string, unknown> | null;
  summaryRow: Record<string, unknown> | null;
  contactLinks: Record<string, unknown>[];
  skillCategories: Record<string, unknown>[];
  skillItems: Record<string, unknown>[];
  educationRows: Record<string, unknown>[];
  projectRows: Record<string, unknown>[];
  certificationRows: Record<string, unknown>[];
  achievementRows: Record<string, unknown>[];
  experienceRows: Record<string, unknown>[];
  customSectionRows: Record<string, unknown>[];
}) => {
  const skillsByCategoryId = getArray(skillItems).reduce<Record<string, string[]>>(
    (acc, row) => {
      const categoryId = safeString(row.category_id);
      if (!categoryId) return acc;
      if (!acc[categoryId]) acc[categoryId] = [];
      const skillName = safeString(row.skill_name).trim();
      if (skillName) acc[categoryId].push(skillName);
      return acc;
    },
    {}
  );

  const contact = {
    fullName: safeString(contactRow?.full_name).trim(),
    email: safeString(contactRow?.email).trim(),
    phone: safeString(contactRow?.phone).trim(),
    location: safeString(contactRow?.location).trim(),
    linkedinUrl: safeString(contactRow?.linkedin_url).trim(),
    githubUrl: safeString(contactRow?.github_url).trim(),
    otherLinks: getArray(contactLinks)
      .map((row) => ({
        label: safeString(row.label).trim(),
        url: safeString(row.url).trim(),
      }))
      .filter((item) => item.label || item.url),
  };

  const summary = {
    text: safeString(summaryRow?.text).trim(),
  };

  const skills = getArray(skillCategories)
    .map((row) => ({
      clientKey: safeString(row.client_key).trim(),
      category: safeString(row.category).trim(),
      customCategory: safeString(row.custom_category).trim(),
      skills: normalizeStringArray(skillsByCategoryId[safeString(row.id)] || []),
    }))
    .filter(
      (item) => item.category || item.customCategory || item.skills.length > 0
    );

  const education = sortResumeItemsByDate(
    getArray(educationRows)
      .map((row) => ({
        clientKey: safeString(row.client_key).trim(),
        category: safeString(row.category).trim(),
        institution: safeString(row.institution).trim(),
        degreeMajor: safeString(row.degree_major).trim(),
        startMonth: safeString(row.start_month).trim(),
        startYear: safeString(row.start_year).trim(),
        endMonth: safeString(row.end_month).trim(),
        endYear: safeString(row.end_year).trim(),
        cgpaOrPercentage: safeString(row.cgpa_or_percentage).trim(),
        cityState: safeString(row.city_state).trim(),
      }))
      .filter((item) =>
        Object.entries(item).some(([key, value]) => key !== "clientKey" && Boolean(value))
      )
  );

  const projects = sortResumeItemsByDate(
    getArray(projectRows)
      .map((row) => ({
        clientKey: safeString(row.client_key).trim(),
        title: safeString(row.title).trim(),
        link: safeString(row.link).trim(),
        projectType: safeString(row.project_type).trim(),
        organization: safeString(row.organization).trim(),
        startMonth: safeString(row.start_month).trim(),
        startYear: safeString(row.start_year).trim(),
        endMonth: safeString(row.end_month).trim(),
        endYear: safeString(row.end_year).trim(),
        currentlyWorking: Boolean(row.currently_working),
        description: safeString(row.description).trim(),
      }))
      .filter((item) =>
        Object.entries(item).some(([key, value]) =>
          key !== "clientKey"
            ? typeof value === "boolean"
              ? value
              : Boolean(value)
            : false
        )
      )
  );

  const experience = sortResumeItemsByDate(
    getArray(experienceRows)
      .map((row) => ({
        clientKey: safeString(row.client_key).trim(),
        role: safeString(row.role).trim(),
        company: safeString(row.company).trim(),
        employmentType: safeString(row.employment_type).trim(),
        location: safeString(row.location).trim(),
        startMonth: safeString(row.start_month).trim(),
        startYear: safeString(row.start_year).trim(),
        endMonth: safeString(row.end_month).trim(),
        endYear: safeString(row.end_year).trim(),
        currentlyWorking: Boolean(row.currently_working),
        description: safeString(row.description).trim(),
      }))
      .filter((item) =>
        Object.entries(item).some(([key, value]) =>
          key !== "clientKey"
            ? typeof value === "boolean"
              ? value
              : Boolean(value)
            : false
        )
      )
  );

  const certifications = getArray(certificationRows)
    .map((row) => ({
      clientKey: safeString(row.client_key).trim(),
      name: safeString(row.name).trim(),
      issuingBody: safeString(row.issuing_body).trim(),
      issuedMonth: safeString(row.issued_month).trim(),
      issuedYear: safeString(row.issued_year).trim(),
      credentialId: safeString(row.credential_id).trim(),
      link: safeString(row.link).trim(),
      description: safeString(row.description).trim(),
      skillsCovered: safeString(row.skills_covered).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(([key, value]) => key !== "clientKey" && Boolean(value))
    );

  const achievements = getArray(achievementRows)
    .map((row) => ({
      clientKey: safeString(row.client_key).trim(),
      category: safeString(row.category).trim(),
      title: safeString(row.title).trim(),
      organizerOrRank: safeString(row.organizer_or_rank).trim(),
      month: safeString(row.month).trim(),
      year: safeString(row.year).trim(),
      link: safeString(row.link).trim(),
      description: safeString(row.description).trim(),
    }))
    .filter((item) =>
      Object.entries(item).some(([key, value]) => key !== "clientKey" && Boolean(value))
    );

  const customSections = getArray(customSectionRows)
    .map((row) => {
      const content = Array.isArray(row.content_json) ? row.content_json : [];
      const key = safeString(row.section_key).trim();
      const label = safeString(row.section_title).trim();

      if (!key || !label) return null;

      return {
        key,
        label,
        content,
        textContent: flattenCustomSectionText(content).join("\n"),
      };
    })
    .filter(Boolean);

  return {
    resumeId,
    userId,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    contact,
    summary,
    skills,
    education,
    projects,
    experience,
    certifications,
    achievements,
    customSections,
  };
};

const loadResumeRows = async (admin: any, resumeId: number) => {
  const [
    { data: resumeRow, error: resumeError },
    { data: contactRow, error: contactError },
    { data: summaryRow, error: summaryError },
    { data: contactLinks, error: linksError },
    { data: skillCategories, error: skillCategoriesError },
    { data: skillItems, error: skillItemsError },
    { data: educationRows, error: educationError },
    { data: projectRows, error: projectError },
    { data: certificationRows, error: certificationError },
    { data: achievementRows, error: achievementError },
    { data: experienceRows, error: experienceError },
    { data: customSectionRows, error: customSectionsError },
  ] = await Promise.all([
    admin.from("resumes").select("id,user_id").eq("id", resumeId).maybeSingle(),
    admin.from("resume_contact").select("*").eq("resume_id", resumeId).maybeSingle(),
    admin.from("resume_summary").select("*").eq("resume_id", resumeId).maybeSingle(),
    admin
      .from("resume_contact_links")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_skill_categories")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_skill_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_education_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_project_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_certification_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_achievement_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_experience_items")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("resume_custom_sections")
      .select("*")
      .eq("resume_id", resumeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (resumeError) throw resumeError;
  if (!resumeRow) throw new Error(`Resume ${resumeId} not found`);
  if (contactError) throw contactError;
  if (summaryError) throw summaryError;
  if (linksError) throw linksError;
  if (skillCategoriesError) throw skillCategoriesError;
  if (skillItemsError) throw skillItemsError;
  if (educationError) throw educationError;
  if (projectError) throw projectError;
  if (certificationError) throw certificationError;
  if (achievementError) throw achievementError;
  if (experienceError) throw experienceError;
  if (customSectionsError) throw customSectionsError;

  return {
    resumeRow,
    contactRow,
    summaryRow,
    contactLinks: getArray(contactLinks),
    skillCategories: getArray(skillCategories),
    skillItems: getArray(skillItems),
    educationRows: getArray(educationRows),
    projectRows: getArray(projectRows),
    certificationRows: getArray(certificationRows),
    achievementRows: getArray(achievementRows),
    experienceRows: getArray(experienceRows),
    customSectionRows: getArray(customSectionRows),
  };
};

const claimQueuedJob = async (
  admin: any,
  job: Record<string, any>
) => {
  const id = Number(job.id);
  const attempts = Number(job.attempts ?? 0);

  const { data, error } = await admin
    .from("resume_projection_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      finished_at: null,
      error_message: null,
      attempts: attempts + 1,
    })
    .eq("id", id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

const getNextReadModelVersion = async (
  admin: any,
  resumeId: number
) => {
  const { data, error } = await admin
    .from("resume_full_documents")
    .select("version")
    .eq("resume_id", resumeId)
    .maybeSingle();

  if (error) throw error;

  const currentVersion = Number(data?.version ?? 0);
  if (!Number.isFinite(currentVersion) || currentVersion < 0) {
    return 1;
  }

  return currentVersion + 1;
};

const markJobCompleted = async (
  admin: any,
  jobId: number,
  projectedVersion: number
) => {
  const { error } = await admin
    .from("resume_projection_jobs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId);

  if (error) throw error;

  return {
    jobId,
    status: "completed",
    version: projectedVersion,
  };
};

const markJobFailed = async (
  admin: any,
  jobId: number,
  message: string
) => {
  await admin
    .from("resume_projection_jobs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: message,
    })
    .eq("id", jobId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = await req.json().catch(() => ({}));
    const requestedLimit = Number(payload?.limit ?? 2);
    const limit = Math.max(
      1,
      Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 2, 10)
    );

    const { data: queuedJobs, error: queuedJobsError } = await admin
      .from("resume_projection_jobs")
      .select("*")
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(limit);

    if (queuedJobsError) throw queuedJobsError;

    const results: Array<Record<string, unknown>> = [];

    for (const queuedJob of getArray(queuedJobs)) {
      const claimedJob = await claimQueuedJob(admin, queuedJob as any);
      if (!claimedJob) continue;

      try {
        const resumeId = Number(claimedJob.resume_id);
        if (!Number.isFinite(resumeId)) {
          throw new Error("Invalid resume_id on projection job");
        }

        const rows = await loadResumeRows(admin, resumeId);
        const userId = safeString(rows.resumeRow?.user_id).trim();

        if (!userId) {
          throw new Error(`Resume ${resumeId} is missing user_id`);
        }

        const documentJson = buildReadModelFromRows({
          resumeId,
          userId,
          contactRow: rows.contactRow,
          summaryRow: rows.summaryRow,
          contactLinks: rows.contactLinks,
          skillCategories: rows.skillCategories,
          skillItems: rows.skillItems,
          educationRows: rows.educationRows,
          projectRows: rows.projectRows,
          certificationRows: rows.certificationRows,
          achievementRows: rows.achievementRows,
          experienceRows: rows.experienceRows,
          customSectionRows: rows.customSectionRows,
        });

        const nextVersion = await getNextReadModelVersion(admin, resumeId);

        const { error: upsertError } = await admin
          .from("resume_full_documents")
          .upsert(
            {
              resume_id: resumeId,
              user_id: userId,
              document_json: documentJson,
              version: nextVersion,
            },
            { onConflict: "resume_id" }
          );

        if (upsertError) throw upsertError;

        const completion = await markJobCompleted(
          admin,
          Number(claimedJob.id),
          nextVersion
        );

        results.push({
          ...completion,
          resumeId,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : safeString(error) || "Unknown error";

        await markJobFailed(admin, Number(claimedJob.id), message);

        results.push({
          jobId: claimedJob.id,
          resumeId: claimedJob.resume_id,
          status: "failed",
          error: message,
        });
      }
    }

    return json({
      processed: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : safeString(error) || "Unknown error";

    return json({ error: message }, 500);
  }
});