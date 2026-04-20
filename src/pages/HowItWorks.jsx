import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { 
  IoPersonOutline, 
  IoSchoolOutline, 
  IoFlaskOutline, 
  IoRibbonOutline, 
  IoShieldCheckmarkOutline, 
  IoRocketOutline 
} from "react-icons/io5";
import { useAuth } from "../contexts/AuthContext";

function HowItWorks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      setChecking(false);
    };

    checkStatus();
  }, [user, navigate]);

  const features = [
    {
      icon: <IoPersonOutline className="text-2xl text-violet-600" />,
      title: "Personal Identity",
      description: "We collect your basic contact details to build a professional resume header and ensure recruiters can reach you easily.",
      bg: "bg-violet-50"
    },
    {
      icon: <IoSchoolOutline className="text-2xl text-blue-600" />,
      title: "Academic Background",
      description: "Your education history helps us showcase your foundation and qualification for roles you're targeting.",
      bg: "bg-blue-50"
    },
    {
      icon: <IoFlaskOutline className="text-2xl text-emerald-600" />,
      title: "Core Skills",
      description: "We help you organize your technical and soft skills to highlight your unique strengths to potential employers.",
      bg: "bg-emerald-50"
    },
    {
      icon: <IoRibbonOutline className="text-2xl text-amber-600" />,
      title: "Projects & Certifications",
      description: "By documenting your practical work, we demonstrate your hands-on experience and verified learning path.",
      bg: "bg-amber-50"
    },
    {
      icon: <IoRocketOutline className="text-2xl text-rose-600" />,
      title: "AI-Powered Refinement",
      description: "We use Gemini AI to refine your wording, ensuring your resume sounds professional and matches industry standards.",
      bg: "bg-rose-50"
    },
    {
      icon: <IoShieldCheckmarkOutline className="text-2xl text-slate-600" />,
      title: "Data Privacy",
      description: "Your data is stored locally and securely. We only use it to generate your resume and improve your experience.",
      bg: "bg-slate-50"
    }
  ];

  return (
    <div className="glass-morphism-bg min-h-screen px-6 py-12 md:px-12 lg:px-20">
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <span className="animate-float inline-flex rounded-full border border-violet-100 bg-white/80 px-4 py-1 text-sm font-bold text-[var(--color-primary)] shadow-sm backdrop-blur-md">
            Step 1 of 3: Getting Started
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-text)] md:text-5xl">
            How Career Copilot Works
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
            Before we begin, here is a quick overview of the information we collect and how it helps you build a winning career profile.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg}`}>
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-6 text-center">
          <p className="max-w-md text-sm text-slate-500">
            Ready to build your professional profile? Click below to connect your AI assistant and start your journey.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/")}
              className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate("/connect-gemini")}
              className="rounded-2xl bg-[var(--color-primary)] px-10 py-4 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 hover:scale-[1.02]"
            >
              Continue to Setup →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;
