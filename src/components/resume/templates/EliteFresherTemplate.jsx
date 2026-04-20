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
        groups.push({ category: "Skills", values });
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
      groups.push({ category, values });
    }
  });
  return groups;
};

const SectionHeader = ({ title, fitConfig }) => (
  <div style={{ marginBottom: `${Math.max(4, fitConfig.itemGap / 2)}px`, marginTop: `${Math.max(8, fitConfig.sectionGap)}px` }}>
    <div
      style={{
        fontSize: `${fitConfig.headingFont + 2}px`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        color: "#000",
        lineHeight: 1.0,
        marginBottom: "2px",
      }}
    >
      {title}
    </div>
    <div style={{ width: "100%", borderBottom: "1.5px solid #000" }} />
  </div>
);

const ResumeHeader = ({ contact, fitConfig }) => {
  const fullName = cleanInlineText(contact?.fullName) || "YOUR NAME";
  
  const renderJoined = (arr, sep = " | ") => arr.map((item, index) => (
    <React.Fragment key={index}>
      {item}
      {index < arr.length - 1 && sep}
    </React.Fragment>
  ));

  const contactParts = [
    contact?.phone ? `Ph:${cleanInlineText(contact.phone)}` : "",
    contact?.email ? <span key="email">Email: <a href={`mailto:${cleanInlineText(contact.email)}`} style={{ color: "inherit", textDecoration: "none" }}>{cleanInlineText(contact.email)}</a></span> : "",
    contact?.location ? `Add: ${cleanInlineText(contact.location)}` : "",
  ].filter(Boolean);

  const linkedin = cleanInlineText(contact?.linkedinUrl);
  const github = cleanInlineText(contact?.githubUrl);
  const otherLinks = normalizeNamedLinks(contact?.otherLinks);

  const linkParts = [
    linkedin ? <span key="linkedin">LinkedIn:- <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{linkedin.replace(/^https?:\/\//, "")}</a></span> : "",
    github ? <span key="github">GitHub:- <a href={github.startsWith('http') ? github : `https://${github}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{github.replace(/^https?:\/\//, "")}</a></span> : "",
    ...otherLinks.map((l, i) => {
      const fullUrl = l.url.startsWith('http') ? l.url : `https://${l.url}`;
      return <span key={`other-${i}`}>{l.label ? l.label + ":- " : ""}<a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{l.url.replace(/^https?:\/\//, "")}</a></span>;
    })
  ].filter(Boolean);

  return (
    <header style={{ textAlign: "center", marginBottom: `${fitConfig.sectionGap - 6}px` }}>
      <div
        style={{
          fontSize: `${fitConfig.bodyFont + 18}px`,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#000",
          lineHeight: 0.9,
          marginBottom: "10px",
        }}
      >
        {fullName}
      </div>
      
      <div style={{ 
        fontSize: `${fitConfig.smallFont + 1.5}px`, 
        color: "#000", 
        lineHeight: 1.2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px"
      }}>
        {contactParts.length > 0 && (
          <div style={{ wordSpacing: "2px" }}>{renderJoined(contactParts, " | ")}</div>
        )}
        {linkParts.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "14px", rowGap: "2px" }}>
            {linkParts.map((link, idx) => (
              <span key={idx} style={{ display: "flex", alignItems: "center" }}>
                {idx > 0 && <span style={{ marginRight: "14px" }}>|</span>}
                {link}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

const SkillsSection = ({ groups, fitConfig }) => {
  if (!groups.length) return null;
  return (
    <section className="break-inside-avoid">
      <SectionHeader title="SKILLS" fitConfig={fitConfig} />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {groups.map((group, index) => (
          <div key={index} style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, lineHeight: 1.18 }}>
            <span style={{ fontWeight: 700 }}>{group.category}: </span>
            {group.values.join(", ")}
          </div>
        ))}
      </div>
    </section>
  );
};

const BulletBlock = ({ bullets, fitConfig, indent = "32px" }) => {
  if (!bullets || bullets.length === 0) return null;
  return (
    <ul style={{ 
      margin: "2px 0 0 0", 
      paddingLeft: indent, 
      fontSize: `${fitConfig.bodyFont + 1.5}px`, 
      lineHeight: 1.18,
      listStyleType: "disc",
    }}>
      {bullets.map((bullet, index) => (
        <li key={index} style={{ marginBottom: "2px" }}>{bullet}</li>
      ))}
    </ul>
  );
};

const EliteExperienceProjectsSection = ({ experiences = [], projects = [], fitConfig }) => {
  if (!experiences.length && !projects.length) return null;
  return (
    <section>
      <SectionHeader title="WORK EXPERIENCE & PROJECTS" fitConfig={fitConfig} />
      <div style={{ display: "flex", flexDirection: "column", gap: `8px` }}>
        {experiences.map((item, index) => {
          const role = cleanInlineText(item?.role);
          const company = cleanInlineText(item?.company);
          const location = cleanInlineText(item?.location || item?.cityState);
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
            <div key={`exp-${index}`} className="break-inside-avoid">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px", lineHeight: 1.18 }}>
                <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <span style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, color: "#000", marginTop: "1px", flexShrink: 0 }}>➤</span>
                  <span>{company}{location ? ` | ${location}` : ""}</span>
                </div>
                <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>{dateText}</div>
              </div>
              
              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} indent="32px" />
              ) : (
                <p style={{ margin: 0, paddingLeft: "32px", fontSize: `${fitConfig.bodyFont + 1.5}px`, lineHeight: 1.18 }}>{paragraph}</p>
              )}

              <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700, marginTop: "2px", paddingLeft: "18px", lineHeight: 1.18 }}>
                Roles & Responsibilities: {role}
              </div>
            </div>
          );
        })}
        {projects.map((item, index) => {
          const title = cleanInlineText(item?.title);
          const organization = cleanInlineText(item?.organization);
          const projectType = cleanInlineText(item?.projectType);
          const rawLink = cleanInlineText(item?.link);
          const link = rawLink ? <a href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{rawLink.replace(/^https?:\/\//, "")}</a> : null;
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
            <div key={`proj-${index}`} className="break-inside-avoid">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px", lineHeight: 1.18 }}>
                <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                   <span style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, color: "#000", marginTop: "1px", flexShrink: 0 }}>➤</span>
                  <span>{title}{organization ? ` | ${organization}` : ""}</span>
                </div>
                <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>{dateText}</div>
              </div>
              <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700, fontStyle: "italic", marginBottom: "1px", display: "flex", justifyContent: "space-between", paddingLeft: "18px", lineHeight: 1.18 }}>
                <span>{projectType}</span>
                {link && <span style={{ fontWeight: 400, fontSize: `${fitConfig.bodyFont + 0.5}px` }}>{link}</span>}
              </div>
              {bullets.length > 0 ? (
                <BulletBlock bullets={bullets} fitConfig={fitConfig} indent="32px" />
              ) : (
                <p style={{ margin: 0, paddingLeft: "32px", fontSize: `${fitConfig.bodyFont + 1.5}px`, lineHeight: 1.18 }}>{paragraph}</p>
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
      <SectionHeader title="EDUCATION" fitConfig={fitConfig} />
      <div style={{ display: "flex", flexDirection: "column", gap: `4px` }}>
        {items.map((item, index) => {
          const institution = cleanInlineText(item?.institution);
          const degreeMajor = cleanInlineText(item?.degreeMajor);
          const score = cleanInlineText(item?.cgpaOrPercentage);
          const location = cleanInlineText(item?.location || item?.cityState);
          const description = normalizeParagraph(item?.description);
          const dateText = buildDateRange({
            startYear: item?.startYear,
            endYear: item?.endYear,
            isCurrent: !!item?.currentlyStudying,
          });

          return (
            <div key={index}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", lineHeight: 1.15 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700 }}>{degreeMajor}</div>
                  <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontStyle: "italic" }}>
                    {institution}{location ? `, ${location}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {score && <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px`, fontWeight: 700 }}>CGPA:- {score}</div>}
                  <div style={{ fontSize: `${fitConfig.bodyFont + 1.5}px` }}>{dateText}</div>
                </div>
              </div>
              {description && (
                <p style={{ margin: "1px 0 0 0", fontSize: `${fitConfig.bodyFont + 1}px`, color: "#222", lineHeight: 1.15 }}>
                  {description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CombinedSection = ({ title, certifications = [], achievements = [], fitConfig }) => {
  if (!certifications.length && !achievements.length) return null;
  
  return (
    <section className="break-inside-avoid">
      <SectionHeader title={title} fitConfig={fitConfig} />
      <ul style={{ 
        margin: "0", 
        paddingLeft: "24px", 
        fontSize: `${fitConfig.bodyFont + 1.5}px`, 
        lineHeight: 1.2,
        listStyleType: "disc" 
      }}>
        {certifications.map((item, index) => {
          const name = cleanInlineText(item?.name);
          const body = cleanInlineText(item?.issuingBody);
          const date = item?.issuedMonth || item?.month ? formatMonthYear(item.issuedMonth || item.month, item.issuedYear || item.year) : "";
          
          return (
            <li key={`cert-${index}`} style={{ marginBottom: "2px" }}>
              <span style={{ fontWeight: 700 }}>Certification: {name}</span>
              {body && `, ${body}`}
              {date && ` (${date})`}
            </li>
          );
        })}
        {achievements.map((item, index) => {
          const title = cleanInlineText(item?.title);
          const rank = cleanInlineText(item?.organizerOrRank);
          const date = item?.month || item?.year ? formatMonthYear(item.month, item.year) : "";
          
          return (
            <li key={`ach-${index}`} style={{ marginBottom: "2px" }}>
              <span style={{ fontWeight: 700 }}>Achievement: {title}</span>
              {rank && `, ${rank}`}
              {date && ` (${date})`}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const EliteFresherTemplate = ({
  resumeData,
  fitConfig = {
    bodyFont: 11.5,
    smallFont: 10.5,
    headingFont: 13.5,
    lineHeight: 1.3,
    sectionGap: 12,
    itemGap: 10,
    pagePaddingX: 40,
    pagePaddingY: 40,
    bulletGap: 2,
  },
  paperHeight = 1122,
  paperWidth = 794,
}) => {
  const {
    contact = {},
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    achievements = [],
  } = resumeData || {};

  const visibleSkillGroups = normalizeSkillGroups(skills);
  const visibleExperience = sortResumeItemsByDate(experience);
  const visibleEducation = sortResumeItemsByDate(education);
  const visibleProjects = sortResumeItemsByDate(projects);

  return (
    <div
      style={{
        width: `${paperWidth}px`,
        height: `${paperHeight}px`,
        minHeight: `${paperHeight}px`,
        maxHeight: `${paperHeight}px`,
        fontFamily: "'Times New Roman', Times, serif",
        boxSizing: "border-box",
        overflow: "hidden",
        backgroundColor: "#fff",
        color: "#000",
      }}
    >
      <div
        style={{
          padding: `${fitConfig.pagePaddingY}px ${fitConfig.pagePaddingX}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${fitConfig.sectionGap - 6}px`, 
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <ResumeHeader contact={contact} fitConfig={fitConfig} />
        
        {visibleSkillGroups.length > 0 && <SkillsSection groups={visibleSkillGroups} fitConfig={fitConfig} />}
        
        {(visibleExperience.length > 0 || visibleProjects.length > 0) && (
          <EliteExperienceProjectsSection 
            experiences={visibleExperience} 
            projects={visibleProjects} 
            fitConfig={fitConfig} 
          />
        )}
        
        {visibleEducation.length > 0 && <EducationSection items={visibleEducation} fitConfig={fitConfig} />}
        
        <CombinedSection 
          title="CERTIFICATIONS & ACHIEVEMENTS" 
          certifications={certifications} 
          achievements={achievements} 
          fitConfig={fitConfig} 
        />
      </div>
    </div>
  );
};

export default EliteFresherTemplate;
