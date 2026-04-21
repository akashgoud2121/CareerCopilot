import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { runGeminiBasicTest, runGroqBasicTest, getAIProvider } from "../services/gemini";
import { IoCheckmarkCircleOutline, IoAlertCircleOutline } from "react-icons/io5";
import { useAuth } from "../contexts/AuthContext";

function ConnectGemini() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [provider, setProvider] = useState(getAIProvider());
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState("");

  const currentKey = provider === "gemini" ? geminiKey : groqKey;

  useEffect(() => {
    const checkUser = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const savedGeminiKey = localStorage.getItem("career_copilot_gemini_key");
      const savedGroqKey = localStorage.getItem("career_copilot_groq_key");

      if (savedGeminiKey) setGeminiKey(savedGeminiKey);
      if (savedGroqKey) setGroqKey(savedGroqKey);

      setCheckingUser(false);
    };

    checkUser();
  }, [navigate, user]);

  const handleTestKey = async () => {
    const apiKey = currentKey.trim();
    if (!apiKey) {
      setError(`Please enter your ${provider === "gemini" ? "Gemini" : "Groq"} key to test.`);
      return;
    }

    setTesting(true);
    setCheckResult(null);
    setError("");

    try {
      let result;
      if (provider === "gemini") {
        localStorage.setItem("career_copilot_gemini_key", apiKey);
        result = await runGeminiBasicTest();
      } else {
        result = await runGroqBasicTest(apiKey);
      }

      setCheckResult({
        success: true,
        message: `Connection successful! ${provider === "gemini" ? "Gemini" : "Groq"} is ready.`,
      });
    } catch (err) {
      setCheckResult({
        success: false,
        message: err.message || "Failed to connect. Please check your key and try again.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const apiKey = currentKey.trim();
    if (!apiKey) {
      setError(`Please enter your ${provider === "gemini" ? "Gemini" : "Groq"} API key.`);
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem("career_copilot_ai_provider", provider);
      if (provider === "gemini") {
        localStorage.setItem("career_copilot_gemini_key", apiKey);
      } else {
        localStorage.setItem("career_copilot_groq_key", apiKey);
      }
      navigate("/onboarding");
    } catch (err) {
      setError("Failed to save configuration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <span className="mb-6 inline-flex w-fit rounded-full bg-violet-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
          Step 2 of 3
        </span>

        <div className="mb-10 overflow-hidden rounded-[24px] md:rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="p-6 md:p-10">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
              <div className="lg:w-1/2">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse"></span>
                  Start Here: Guide
                </div>
                <h3 className="mt-4 text-3xl font-bold text-slate-900">Choose your AI provider</h3>
                <p className="mt-5 text-lg leading-relaxed text-slate-600">
                  Select between <strong>Google Gemini</strong> or <strong>Groq (Llama 3.1)</strong>. Both offer generous free tiers that help you build professional resumes at zero cost.
                </p>
                
                <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/30 p-5 ring-1 ring-slate-100">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                      <span className="text-xl">⚡</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">Why Groq?</h4>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        Groq is incredibly fast and powered by Meta's Llama models. It's a great alternative if you hit Gemini's temporary limits.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 lg:w-1/2 shadow-lg">
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/JIH9QU4ik9g?si=LCeKZ0TL90xaRdk9"
                    title="How to setup AI"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              Connect your AI Assistant
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Select your preferred provider and add your API key once to continue with your setup.
            </p>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setProvider("gemini")}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-all ${
                  provider === "gemini"
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Google Gemini
              </button>
              <button
                onClick={() => setProvider("groq")}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-all ${
                  provider === "groq"
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Groq AI
              </button>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                How to get your {provider === "gemini" ? "Gemini" : "Groq"} key
              </h2>
              {provider === "gemini" ? (
                <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-6 text-slate-600">
                  <li>Visit <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--color-primary)] hover:underline">Google AI Studio</a> and sign in with your Google account.</li>
                  <li>In the left sidebar, click the <strong>"Get API key"</strong> button (look for the key icon 🔑).</li>
                  <li>Click on <strong>"Create API key"</strong> and select <strong>"Create API key in new project"</strong>.</li>
                  <li>Wait for the key to be generated, then <strong>copy</strong> the key to your clipboard.</li>
                  <li>Return here and paste the key in the input field below.</li>
                </ol>
              ) : (
                <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-6 text-slate-600">
                  <li>Visit the <a href="https://console.groq.com/keys" className="font-medium text-[var(--color-primary)] hover:underline">Groq Cloud Console</a>.</li>
                  <li>Sign in and click <strong>"Create API Key"</strong>.</li>
                  <li>Name your key (e.g., "Career Copilot") and copy it.</li>
                </ol>
              )}
            </div>
          </div>

          <div className="rounded-[24px] md:rounded-[28px] border border-slate-200 bg-white p-6 md:p-8 shadow-xl shadow-slate-200/60 h-fit">
            <h2 className="text-2xl font-semibold text-slate-900">
              Add {provider === "gemini" ? "Gemini" : "Groq"} API key
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Paste your {provider === "gemini" ? "Gemini" : "Groq"} API key below.
            </p>

            <form onSubmit={handleSave} className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {provider === "gemini" ? "Gemini" : "Groq"} API Key
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/10">
                  <input
                    type={showKey ? "text" : "password"}
                    value={currentKey}
                    onChange={(e) => provider === "gemini" ? setGeminiKey(e.target.value) : setGroqKey(e.target.value)}
                    placeholder={`Paste your ${provider === "gemini" ? "Gemini" : "Groq"} key`}
                    className="w-full border-none bg-transparent text-sm text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    className="text-sm font-medium text-[var(--color-primary)]"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Saving..." : "Continue"}
              </button>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing || !currentKey}
                className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {testing ? "Testing Connection..." : "Test Connection"}
              </button>

              <div className="mt-4 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/how-it-works")}
                  className="text-sm font-medium text-slate-500 transition hover:text-[var(--color-primary)] underline"
                >
                  ← Back to Setup Guide
                </button>
              </div>
            </form>

            {checkResult && (
              <div
                className={`mt-6 flex items-start gap-3 rounded-2xl p-4 ${
                  checkResult.success
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {checkResult.success ? (
                  <IoCheckmarkCircleOutline className="mt-0.5 shrink-0" size={18} />
                ) : (
                  <IoAlertCircleOutline className="mt-0.5 shrink-0" size={18} />
                )}
                <p className="text-sm font-medium leading-6">{checkResult.message}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default ConnectGemini;