import { GoogleGenAI } from "@google/genai";

const AI_PROVIDERS = {
  GEMINI: "gemini",
  GROQ: "groq",
};

const STORAGE_KEYS = {
  PROVIDER: "career_copilot_ai_provider",
  GEMINI_KEY: "career_copilot_gemini_key",
  GROQ_KEY: "career_copilot_groq_key",
};

const GROQ_MODEL = "llama-3.1-8b-instant";

function getGeminiClient() {
  const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);

  if (!apiKey) {
    throw new Error("Gemini API key not found. Please connect Gemini in settings.");
  }

  return new GoogleGenAI({ apiKey });
}

function getGroqConfig() {
  const apiKey = localStorage.getItem(STORAGE_KEYS.GROQ_KEY);

  if (!apiKey) {
    throw new Error("Groq API key not found. Please connect Groq in settings.");
  }

  return { apiKey };
}

export function getAIProvider() {
  return localStorage.getItem(STORAGE_KEYS.PROVIDER) || AI_PROVIDERS.GEMINI;
}

function extractText(response) {
  return (
    response?.text ||
    response?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    ""
  ).trim();
}

function extractJSON(text) {
  if (!text) return null;
  
  // Remove possible markdown wrappers or AI chatter
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON parse failed. Text was:", text);
    return null;
  }
}

function cleanAIResponse(text) {
  if (!text) return "";
  
  // 1. Strip markdown wrappers entirely
  let cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");

  // 2. Aggressively strip "Chatty" preambles using multi-pass cleaning
  const patterns = [
    /^here (is|are|'s).*?[:\n]/im,
    /^(certainly|sure|absolutely|okay|i have|i've|i optimized|i have optimized).*?[:\n]/im,
    /^optimized (section|content|resume).*?[:\n]/im,
    /^below (is|are).*?[:\n]/im,
    /^the (following|result|updated).*?[:\n]/im,
    /^\s*result\s*[:\n]/im,
    /^"|"$|^'|'$/g, // Wrapping quotes
    /^\s*\*\s*/     // Leading asterisk lists if unnecessary
  ];

  patterns.forEach(p => {
    cleaned = cleaned.replace(p, "");
  });

  return cleaned.trim();
}

export async function runGeminiBasicTest() {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Reply with exactly this text only: GEMINI_OK",
  });

  return extractText(response);
}

export async function runGroqBasicTest(apiKey) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: "Reply with exactly this text only: GROQ_OK",
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Groq connection failed.");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

function interpretAIError(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  if (msg.includes("busy") || msg.includes("overloaded") || msg.includes("503") || msg.includes("unavailable")) {
    return "The AI Model is currently busy or overloaded. This is a server-side AI delay, not your fault. Please try again in 5 seconds.";
  }
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota") || msg.includes("exhausted")) {
    return "The AI engine has reached its temporary capacity (Rate Limit). This is a provider limit. Please wait 15 seconds and try again.";
  }
  if (msg.includes("invalid_api_key") || msg.includes("401") || msg.includes("unauthorized")) {
    return "The AI API key is invalid or has expired. Please check your settings.";
  }
  return "AI Brain encountered an issue: " + (err.message || "Unknown model error");
}

