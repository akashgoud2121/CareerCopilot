import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * A wrapper component for routes that require authentication, 
 * onboarding completion, and configured AI keys.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
      </div>
    );
  }

  // 1. Auth Guard: Must be logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. AI Key Guard: Must have Gemini or Groq key in localStorage
  const aiProvider = localStorage.getItem("career_copilot_ai_provider") || "gemini";
  const geminiKey = localStorage.getItem("career_copilot_gemini_key");
  const groqKey = localStorage.getItem("career_copilot_groq_key");
  const isAIConfigured = (aiProvider === "gemini" && geminiKey) || (aiProvider === "groq" && groqKey);

  if (!isAIConfigured) {
    // If they are logged in but have no key, they MUST go to step 2
    return <Navigate to="/connect-gemini" replace />;
  }

  // 3. Onboarding Guard: Must have completed onboarding
  const onboardingDone = localStorage.getItem("career_copilot_onboarding_done");
  if (onboardingDone !== "true") {
    // If they have keys but no onboarding data, they MUST go to step 1 (Setup Guide)
    // which eventually leads back to Onboarding (Step 3)
    return <Navigate to="/how-it-works" replace />;
  }

  return children;
};

export default ProtectedRoute;
