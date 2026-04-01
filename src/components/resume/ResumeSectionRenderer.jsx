import ContactForm from "./forms/ContactForm";
import SummaryForm from "./forms/SummaryForm";
import SkillsForm from "./forms/SkillsForm";
import EducationForm from "./forms/EducationForm";
import ProjectsForm from "./forms/ProjectsForm";
import CertificationsForm from "./forms/CertificationsForm";
import AchievementsForm from "./forms/AchievementsForm";
import ExperienceForm from "./forms/ExperienceForm";
import CustomSectionForm from "./forms/CustomSectionForm";

function ResumeSectionRenderer({
  currentSection,
  resumeData,
  setResumeData,
  onOpenAIModal,
  showValidationErrors = false,
}) {
  if (!currentSection) return null;

  const sectionKey = currentSection.key;

  const commonProps = {
    setResumeData,
    onOpenAIModal,
    showValidationErrors,
  };


  const sectionMap = {
    contact: (
      <ContactForm
        value={resumeData.contact}
        setResumeData={setResumeData}
      />
    ),

    summary: (
      <SummaryForm
        value={resumeData.summary}
        {...commonProps}
      />
    ),

    skills: (
      <SkillsForm
        value={resumeData.skills}
        setResumeData={setResumeData}
      />
    ),

    education: (
      <EducationForm
        value={resumeData.education}
        setResumeData={setResumeData}
      />
    ),

    projects: (
      <ProjectsForm
        value={resumeData.projects}
        {...commonProps}
      />
    ),

    certifications: (
      <CertificationsForm
        value={resumeData.certifications}
        {...commonProps}
      />
    ),

    achievements: (
      <AchievementsForm
        value={resumeData.achievements}
        {...commonProps}
      />
    ),

    experience: (
      <ExperienceForm
        value={resumeData.experience}
        {...commonProps}
      />
    ),
  };

  if (sectionMap[sectionKey]) {
    return sectionMap[sectionKey];
  }

  if (currentSection.type === "custom") {
    return (
      <CustomSectionForm
        sectionKey={sectionKey}
        label={currentSection.label}
        value={resumeData[sectionKey]}
        {...commonProps}
      />
    );
  }

  return (
    <div className="py-6">
      <p className="text-lg font-semibold text-[var(--color-text)]">
        {currentSection.label}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
        This custom section is ready. We can build its form after the core
        resume sections are completed.
      </p>
    </div>
  );
}

export default ResumeSectionRenderer;