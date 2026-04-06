import React from "react";
import { sortResumeItemsByDate } from "../../../utils/resumeSchema";

const formatMonthYear = (month, year) => {
  if (month && year) return `${month} ${year}`;
  if (year) return `${year}`;
  if (month) return `${month}`;
  return "";
};

const buildDateRange = ({
  startMonth,
  startYear,
  endMonth,
  endYear,
  isCurrent = false,
}) => {
  const start = formatMonthYear(startMonth, startYear);
  const end = isCurrent ? "Present" : formatMonthYear(endMonth, endYear);

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "";
};

const cleanInlineText = (value = "") => {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeParagraph = (value = "") => {
  return cleanInlineText(String(value || "").replace(/\n+/g, " "));
};

const extractBullets = (value = "") => {
  const raw = String(value || "").replace(/\r/g, "").trim();
  if (!raw) return [];

  // Only treat content as a bullet list if it contains actual bullet markers
  const hasBulletMarkers = /[•●▪◦]|^\s*[-*]\s+/m.test(raw);
  if (!hasBulletMarkers) return [];

  return raw
    .split(/\n+/)
    .map((line) => cleanInlineText(line.replace(/^[•●▪◦\-*]\s*/, "")))
    .filter(Boolean);
};

const normalizeNamedLinks = (links = []) => {
  if (!Array.isArray(links)) return [];

  return links
    .map((link) => {
      if (typeof link === "string") {
        const url = cleanInlineText(link);
        return url ? { label: "", url } : null;
      }

      if (link && typeof link === "object") {
        const label = cleanInlineText(link.label || "");
        const url = cleanInlineText(link.url || link.link || link.value || "");
        if (!label && !url) return null;
        return { label, url };
      }

      return null;
    })
    .filter(Boolean);
};

const normalizeSkillGroups = (skills = []) => {
  if (!Array.isArray(skills)) return [];

  const groups = [];

  skills.forEach((item) => {
    if (!item) return;

    if (typeof item === "string") {
      const values = item
        .split(",")
        .map((s) => cleanInlineText(s))
        .filter(Boolean);

      if (values.length) {
        groups.push({
          category: "Skills",
          values,
        });
      }
      return;
    }

    const category = cleanInlineText(
      item.category || item.section || item.label || "Skills"
    );

    let values = [];

    if (Array.isArray(item.skills)) {
      values = item.skills
        .map((s) =>
          typeof s === "string"
            ? cleanInlineText(s)
            : cleanInlineText(s?.name || s?.label || s?.value || "")
        )
        .filter(Boolean);
    } else if (typeof item.skills === "string") {
      values = item.skills
        .split(",")
        .map((s) => cleanInlineText(s))
        .filter(Boolean);
    }

    if (values.length) {
      groups.push({
        category,
        values,
      });
    }
  });

  return groups;
};

const SectionHeader = ({ title, fitConfig }) => (
  <div
    style={{
      marginBottom: `${Math.max(5, fitConfig.sectionGap - 6)}px`,
    }}
  >
    <div
      style={{
        fontSize: `${fitConfig.headingFont}px`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#111827",
        lineHeight: 1.15,
        marginBottom: "3px",
      }}
    >
      {title}
    </div>

    <div
      style={{
        width: "100%",
        borderBottom: "1px solid #111827",
      }}
    />
  </div>
);

const ContactBlock = ({ contact, fitConfig }) => {
  const contactLine = [
    cleanInlineText(contact?.email),
    cleanInlineText(contact?.phone),
    cleanInlineText(contact?.location),
  ].filter(Boolean);

  const linkLine = [
    cleanInlineText(contact?.linkedinUrl)
      ? `LinkedIn: ${cleanInlineText(contact?.linkedinUrl).replace(
          /^https?:\/\//,
          ""
        )}`
      : "",
    cleanInlineText(contact?.githubUrl)
      ? `GitHub: ${cleanInlineText(contact?.githubUrl).replace(
          /^https?:\/\//,
          ""
        )}`
      : "",
    ...normalizeNamedLinks(contact?.otherLinks).map((item) => {
      const cleanUrl = item.url.replace(/^https?:\/\//, "");
      return item.label ? `${item.label}: ${cleanUrl}` : cleanUrl;
    }),
  ].filter(Boolean);

  return (
    <div
      style={{
        textAlign: "right",
        fontSize: `${fitConfig.smallFont}px`,
        lineHeight: 1.3,
        color: "#111827",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "3px",
        minWidth: 0,
        wordBreak: "break-word",
      }}
    >
      {contactLine.length > 0 && <div>{contactLine.join(" | ")}</div>}
      {linkLine.length > 0 && <div>{linkLine.join(" | ")}</div>}
    </div>
  );
};

const ResumeHeader = ({ contact, fitConfig }) => {
  const fullName = cleanInlineText(contact?.fullName) || "YOUR NAME";
  const role = cleanInlineText(contact?.targetRole);

  return (
    <header
      style={{
        paddingBottom: `${Math.max(10, fitConfig.sectionGap - 1)}px`,
        borderBottom: "2px solid #111827",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          columnGap: "18px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: `${fitConfig.bodyFont + 10}px`,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#111827",
              lineHeight: 1.02,
              marginBottom: role ? "4px" : "0",
            }}
          >
            {fullName}
          </div>

          {role && (
            <div
              style={{
                fontSize: `${fitConfig.bodyFont + 0.2}px`,
                fontWeight: 600,
                color: "#374151",
                lineHeight: 1.2,
                letterSpacing: "0.03em",
              }}
            >
              {role}
            </div>
          )}
        </div>

        <ContactBlock contact={contact} fitConfig={fitConfig} />
      </div>
    </header>
  );
};

const SummarySection = ({ text, fitConfig }) => {
  if (!text) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title="Professional Summary" fitConfig={fitConfig} />
      <p
        style={{
          fontSize: `${fitConfig.bodyFont}px`,
          lineHeight: fitConfig.lineHeight,
          color: "#111827",
          margin: 0,
        }}
      >
        {text}
      </p>
    </section>
  );
};

const SkillsSection = ({ groups, fitConfig }) => {
  if (!groups.length) return null;

  const categoryWidth = fitConfig.skillCategoryWidth || 110;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title="Skills" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(2, fitConfig.itemGap - 5)}px`,
        }}
      >
        {groups.map((group, index) => (
          <div
            key={`${group.category}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: `${categoryWidth}px 1fr`,
              columnGap: "10px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                fontSize: `${fitConfig.bodyFont}px`,
                lineHeight: fitConfig.lineHeight,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {group.category}
            </div>

            <div
              style={{
                fontSize: `${fitConfig.bodyFont}px`,
                lineHeight: fitConfig.lineHeight,
                color: "#111827",
              }}
            >
              {group.values.join(" • ")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const EntryHeader = ({
  title,
  subtitle,
  meta,
  dateText,
  fitConfig,
  titleWeight = 700,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "14px",
      marginBottom: "3px",
    }}
  >
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontSize: `${fitConfig.bodyFont + 0.3}px`,
          fontWeight: titleWeight,
          color: "#111827",
          lineHeight: 1.18,
        }}
      >
        {title}
      </div>

      {(subtitle || meta) && (
        <div
          style={{
            marginTop: "2px",
            fontSize: `${fitConfig.smallFont}px`,
            color: "#4b5563",
            lineHeight: 1.25,
          }}
        >
          {subtitle}
          {subtitle && meta ? " | " : ""}
          {meta}
        </div>
      )}
    </div>

    {dateText && (
      <div
        style={{
          flexShrink: 0,
          whiteSpace: "nowrap",
          fontSize: `${fitConfig.smallFont}px`,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.2,
          textAlign: "right",
        }}
      >
        {dateText}
      </div>
    )}
  </div>
);

