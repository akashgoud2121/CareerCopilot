import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { ensureProfileAndResume } from "../services/resumeBuilderApi";
import { IoArrowBack } from "react-icons/io5";
import { useAuth } from "../contexts/AuthContext";

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    education: "",
    currentStatus: "",
    targetRole: "",
    experienceLevel: "",
    mainGoal: "",
  });

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const aiProvider = localStorage.getItem("career_copilot_ai_provider") || "gemini";
      const geminiKey = localStorage.getItem("career_copilot_gemini_key");
      const groqKey = localStorage.getItem("career_copilot_groq_key");

      const isAIConfigured = (aiProvider === "gemini" && geminiKey) || (aiProvider === "groq" && groqKey);

      if (!isAIConfigured) {
        navigate("/connect-gemini");
        return;
      }

      // Relaxing strict redirect to allow users to view/edit onboarding if they navigate here
      /*
      const onboardingDone = localStorage.getItem("career_copilot_onboarding_done");
      if (onboardingDone === "true") {
        navigate("/dashboard", { replace: true });
        return;
      }
      */

      try {
        const { data: onboardingData, error } = await supabase
          .from("onboarding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (onboardingData) {
          const processed = {
            fullName: onboardingData.full_name || "",
            education: onboardingData.education || "",
            currentStatus: onboardingData.current_status || "",
            targetRole: onboardingData.target_role || "",
            experienceLevel: onboardingData.experience_level || "",
            mainGoal: onboardingData.main_goal || "",
          };
          setFormData(processed);
          localStorage.setItem("career_copilot_onboarding_data", JSON.stringify(processed));
          localStorage.setItem("career_copilot_onboarding_done", "true");
          
          // Only auto-redirect if we don't have a force flag or if we are just "checking"
          // For now, let's allow them to see the page if they navigate here
          // navigate("/dashboard", { replace: true }); 
          // return;
        } else {
          const savedData = localStorage.getItem("career_copilot_onboarding_data");
          if (savedData) {
            setFormData(JSON.parse(savedData));
          }
        }
      } catch (err) {
        console.error("Error fetching onboarding data:", err);
        const savedData = localStorage.getItem("career_copilot_onboarding_data");
        if (savedData) {
          setFormData(JSON.parse(savedData));
        }
      }

      setChecking(false);
    };

    checkAccess();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error("No user found");

      // 1. Ensure profile exists to avoid foreign key violations
      await ensureProfileAndResume(user);

      // 2. Save onboarding data
      // 1. Update Onboarding Table
      const { error: onboardingError } = await supabase
        .from("onboarding")
        .upsert(
          {
            user_id: user.id,
            full_name: formData.fullName,
            education: formData.education,
            current_status: formData.currentStatus,
            target_role: formData.targetRole,
            experience_level: formData.experienceLevel,
            main_goal: formData.mainGoal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (onboardingError) throw onboardingError;

      localStorage.setItem(
        "career_copilot_onboarding_data",
        JSON.stringify(formData)
      );
      localStorage.setItem("career_copilot_onboarding_done", "true");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Preparing onboarding...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <span className="inline-flex rounded-full bg-violet-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
            Step 3 of 3
          </span>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">
            Tell us a little about you
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            This helps Career Copilot personalize your resume flow and guide you
            better from the beginning.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)] capitalize"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Education
              </label>
              <input
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
                placeholder="B.Tech, MBA, B.Sc, etc."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Current Status
              </label>
              <select
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                required
              >
                <option value="">Select status</option>
                <option value="Student">Student</option>
                <option value="Fresher">Fresher</option>
                <option value="Job Seeker">Job Seeker</option>
                <option value="Working Professional">Working Professional</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Primary Profession / Field
              </label>
              <p className="mb-2 text-xs text-slate-500">Your overarching career trajectory (e.g. Software Engineering)</p>
              <input
                type="text"
                name="targetRole"
                value={formData.targetRole}
                onChange={handleChange}
                placeholder="Frontend Developer, Data Analyst..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Experience Level
              </label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                required
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="0-1 Years">0-1 Years</option>
                <option value="1-3 Years">1-3 Years</option>
                <option value="3+ Years">3+ Years</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Main Goal
              </label>
              <select
                name="mainGoal"
                value={formData.mainGoal}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                required
              >
                <option value="">Select goal</option>
                <option value="Build Resume">Build Resume</option>
                <option value="Improve Resume">Improve Resume</option>
                <option value="Get Internship">Get Internship</option>
                <option value="Get Job">Get Job</option>
                <option value="Career Guidance">Career Guidance</option>
              </select>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/connect-gemini")}
              className="text-sm font-medium text-slate-500 transition hover:text-[var(--color-primary)]"
            >
              ← Back to AI Connection
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-70"
            >
              {loading ? "Saving Progress..." : "Save and Continue →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Onboarding;