async function callGroqAPI(prompt) {
  const { apiKey } = getGroqConfig();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a professional resume writer. Return ONLY the requested content. No conversational filler, no preambles, no 'Here is...', and no markdown labels. RETURN PURE CONTENT ONLY.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `Status: ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    throw new Error(interpretAIError(err));
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function getSkillsText(skillsData = []) {
  if (!Array.isArray(skillsData)) return "";

  return skillsData
    .flatMap((group) => (Array.isArray(group?.skills) ? group.skills : []))
    .filter(Boolean)
    .join(", ");
}

function getEducationText(educationList = []) {
  if (!Array.isArray(educationList)) return "";

  return educationList
    .map((item) => {
      const degree = item?.degree || "";
      const institution = item?.institution || item?.college || "";
      const field = item?.fieldOfStudy || item?.specialization || "";
      return [degree, field, institution].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function getExperienceText(experienceList = []) {
  if (!Array.isArray(experienceList)) return "";

  return experienceList
    .map((item) => {
      const role = item?.role || item?.jobTitle || "";
      const company = item?.company || item?.organization || "";
      const description = item?.description || "";
      return [role, company, description].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function getProjectsText(projectList = []) {
  if (!Array.isArray(projectList)) return "";

  return projectList
    .map((item) => {
      const title = item?.title || "";
      const tech =
        normalizeList(item?.technologies) ||
        normalizeList(item?.techStack);
      const desc = item?.description || "";
      return [title, tech, desc].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function getCertificationsText(certificationList = []) {
  if (!Array.isArray(certificationList)) return "";

  return certificationList
    .map((item) => {
      const name = item?.name || item?.title || "";
      const issuer =
        item?.issuingBody || item?.issuer || item?.organization || "";
      const description = item?.description || item?.skillsCovered || "";
      return [name, issuer, description].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function getAchievementsText(achievementList = []) {
  if (!Array.isArray(achievementList)) return "";

  return achievementList
    .map((item) => {
      const category = item?.category || "";
      const title = item?.title || item?.name || item?.achievementTitle || "";
      const description = item?.description || "";
      return [category, title, description].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function buildSummaryPrompt(formData = {}, resumeData = {}) {
  const fullName = resumeData?.contact?.fullName || resumeData?.fullName || "";
  const educationList = Array.isArray(resumeData?.education) ? resumeData.education : [];
  const experienceList = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const projectList = Array.isArray(resumeData?.projects) ? resumeData.projects : [];
  const skillsData = resumeData?.skills || [];

  const educationText = formData.education || getEducationText(educationList);
  const experienceText = getExperienceText(experienceList);
  const projectsText = getProjectsText(projectList);
  const normalizedSkills = formData.skills || getSkillsText(skillsData);

  return `
You are an expert resume writer.

Write a professional ATS-friendly resume summary for the candidate below.

Candidate details:
- Name: ${fullName || "Not provided"}
- Target Role: ${formData.targetRole || "Not provided"}
- Current Status: ${formData.currentStatus || "Not provided"}
- Education: ${educationText || "Not provided"}
- Skills: ${normalizedSkills || "Not provided"}
- Career Goal: ${formData.careerGoal || "Not provided"}
- Tone: ${formData.tone || "Professional"}
- Experience / Internships: ${experienceText || "Not provided"}
- Projects: ${projectsText || "Not provided"}

Important rules:
- Write for a resume, not for LinkedIn, SOP, or cover letter.
- Keep it ATS-friendly.
- Do not use first person words like I, me, my.
- Do not invent fake companies, fake achievements, fake metrics, or fake experience.
- If the candidate is a fresher, make it sound strong but realistic.
- Focus on role alignment, strengths, skills, projects, and career direction.
- Avoid buzzword stuffing.
- Do not use headings.
- Do not use bullet points.
- Return only the final summary text.

Output requirements:
- Write exactly 3 lines.
- Keep it polished, modern, and directly usable inside a resume.
`.trim();
}

function buildProjectPrompt(formData = {}, resumeData = {}) {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const currentSummary = resumeData?.summary?.text || "";
  const educationText = getEducationText(resumeData?.education || []);

  const technologies =
    normalizeList(formData.technologies) ||
    normalizeList(formData.techStack);

  return `
You are an expert resume writer.

Write strong ATS-friendly resume content for a project description.

Candidate context:
- Education: ${educationText || "Not provided"}
- Overall Skills: ${skillsText || "Not provided"}
- Existing Summary: ${currentSummary || "Not provided"}

Project details:
- Project Title: ${formData.title || "Not provided"}
- Project Type: ${formData.projectType || "Not provided"}
- Organization / Source: ${formData.organization || "Not provided"}
- Technologies Used: ${technologies || "Not provided"}
- Role / Contribution: ${formData.role || "Not provided"}
- Problem Solved: ${formData.problemSolved || "Not provided"}
- Outcome / Result: ${formData.outcome || "Not provided"}
- Tone: ${formData.tone || "Professional"}

Important rules:
- Write for a resume, not for a project report.
- Do not use first person words like I, me, my.
- Do not invent fake metrics, fake tools, fake impact, or fake achievements.
- Keep the description realistic, polished, and recruiter-friendly.
- Naturally include important technologies.
- Focus on implementation, contribution, and outcome.
- Avoid long explanations and headings.
- Return only the final project description text.

Output requirements:
- Write 2 to 4 concise resume-ready bullet-style lines in plain text.
- Each line should be strong and specific.
- Keep the language clear, modern, and ATS-friendly.
`.trim();
}

function buildExperiencePrompt(formData = {}, resumeData = {}) {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const summaryText = resumeData?.summary?.text || "";
  const educationText = getEducationText(resumeData?.education || []);
  const projectText = getProjectsText(resumeData?.projects || []);

  return `
You are an expert resume writer.

Write strong ATS-friendly resume content for a work experience description.

Candidate context:
- Education: ${educationText || "Not provided"}
- Overall Skills: ${skillsText || "Not provided"}
- Existing Summary: ${summaryText || "Not provided"}
- Projects: ${projectText || "Not provided"}

Experience details:
- Role: ${formData.role || "Not provided"}
- Company / Organization: ${formData.company || "Not provided"}
- Employment Type: ${formData.employmentType || "Not provided"}
- Location: ${formData.cityState || "Not provided"}
- Responsibilities: ${formData.responsibilities || "Not provided"}
- Tools / Technologies Used: ${normalizeList(formData.toolsUsed) || "Not provided"}
- Outcome / Impact: ${formData.outcome || "Not provided"}
- Tone: ${formData.tone || "Professional"}

Important rules:
- Write for a resume, not for a report or cover letter.
- Do not use first person words like I, me, my.
- Do not invent fake achievements, numbers, metrics, or tools.
- Keep it realistic, polished, and recruiter-friendly.
- Focus on contribution, responsibilities, tools, ownership, and impact.
- Return only the final experience description text.

Output requirements:
- Write 2 to 4 concise resume-ready bullet-style lines in plain text.
- Start each line with a strong action verb.
- Keep it ATS-friendly, sharp, and modern.
`.trim();
}

function buildCertificationPrompt(formData = {}, resumeData = {}) {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const summaryText = resumeData?.summary?.text || "";

  return `
You are an expert resume writer.

Write strong ATS-friendly resume content for a certification description.

Candidate context:
- Overall Skills: ${skillsText || "Not provided"}
- Existing Summary: ${summaryText || "Not provided"}

Certification details:
- Certification Name: ${formData.name || "Not provided"}
- Issuing Body: ${formData.issuingBody || "Not provided"}
- Credential ID: ${formData.credentialId || "Not provided"}
- Skills Covered / Description: ${formData.skillsCovered || formData.description || "Not provided"}
- Tone: ${formData.tone || "Professional"}

Important rules:
- Write for a resume, not for a course review.
- Do not use first person words like I, me, my.
- Do not invent fake claims, fake outcomes, or fake skills.
- Keep it concise, polished, and recruiter-friendly.
- Focus on relevance, knowledge gained, and practical skill coverage.
- Return only the final certification description text.

Output requirements:
- Write 1 to 2 concise resume-ready bullet-style lines in plain text.
- Keep it ATS-friendly and clear.
`.trim();
}

function buildAchievementPrompt(formData = {}, resumeData = {}) {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const summaryText = resumeData?.summary?.text || "";

  return `
You are an expert resume writer.

Write strong ATS-friendly resume content for an achievement or activity description.

Candidate context:
- Overall Skills: ${skillsText || "Not provided"}
- Existing Summary: ${summaryText || "Not provided"}

Achievement details:
- Category: ${formData.category || "Not provided"}
- Title: ${formData.title || formData.name || "Not provided"}
- Organized By / Rank: ${formData.organizedBy || formData.rank || "Not provided"}
- Description Input: ${formData.description || "Not provided"}
- Tone: ${formData.tone || "Professional"}

Important rules:
- Write for a resume, not for a story or report.
- Do not use first person words like I, me, my.
- Do not invent fake ranks, fake awards, fake achievements, or fake metrics.
- Keep it concise, polished, and impactful.
- Focus on recognition, contribution, achievement, and relevance.
- Return only the final achievement description text.

Output requirements:
- Write 1 to 2 concise resume-ready bullet-style lines in plain text.
- Keep it ATS-friendly and impactful.
`.trim();
}

function buildCustomSectionPrompt(formData = {}, resumeData = {}, label = "") {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const summaryText = resumeData?.summary?.text || "";

  return `
You are an expert resume writer.

Write strong ATS-friendly resume content for a custom section titled "${label}".

Candidate context:
- Overall Skills: ${skillsText || "Not provided"}
- Existing Summary: ${summaryText || "Not provided"}

Entry details:
- Title: ${formData.title || "Not provided"}
- Subtitle / Context: ${formData.subtitle || "Not provided"}
- Description Input: ${formData.description || "Not provided"}
- Tone: ${formData.tone || "Professional"}

Important rules:
- Write for a resume, not for a report or personal blog.
- Do not use first person words like I, me, my.
- Do not invent fake achievements, metrics, or factual claims.
- Keep it concise, polished, and impactful.
- Focus on relevance, contribution, and clarity.
- Return only the final entry description text.

Output requirements:
- Write 1 to 2 concise resume-ready bullet-style lines in plain text.
- Keep it ATS-friendly and sharp.
`.trim();
}

function buildResumePrompt(sectionKey, userData = {}, sectionFormData = {}) {
  const normalizedSectionKey = (sectionKey || "").toLowerCase();

  if (normalizedSectionKey.startsWith("custom_")) {
    return buildCustomSectionPrompt(
      sectionFormData,
      userData,
      sectionFormData.label || sectionKey.replace("custom_", "").replace(/_/g, " ")
    );
  }

  switch (normalizedSectionKey) {
    case "summary":
      return buildSummaryPrompt(sectionFormData, userData);

    case "project":
    case "projects":
      return buildProjectPrompt(sectionFormData, userData);

    case "experience":
    case "experiences":
      return buildExperiencePrompt(sectionFormData, userData);

    case "certification":
    case "certifications":
      return buildCertificationPrompt(sectionFormData, userData);

    case "achievement":
    case "achievements":
      return buildAchievementPrompt(sectionFormData, userData);

    default:
      return `
You are an expert resume writing assistant.

Generate polished ATS-friendly resume content for the section "${sectionKey}".

Candidate data:
${JSON.stringify(userData, null, 2)}

Rules:
- Be concise
- Be truthful
- Make it resume-ready
- No explanation
- Return only final content
`.trim();
  }
}

export async function generateResumeSection(
  sectionKey,
  userData = {},
  sectionFormData = {}
) {
  const provider = getAIProvider();
  const prompt = buildResumePrompt(sectionKey, userData, sectionFormData);

  if (provider === "groq") {
    return await callGroqAPI(prompt);
  }

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return cleanAIResponse(extractText(response));
}

function buildKeywordGenerationPrompt(resumeData, jobDescription) {
  const skillsText = getSkillsText(resumeData?.skills || []);
  const experienceText = getExperienceText(resumeData?.experience || []);
  const projectsText = getProjectsText(resumeData?.projects || []);

  return `
You are an expert career coach and ATS optimization AI. 
Analyze the provided Target Job Description and the Candidate's Resume Profile.

1. Extract high-impact keywords required by the Job Description.
2. Cross-reference them with the Candidate's Context.
3. Separate keywords into "matched" (found in resume) and "missing" (not found, but relevant).
4. Calculate a "matchScore" from 0-100 based on keyword frequency and relevance in the resume relative to the JD.

Return the response strictly as a pure JSON object with the following structure:
{
  "skills": [
    { "category": "Languages", "matched": ["Python"], "missing": ["Go"] },
    { "category": "Frameworks", "matched": ["React"], "missing": ["Next.js"] }
  ],
  "projects": { "matched": ["KW"], "missing": ["KW"] },
  "experience": { "matched": ["KW"], "missing": ["KW"] },
  "matchScore": 75
}

Target Job Description:
${jobDescription || "Not provided"}

Candidate Context:
- Skills: ${skillsText || "Not provided"}
- Experience: ${experienceText || "Not provided"}
- Projects: ${projectsText || "Not provided"}

Important Rules:
- Return EXACTLY valid JSON.
- Max 10 keywords per category total.
- Match score should be realistic assessment of candidate's suitability for this specific job context.
`.trim();
}

export async function generateKeywords(resumeData = {}, jobDescription = "") {
  const provider = getAIProvider();
  const prompt = buildKeywordGenerationPrompt(resumeData, jobDescription);

  let rawOutput = "";
  try {
    if (provider === "groq") {
      rawOutput = await callGroqAPI(prompt);
    } else {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      rawOutput = extractText(response);
    }
  } catch (err) {
    throw new Error(interpretAIError(err));
  }

  const parsed = extractJSON(rawOutput);
  if (!parsed) {
     console.error("Failed to extract JSON from AI output:", rawOutput);
     throw new Error("AI returned invalid data format. Please try again.");
  }

  return {
    skills: parsed?.skills || { matched: [], missing: [] },
    projects: parsed?.projects || { matched: [], missing: [] },
    experience: parsed?.experience || { matched: [], missing: [] },
    matchScore: typeof parsed?.matchScore === 'number' ? parsed.matchScore : 0
  };
}

export async function generateSmartRewrite(originalText, targetKeywords = [], context = "") {
  const provider = getAIProvider();
  const prompt = `
You are an expert resume editor focusing on ULTRA-CONCISE ATS optimization.

TASK:
Optimize the SECTION below to include missing keywords.

TARGET MISSING KEYWORDS: ${targetKeywords.join(", ")}

GLOBAL CONTEXT:
${context.fullResumeText}

SECTION TO REWRITE:
"${originalText}"

STRICT RULES:
1. FORMATTING: Return ONLY the raw text bullets. NO markdown bolding (**), NO headers, NO conversational text.
2. LIMITS: Maximum 3 bullet points total.
3. BREVITY: Each bullet must be a single, high-impact sentence. 
4. VOCABULARY: Avoid repeating verbs from the GLOBAL CONTEXT. 
5. NO HALLUCINATIONS: Do not invent new company names or dates.
6. ATS: Naturally integrate keywords into sentences.
`.trim();

  let rawOutput = "";
  try {
    if (provider === "groq") {
      rawOutput = await callGroqAPI(prompt);
    } else {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      rawOutput = extractText(response);
    }
  } catch (err) {
    throw new Error(interpretAIError(err));
  }

  return cleanAIResponse(rawOutput);
}