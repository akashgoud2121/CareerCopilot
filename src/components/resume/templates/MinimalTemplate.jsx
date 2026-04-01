import React from "react";
import { sortResumeItemsByDate } from "../../../utils/resumeSchema";

const formatMonthYear = (month, year, fallbackPresent = false) => {
  if (month && year) return `${month} ${year}`;
  if (year) return `${year}`;
  if (month) return `${month}`;
  return fallbackPresent ? "Present" : "";
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

const normalizeLinks = (links = []) => {
  if (!Array.isArray(links)) return [];

  return links
    .map((link) => {
      if (typeof link === "string") return cleanInlineText(link);
      if (link && typeof link === "object") {
        return cleanInlineText(link.url || link.link || link.value || "");
      }
      return "";
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
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: `${Math.max(5, fitConfig.sectionGap - 4)}px`,
    }}
  >
    <div
      style={{
        fontSize: `${fitConfig.headingFont}px`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        color: "#64748b",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </div>

    <div
      style={{
        flex: 1,
        borderBottom: "1px solid #e2e8f0",
      }}
    />
  </div>
);

const ContactBlock = ({ contact, fitConfig }) => {
  const line1 = [
    cleanInlineText(contact?.email),
    cleanInlineText(contact?.phone),
    cleanInlineText(contact?.location),
  ].filter(Boolean);

  const line2 = [
    cleanInlineText(contact?.linkedinUrl).replace(/^https?:\/\//, ""),
    cleanInlineText(contact?.githubUrl).replace(/^https?:\/\//, ""),
    ...normalizeLinks(contact?.otherLinks).map((l) =>
      l.replace(/^https?:\/\//, "")
    ),
  ].filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        fontSize: `${fitConfig.smallFont}px`,
        lineHeight: 1.28,
        color: "#64748b",
        minWidth: 0,
      }}
    >
      {line1.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {line1.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "#cbd5e1" }}>•</span>}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {line2.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {line2.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "#cbd5e1" }}>•</span>}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

const ResumeHeader = ({ contact, fitConfig }) => {
  const fullName = cleanInlineText(contact?.fullName) || "YOUR NAME";
  const role = cleanInlineText(contact?.targetRole);

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        paddingBottom: `${Math.max(10, fitConfig.sectionGap)}px`,
        borderBottom: "1.5px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: `${fitConfig.bodyFont + 11}px`,
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {fullName}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {role && (
          <div
            style={{
              fontSize: `${fitConfig.bodyFont}px`,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#334155",
            }}
          >
            {role}
          </div>
        )}

        <ContactBlock contact={contact} fitConfig={fitConfig} />
      </div>
    </header>
  );
};

const SummarySection = ({ text, fitConfig }) => {
  if (!text) return null;

  return (
    <section className="break-inside-avoid">
      <div
        style={{
          borderLeft: "2px solid #e2e8f0",
          paddingLeft: "10px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: `${fitConfig.bodyFont}px`,
            lineHeight: fitConfig.lineHeight,
            color: "#475569",
            fontStyle: "italic",
            textAlign: "justify",
            textJustify: "inter-word",
          }}
        >
          {text}
        </p>
      </div>
    </section>
  );
};

const BulletBlock = ({ bullets, fitConfig }) => {
  if (!bullets.length) return null;

  return (
    <ul
      style={{
        margin: "4px 0 0 0",
        paddingLeft: "18px",
        fontSize: `${fitConfig.bodyFont}px`,
        lineHeight: fitConfig.lineHeight,
        color: "#475569",
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
        color: "#475569",
        textAlign: "justify",
        textJustify: "inter-word",
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
          gap: `${fitConfig.itemGap + 1}px`,
        }}
      >
        {items.map((item, idx) => {
          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyWorking,
          });

          const bullets = extractBullets(item?.description);
          const paragraph = normalizeParagraph(item?.description);

          return (
            <div key={idx} className="break-inside-avoid">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "3px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: `${fitConfig.bodyFont + 0.5}px`,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.15,
                    }}
                  >
                    {cleanInlineText(item?.role || item?.company)}
                  </div>

                  <div
                    style={{
                      marginTop: "2px",
                      fontSize: `${fitConfig.bodyFont}px`,
                      color: "#475569",
                      lineHeight: 1.24,
                    }}
                  >
                    {cleanInlineText(item?.company)}
                    {item?.cityState && (
                      <span style={{ color: "#94a3b8" }}>
                        {`, ${cleanInlineText(item.cityState)}`}
                      </span>
                    )}
                  </div>

                  {item?.employmentType && (
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: `${fitConfig.smallFont}px`,
                        color: "#64748b",
                        fontStyle: "italic",
                      }}
                    >
                      {cleanInlineText(item.employmentType)}
                    </div>
                  )}
                </div>

                {dateText && (
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: `${fitConfig.smallFont - 0.2}px`,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dateText}
                  </div>
                )}
              </div>

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
          gap: `${fitConfig.itemGap + 1}px`,
        }}
      >
        {items.map((item, idx) => {
          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyWorking,
          });

          const bullets = extractBullets(item?.description);
          const paragraph = normalizeParagraph(item?.description);

          return (
            <div
              key={idx}
              className="break-inside-avoid"
              style={{
                borderLeft: "2px solid #f1f5f9",
                paddingLeft: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "3px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: `${fitConfig.bodyFont + 0.5}px`,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.15,
                    }}
                  >
                    {cleanInlineText(item?.title)}
                    {item?.link && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: `${fitConfig.smallFont - 0.3}px`,
                          fontWeight: 500,
                          color: "#94a3b8",
                          textDecoration: "underline",
                        }}
                      >
                        Link
                      </span>
                    )}
                  </div>

                  {(item?.projectType || item?.organization) && (
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: `${fitConfig.smallFont - 0.2}px`,
                        fontWeight: 700,
                        color: "var(--color-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {[item?.projectType, item?.organization]
                        .map(cleanInlineText)
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </div>

                {dateText && (
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: `${fitConfig.smallFont - 0.2}px`,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dateText}
                  </div>
                )}
              </div>

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
          gap: `${fitConfig.itemGap}px`,
        }}
      >
        {items.map((item, idx) => {
          const dateText = buildDateRange({
            startMonth: item?.startMonth,
            startYear: item?.startYear,
            endMonth: item?.endMonth,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyStudying,
          });

          return (
            <div key={idx} className="break-inside-avoid">
              <div
                style={{
                  fontSize: `${fitConfig.bodyFont + 0.3}px`,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.15,
                }}
              >
                {cleanInlineText(item?.institution)}
              </div>

              <div
                style={{
                  marginTop: "2px",
                  fontSize: `${fitConfig.bodyFont}px`,
                  color: "#475569",
                }}
              >
                {[item?.degreeMajor, item?.cgpaOrPercentage]
                  .map(cleanInlineText)
                  .filter(Boolean)
                  .join(" • ")}
              </div>

              <div
                style={{
                  marginTop: "2px",
                  fontSize: `${fitConfig.smallFont}px`,
                  color: "#64748b",
                }}
              >
                {[item?.cityState, dateText]
                  .map(cleanInlineText)
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const SkillsSection = ({ groups, fitConfig }) => {
  if (!groups.length) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title="Core Skills" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(3, fitConfig.itemGap - 1)}px`,
        }}
      >
        {groups.map((group, idx) => (
          <div key={idx}>
            <div
              style={{
                fontSize: `${fitConfig.smallFont}px`,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "3px",
              }}
            >
              {group.category}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 8px",
                fontSize: `${fitConfig.bodyFont}px`,
                color: "#334155",
              }}
            >
              {group.values.map((skill, i) => (
                <React.Fragment key={i}>
                  <span>{skill}</span>
                  {i < group.values.length - 1 && (
                    <span style={{ color: "#cbd5e1" }}>•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const CompactListSection = ({ title, items, fitConfig, mode }) => {
  if (!items.length) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title={title} fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(3, fitConfig.itemGap - 1)}px`,
        }}
      >
        {items.map((item, idx) => {
          if (mode === "certifications") {
            const issued = formatMonthYear(item?.issuedMonth, item?.issuedYear);

            return (
              <div key={idx}>
                <div
                  style={{
                    fontSize: `${fitConfig.bodyFont}px`,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.15,
                  }}
                >
                  {cleanInlineText(item?.name)}
                </div>
                <div
                  style={{
                    marginTop: "2px",
                    fontSize: `${fitConfig.smallFont}px`,
                    color: "#64748b",
                  }}
                >
                  {[item?.issuingBody, issued]
                    .map(cleanInlineText)
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </div>
            );
          }

          const awarded = formatMonthYear(item?.month, item?.year);

          return (
            <div key={idx}>
              <div
                style={{
                  fontSize: `${fitConfig.bodyFont}px`,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.15,
                }}
              >
                {cleanInlineText(item?.title)}
              </div>
              <div
                style={{
                  marginTop: "2px",
                  fontSize: `${fitConfig.smallFont}px`,
                  color: "#64748b",
                }}
              >
                {[item?.organizerOrRank, awarded]
                  .map(cleanInlineText)
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </div>
          );
        })}
      </div>
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
          gap: `${fitConfig.itemGap + 1}px`,
        }}
      >
        {items.map((item, idx) => {
          const entryTitle = cleanInlineText(item?.title);
          const subtitle = cleanInlineText(item?.subtitle);
          const paragraph = normalizeParagraph(item?.description);
          const bullets = extractBullets(item?.description);

          const dateText = buildDateRange({
            startMonth: item?.month,
            startYear: item?.year,
          });

          return (
            <div key={idx} className="break-inside-avoid">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "3px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: `${fitConfig.bodyFont + 0.5}px`,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.15,
                    }}
                  >
                    {entryTitle}
                  </div>
                  {subtitle && (
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: `${fitConfig.bodyFont}px`,
                        color: "#475569",
                        lineHeight: 1.24,
                      }}
                    >
                      {subtitle}
                    </div>
                  )}
                </div>

                {dateText && (
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: `${fitConfig.smallFont - 0.2}px`,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dateText}
                  </div>
                )}
              </div>

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

const MinimalTemplate = ({
  resumeData,
  fitConfig = {
    bodyFont: 10.3,
    smallFont: 9.3,
    headingFont: 10.4,
    lineHeight: 1.24,
    sectionGap: 7,
    itemGap: 5,
    pagePaddingX: 26,
    pagePaddingY: 20,
    bulletGap: 1,
    skillCategoryWidth: 92,
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
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
          color: "#0f172a",
          boxSizing: "border-box",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <ResumeHeader contact={contact} fitConfig={fitConfig} />
        <SummarySection text={summaryText} fitConfig={fitConfig} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "20px",
            minHeight: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${fitConfig.sectionGap}px`,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <ExperienceSection items={visibleExperience} fitConfig={fitConfig} />
            <ProjectsSection items={visibleProjects} fitConfig={fitConfig} />
            <EducationSection items={visibleEducation} fitConfig={fitConfig} />
            <CompactListSection
              title="Certifications"
              items={visibleCertifications}
              fitConfig={fitConfig}
              mode="certifications"
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${fitConfig.sectionGap}px`,
              minWidth: 0,
              overflow: "hidden",
              borderLeft: "1px solid #f1f5f9",
              paddingLeft: "14px",
            }}
          >
            <SkillsSection groups={visibleSkillGroups} fitConfig={fitConfig} />
            <CompactListSection
              title="Awards"
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
      </div>
    </div>
  );
};

export default MinimalTemplate;