const BulletBlock = ({ bullets, fitConfig }) => {
  if (!bullets.length) return null;

  return (
    <ul
      style={{
        margin: "4px 0 0 0",
        paddingLeft: "18px",
        fontSize: `${fitConfig.bodyFont}px`,
        lineHeight: fitConfig.lineHeight,
        color: "#111827",
      }}
    >
      {bullets.map((bullet, index) => (
        <li
          key={index}
          style={{
            marginBottom: `${fitConfig.bulletGap}px`,
          }}
        >
          {bullet}
        </li>
      ))}
    </ul>
  );
};

const ParagraphBlock = ({ text, fitConfig }) => {
  if (!text) return null;

  return (
    <p
      style={{
        margin: "4px 0 0 0",
        fontSize: `${fitConfig.bodyFont}px`,
        lineHeight: fitConfig.lineHeight,
        color: "#111827",
      }}
    >
      {text}
    </p>
  );
};

const ExperienceSection = ({ items, fitConfig }) => {
  if (!items.length) return null;

  return (
    <section>
      <SectionHeader title="Experience" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${fitConfig.itemGap}px`,
        }}
      >
        {items.map((item, index) => {
          const role = cleanInlineText(item?.role);
          const company = cleanInlineText(item?.company);
          const location = cleanInlineText(item?.location || item?.cityState);
          const employmentType = cleanInlineText(item?.employmentType);

          const bullets = extractBullets(item?.description);
          const paragraph = normalizeParagraph(item?.description);

          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyWorking,
          });

          return (
            <div key={index} className="break-inside-avoid">
              <EntryHeader
                title={role || company}
                subtitle={company && role ? company : location}
                meta={
                  company && role
                    ? [location, employmentType].filter(Boolean).join(" | ")
                    : employmentType
                }
                dateText={dateText}
                fitConfig={fitConfig}
              />

              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} />
              ) : (
                <ParagraphBlock text={paragraph} fitConfig={fitConfig} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ProjectsSection = ({ items, fitConfig }) => {
  if (!items.length) return null;

  return (
    <section>
      <SectionHeader title="Projects" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${fitConfig.itemGap}px`,
        }}
      >
        {items.map((item, index) => {
          const title = cleanInlineText(item?.title);
          const projectType = cleanInlineText(item?.projectType);
          const organization = cleanInlineText(item?.organization);
          const link = cleanInlineText(item?.link).replace(/^https?:\/\//, "");

          const bullets = extractBullets(item?.description);
          const paragraph = normalizeParagraph(item?.description);

          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyWorking,
          });

          return (
            <div key={index} className="break-inside-avoid">
              <EntryHeader
                title={title}
                subtitle={[projectType, organization].filter(Boolean).join(" | ")}
                meta={link}
                dateText={dateText}
                fitConfig={fitConfig}
              />

              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} />
              ) : (
                <ParagraphBlock text={paragraph} fitConfig={fitConfig} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const EducationSection = ({ items, fitConfig }) => {
  if (!items.length) return null;

  return (
    <section>
      <SectionHeader title="Education" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(4, fitConfig.itemGap - 1)}px`,
        }}
      >
        {items.map((item, index) => {
          const institution = cleanInlineText(item?.institution);
          const degreeMajor = cleanInlineText(item?.degreeMajor);
          const location = cleanInlineText(item?.location || item?.cityState);
          const score = cleanInlineText(item?.cgpaOrPercentage);
          const description = normalizeParagraph(item?.description);

          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyStudying,
          });

          return (
            <div key={index} className="break-inside-avoid">
              <EntryHeader
                title={institution}
                subtitle={[degreeMajor, location].filter(Boolean).join(", ")}
                meta={score}
                dateText={dateText}
                fitConfig={fitConfig}
              />
              <ParagraphBlock text={description} fitConfig={fitConfig} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CompactListSection = ({ title, items, fitConfig, mode }) => {
  if (!items.length) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title={title} fitConfig={fitConfig} />
      <ul
        style={{
          margin: 0,
          paddingLeft: "18px",
          fontSize: `${fitConfig.bodyFont}px`,
          lineHeight: fitConfig.lineHeight,
          color: "#111827",
        }}
      >
        {items.map((item, index) => {
          if (mode === "certifications") {
            const issued = formatMonthYear(item?.issuedMonth, item?.issuedYear);

            return (
              <li
                key={index}
                style={{ marginBottom: `${fitConfig.bulletGap}px` }}
              >
                <span style={{ fontWeight: 700 }}>
                  {cleanInlineText(item?.name)}
                </span>
                {cleanInlineText(item?.issuingBody) &&
                  `, ${cleanInlineText(item?.issuingBody)}`}
                {issued && ` (${issued})`}
              </li>
            );
          }

          const awarded = formatMonthYear(item?.month, item?.year);

          return (
            <li
              key={index}
              style={{ marginBottom: `${fitConfig.bulletGap}px` }}
            >
              <span style={{ fontWeight: 700 }}>
                {cleanInlineText(item?.title)}
              </span>
              {cleanInlineText(item?.organizerOrRank) &&
                `, ${cleanInlineText(item?.organizerOrRank)}`}
              {awarded && ` (${awarded})`}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const CustomDynamicSection = ({ title, items, fitConfig }) => {
  if (!items || !items.length) return null;

  return (
    <section>
      <SectionHeader title={title} fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${fitConfig.itemGap}px`,
        }}
      >
        {items.map((item, index) => {
          const entryTitle = cleanInlineText(item?.title);
          const subtitle = cleanInlineText(item?.subtitle);
          const paragraph = normalizeParagraph(item?.description);
          const bullets = extractBullets(item?.description);

          const dateText = buildDateRange({
            startMonth: item?.month,
            startYear: item?.year,
          });

          return (
            <div key={index} className="break-inside-avoid">
              <EntryHeader
                title={entryTitle}
                subtitle={subtitle}
                dateText={dateText}
                fitConfig={fitConfig}
              />
              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} />
              ) : (
                <ParagraphBlock text={paragraph} fitConfig={fitConfig} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ClassicTemplate = ({
  resumeData,
  fitConfig = {
    bodyFont: 11.5,
    smallFont: 10.5,
    headingFont: 13.5,
    lineHeight: 1.3,
    sectionGap: 9,
    itemGap: 7,
    pagePaddingX: 28,
    pagePaddingY: 22,
    bulletGap: 1.5,
    skillCategoryWidth: 105,
  },
  paperHeight = 1122,
  paperWidth = 794,
}) => {
  const {
    contact = {},
    summary = {},
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    achievements = [],
  } = resumeData || {};

  const visibleSkillGroups = normalizeSkillGroups(skills);

  const visibleExperience = Array.isArray(experience)
    ? sortResumeItemsByDate(experience).filter(
        (item) =>
          cleanInlineText(item?.role) ||
          cleanInlineText(item?.company) ||
          cleanInlineText(item?.description)
      )
    : [];

  const visibleEducation = Array.isArray(education)
    ? sortResumeItemsByDate(education).filter(
        (item) =>
          cleanInlineText(item?.institution) ||
          cleanInlineText(item?.degreeMajor)
      )
    : [];

  const visibleProjects = Array.isArray(projects)
    ? sortResumeItemsByDate(projects).filter(
        (item) =>
          cleanInlineText(item?.title) || cleanInlineText(item?.description)
      )
    : [];

  const visibleCertifications = Array.isArray(certifications)
    ? certifications.filter(
        (item) =>
          cleanInlineText(item?.name) ||
          cleanInlineText(item?.issuingBody) ||
          cleanInlineText(item?.skillsCovered)
      )
    : [];

  const visibleAchievements = Array.isArray(achievements)
    ? achievements.filter(
        (item) =>
          cleanInlineText(item?.title) ||
          cleanInlineText(item?.organizerOrRank) ||
          cleanInlineText(item?.description)
      )
    : [];

  const summaryText = normalizeParagraph(summary?.text);

  return (
    <div
      className="w-full bg-white text-black"
      style={{
        width: `${paperWidth}px`,
        height: `${paperHeight}px`,
        minHeight: `${paperHeight}px`,
        maxHeight: `${paperHeight}px`,
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: `${fitConfig.pagePaddingY}px ${fitConfig.pagePaddingX}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${fitConfig.sectionGap}px`,
          fontSize: `${fitConfig.bodyFont}px`,
          lineHeight: fitConfig.lineHeight,
          color: "#111827",
          boxSizing: "border-box",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <ResumeHeader contact={contact} fitConfig={fitConfig} />
        <SummarySection text={summaryText} fitConfig={fitConfig} />
        <SkillsSection groups={visibleSkillGroups} fitConfig={fitConfig} />
        <ExperienceSection items={visibleExperience} fitConfig={fitConfig} />
        <ProjectsSection items={visibleProjects} fitConfig={fitConfig} />
        <EducationSection items={visibleEducation} fitConfig={fitConfig} />
        <CompactListSection
          title="Certifications"
          items={visibleCertifications}
          fitConfig={fitConfig}
          mode="certifications"
        />
        <CompactListSection
          title="Achievements"
          items={visibleAchievements}
          fitConfig={fitConfig}
          mode="achievements"
        />
        {Array.isArray(resumeData?.customSections) &&
          resumeData.customSections.map((cs) => (
            <CustomDynamicSection
              key={cs.key}
              title={cs.label}
              items={cs.content}
              fitConfig={fitConfig}
            />
          ))}
      </div>
    </div>
  );
};

export default ClassicTemplate;