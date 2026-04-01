import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Link as LinkIcon,
  User,
} from "lucide-react";

const makeLocalKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `link_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const createEmptyLink = () => ({
  localKey: makeLocalKey(),
  label: "",
  url: "",
});

function ContactForm({ value, setResumeData, showValidationErrors = false }) {

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const normalizeOtherLinks = (links) => {
    if (!Array.isArray(links) || links.length === 0) {
      return [createEmptyLink()];
    }

    const normalized = links
      .map((item) => {
        if (!item) return null;

        if (typeof item === "string") {
          const url = item.trim();
          return {
            localKey: makeLocalKey(),
            label: "",
            url,
          };
        }

        if (typeof item === "object") {
          return {
            localKey: item.localKey || makeLocalKey(),
            label: item.label || "",
            url: item.url || item.link || item.value || "",
          };
        }

        return null;
      })
      .filter(Boolean);

    return normalized.length > 0 ? normalized : [createEmptyLink()];
  };

  const contactData = useMemo(
    () => ({
      fullName: value?.fullName || "",
      email: value?.email || "",
      phone: value?.phone || "",
      location: value?.location || "",
      linkedinUrl: value?.linkedinUrl || "",
      githubUrl: value?.githubUrl || "",
      otherLinks: normalizeOtherLinks(value?.otherLinks),
    }),
    [value]
  );

  const validateField = (field, fieldValue) => {
    const trimmed =
      typeof fieldValue === "string" ? fieldValue.trim() : fieldValue;

    switch (field) {
      case "fullName":
        if (!trimmed) return "Full name is required.";
        if (trimmed.length < 2) return "Enter a valid full name.";
        return "";

      case "email":
        if (!trimmed) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return "Enter a valid email address.";
        }
        return "";

      case "phone":
        if (!trimmed) return "Phone number is required.";
        if (!/^[0-9+\-\s()]{10,15}$/.test(trimmed)) {
          return "Enter a valid phone number.";
        }
        return "";

      case "location":
        if (!trimmed) return "Location is required.";
        if (trimmed.length < 2) return "Enter a valid location.";
        return "";

      case "linkedinUrl":
        if (!trimmed) return "";
        if (!isValidUrl(trimmed)) return "Enter a valid LinkedIn URL.";
        if (!trimmed.toLowerCase().includes("linkedin.com")) {
          return "Please enter a valid LinkedIn profile URL.";
        }
        return "";

      case "githubUrl":
        if (!trimmed) return "";
        if (!isValidUrl(trimmed)) return "Enter a valid GitHub URL.";
        if (!trimmed.toLowerCase().includes("github.com")) {
          return "Please enter a valid GitHub profile URL.";
        }
        return "";

      default:
        return "";
    }
  };

  const validateOtherLinks = (links) => {
    if (!links || links.length === 0) return "";

    for (const link of links) {
      const hasLabel = link.label?.trim();
      const hasUrl = link.url?.trim();

      if (!hasLabel && !hasUrl) continue;
      if (hasLabel && !hasUrl) return "Please enter the URL for the added link.";
      if (!hasLabel && hasUrl) return "Please add a label for the link.";
      if (hasUrl && !isValidUrl(hasUrl)) {
        return "One or more other links are invalid.";
      }
    }

    return "";
  };

  const sanitizeLinksForParent = (links) =>
    links.map((link) => ({
      localKey: link.localKey || makeLocalKey(),
      label: link.label || "",
      url: link.url || "",
    }));

  const updateField = (field, fieldValue) => {
    setResumeData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: fieldValue,
      },
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, fieldValue),
    }));
  };

  const updateOtherLink = (localKey, key, fieldValue) => {
    const updatedLinks = sanitizeLinksForParent(
      contactData.otherLinks.map((link) =>
        link.localKey === localKey
          ? {
              ...link,
              [key]: fieldValue,
            }
          : link
      )
    );

    setResumeData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        otherLinks: updatedLinks,
      },
    }));

    setErrors((prev) => ({
      ...prev,
      otherLinks: validateOtherLinks(updatedLinks),
    }));
  };

  const addOtherLink = () => {
    const updatedLinks = [...contactData.otherLinks, createEmptyLink()];

    setResumeData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        otherLinks: updatedLinks,
      },
    }));
  };

  const removeOtherLink = (localKey) => {
    const updatedLinks = contactData.otherLinks.filter(
      (link) => link.localKey !== localKey
    );

    const finalLinks = updatedLinks.length ? updatedLinks : [createEmptyLink()];

    setResumeData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        otherLinks: finalLinks,
      },
    }));

    setErrors((prev) => ({
      ...prev,
      otherLinks: validateOtherLinks(finalLinks),
    }));
  };

  const markTouched = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    if (field === "otherLinks") {
      setErrors((prev) => ({
        ...prev,
        otherLinks: validateOtherLinks(contactData.otherLinks),
      }));
      return;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, contactData[field]),
    }));
  };

  return (
    <section className="w-full">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contact
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            Contact Information
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add the details that should appear at the top of your resume so recruiters can contact you easily.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InputField
              label="Full Name"
              required
              icon={<User size={16} />}
              value={contactData.fullName}
              placeholder="e.g., Alex Johnson"
              error={touched.fullName || showValidationErrors ? errors.fullName : ""}
              onChange={(e) => updateField("fullName", e.target.value)}
              onBlur={() => markTouched("fullName")}
            />

            <InputField
              label="Email"
              required
              icon={<Mail size={16} />}
              type="email"
              value={contactData.email}
              placeholder="e.g., yourname@email.com"
              error={touched.email || showValidationErrors ? errors.email : ""}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => markTouched("email")}
            />

            <InputField
              label="Phone"
              required
              icon={<Phone size={16} />}
              value={contactData.phone}
              placeholder="(123) 456-7890"
              error={touched.phone || showValidationErrors ? errors.phone : ""}
              onChange={(e) => updateField("phone", e.target.value)}
              onBlur={() => markTouched("phone")}
            />

            <InputField
              label="Location"
              required
              icon={<MapPin size={16} />}
              value={contactData.location}
              placeholder="City, Country"
              error={touched.location || showValidationErrors ? errors.location : ""}
              onChange={(e) => updateField("location", e.target.value)}
              onBlur={() => markTouched("location")}
            />

            <InputField
              label="LinkedIn URL"
              icon={<LinkIcon size={16} />}
              value={contactData.linkedinUrl}
              placeholder="https://www.linkedin.com/in/your-profile"
              error={touched.linkedinUrl ? errors.linkedinUrl : ""}
              onChange={(e) => updateField("linkedinUrl", e.target.value)}
              onBlur={() => markTouched("linkedinUrl")}
            />

            <InputField
              label="GitHub URL"
              icon={<LinkIcon size={16} />}
              value={contactData.githubUrl}
              placeholder="https://github.com/yourusername"
              error={touched.githubUrl ? errors.githubUrl : ""}
              onChange={(e) => updateField("githubUrl", e.target.value)}
              onBlur={() => markTouched("githubUrl")}
            />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-[var(--color-bg-alt)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-primary)]">
                  Other Links
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Add portfolio, LeetCode, Behance, or any useful profile links.
                </p>
              </div>

              <button
                type="button"
                onClick={addOtherLink}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-95"
              >
                <Plus size={16} />
                Add Link
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {contactData.otherLinks.map((link) => (
                <div
                  key={link.localKey}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[0.9fr_1.6fr_auto]"
                >
                  <input
                    type="text"
                    value={link.label}
                    placeholder="Portfolio / LeetCode / Behance"
                    onChange={(e) =>
                      updateOtherLink(link.localKey, "label", e.target.value)
                    }
                    onBlur={() => markTouched("otherLinks")}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
                  />

                  <input
                    type="text"
                    value={link.url}
                    placeholder="https://your-link.com"
                    onChange={(e) =>
                      updateOtherLink(link.localKey, "url", e.target.value)
                    }
                    onBlur={() => markTouched("otherLinks")}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
                  />

                  <button
                    type="button"
                    onClick={() => removeOtherLink(link.localKey)}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {(touched.otherLinks || showValidationErrors) && errors.otherLinks ? (
              <p className="mt-3 text-sm font-medium text-red-600">{errors.otherLinks}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function InputField({ label, required = false, icon, error, ...props }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="text-slate-500">{icon}</span>
        <span>
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </span>
      </label>

      <input
        {...props}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
            : "border-slate-200 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(53,0,139,0.08)]"
        }`}
      />

      {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export default ContactForm;