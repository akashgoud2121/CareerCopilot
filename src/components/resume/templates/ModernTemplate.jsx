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
      marginBottom: `${Math.max(5, fitConfig.sectionGap - 5)}px`,
    }}
  >
    <div
      style={{
        fontSize: `${fitConfig.headingFont}px`,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        color: "#64748b",
        lineHeight: 1.1,
        marginBottom: "5px",
      }}
    >
      {title}
    </div>

    <div
      style={{
        width: "100%",
        borderBottom: "1px solid #cbd5e1",
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
        textAlign: "right",
        fontSize: `${fitConfig.smallFont}px`,
        lineHeight: 1.28,
        color: "#475569",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "3px",
        minWidth: 0,
        wordBreak: "break-word",
      }}
    >
      {line1.length > 0 && <div>{line1.join(" | ")}</div>}
      {line2.length > 0 && <div>{line2.join(" | ")}</div>}
    </div>
  );
};

const ResumeHeader = ({ contact, fitConfig }) => {
  const fullName = cleanInlineText(contact?.fullName) || "YOUR NAME";
  const role = cleanInlineText(contact?.targetRole);

  return (
    <header
      style={{
        paddingBottom: `${Math.max(10, fitConfig.sectionGap)}px`,
        borderBottom: "2px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 1fr",
          columnGap: "18px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: `${fitConfig.bodyFont + 12}px`,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#0f172a",
              lineHeight: 1,
              marginBottom: role ? "6px" : "0",
            }}
          >
            {fullName}
          </div>

          {role && (
            <div
              style={{
                fontSize: `${fitConfig.bodyFont + 0.6}px`,
                fontWeight: 700,
                color: "var(--color-primary)",
                lineHeight: 1.2,
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
      <SectionHeader title="Profile" fitConfig={fitConfig} />
      <p
        style={{
          margin: 0,
          fontSize: `${fitConfig.bodyFont}px`,
          lineHeight: fitConfig.lineHeight,
          color: "#334155",
          textAlign: "justify",
          textJustify: "inter-word",
        }}
      >
        {text}
      </p>
    </section>
  );
};

const BulletBlock = ({ bullets, fitConfig }) => {
  if (!bullets.length) return null;

  return (
    <ul
      style={{
        margin: "6px 0 0 -16px",
        paddingLeft: "16px",
        fontSize: `${fitConfig.bodyFont}px`,
        lineHeight: fitConfig.lineHeight,
        color: "#334155",
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
        color: "#334155",
        textAlign: "justify",
        textJustify: "inter-word",
      }}
    >
      {text}
    </p>
  );
};

const TimelineItem = ({
  title,
  subtitle,
  meta,
  dateText,
  children,
  fitConfig,
}) => (
  <div
    className="break-inside-avoid"
    style={{
      position: "relative",
      paddingLeft: "22px",
      paddingBottom: `${fitConfig.itemGap + 4}px`,
      borderLeft: "2px solid #e2e8f0",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: "-5px",
        top: "6px",
        width: "8px",
        height: "8px",
        borderRadius: "999px",
        background: "var(--color-primary)",
      }}
    />

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
            fontSize: `${fitConfig.bodyFont + 0.4}px`,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>

        {(subtitle || meta) && (
          <div
            style={{
              marginTop: "2px",
              fontSize: `${fitConfig.smallFont}px`,
              color: "#64748b",
              lineHeight: 1.25,
            }}
          >
            {subtitle}
            {subtitle && meta ? " • " : ""}
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
            color: "#475569",
            lineHeight: 1.2,
          }}
        >
          {dateText}
        </div>
      )}
    </div>

    {children}
  </div>
);

const ExperienceSection = ({ items, fitConfig }) => {
  if (!items.length) return null;

  return (
    <section>
      <SectionHeader title="Experience" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: "6px",
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
            <TimelineItem
              key={idx}
              title={cleanInlineText(item?.role || item?.company)}
              subtitle={cleanInlineText(item?.company)}
              meta={[item?.cityState, item?.employmentType]
                .map(cleanInlineText)
                .filter(Boolean)
                .join(" • ")}
              dateText={dateText}
              fitConfig={fitConfig}
            >
              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} />
              ) : (
                <ParagraphBlock text={paragraph} fitConfig={fitConfig} />
              )}
            </TimelineItem>
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
                      fontSize: `${fitConfig.bodyFont + 0.4}px`,
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
                      color: "var(--color-secondary)",
                      lineHeight: 1.25,
                    }}
                  >
                    {[item?.projectType, item?.organization]
                      .map(cleanInlineText)
                      .filter(Boolean)
                      .join(" • ")}
                  </div>

                  {item?.link && (
                    <div
                      style={{
                        marginTop: "2px",
                        fontSize: `${fitConfig.smallFont}px`,
                        color: "#64748b",
                      }}
                    >
                      {cleanInlineText(item.link).replace(/^https?:\/\//, "")}
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
                      color: "#475569",
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

const SkillsSection = ({ groups, fitConfig }) => {
  if (!groups.length) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title="Skills" fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(3, fitConfig.itemGap - 2)}px`,
        }}
      >
        {groups.map((group, idx) => (
          <div key={idx}>
            <div
              style={{
                fontSize: `${fitConfig.smallFont}px`,
                fontWeight: 700,
                color: "#475569",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {group.category}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
              }}
            >
              {group.values.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    fontSize: `${fitConfig.smallFont - 0.2}px`,
                    fontWeight: 600,
                    color: "#334155",
                    lineHeight: 1.2,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
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
                  fontSize: `${fitConfig.bodyFont + 0.2}px`,
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
                  color: "#334155",
                  lineHeight: 1.25,
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
                  lineHeight: 1.25,
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

const CompactListSection = ({ title, items, fitConfig, mode }) => {
  if (!items.length) return null;

  return (
    <section className="break-inside-avoid">
      <SectionHeader title={title} fitConfig={fitConfig} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${Math.max(3, fitConfig.itemGap - 2)}px`,
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
                    lineHeight: 1.2,
                  }}
                >
                  {cleanInlineText(item?.name)}
                </div>
                <div
                  style={{
                    marginTop: "2px",
                    fontSize: `${fitConfig.smallFont}px`,
                    color: "#64748b",
                    lineHeight: 1.25,
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
                  lineHeight: 1.2,
                }}
              >
                {cleanInlineText(item?.title)}
              </div>
              <div
                style={{
                  marginTop: "2px",
                  fontSize: `${fitConfig.smallFont}px`,
                  color: "#64748b",
                  lineHeight: 1.25,
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
          gap: `${fitConfig.itemGap}px`,
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
                      fontSize: `${fitConfig.bodyFont + 0.4}px`,
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
                        fontSize: `${fitConfig.smallFont}px`,
                        color: "var(--color-secondary)",
                        lineHeight: 1.25,
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
                      whiteSpace: "nowrap",
                      fontSize: `${fitConfig.smallFont}px`,
                      fontWeight: 700,
                      color: "#475569",
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

const ModernTemplate = ({
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 230px",
            gap: "22px",
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
            <SummarySection text={summaryText} fitConfig={fitConfig} />
            <ExperienceSection items={visibleExperience} fitConfig={fitConfig} />
            <ProjectsSection items={visibleProjects} fitConfig={fitConfig} />
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${fitConfig.sectionGap}px`,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <SkillsSection groups={visibleSkillGroups} fitConfig={fitConfig} />
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;