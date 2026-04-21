import { supabase } from "../services/supabase";

/**
 * Determines the appropriate initial route for a user based on their onboarding status.
 * Returns '/dashboard' if onboarding is completed, otherwise returns '/how-it-works'.
 */
export const getInitialRoute = async (user) => {
  if (!user) return "/how-it-works";
  
  try {
    const { data: onboardingData } = await supabase
      .from("onboarding")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (onboardingData) return "/dashboard";
  } catch (err) {
    console.warn("Auth check error:", err);
  }
  
  return "/how-it-works";
};
