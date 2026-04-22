import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const lastFetchedUserIdRef = useRef(null);
  const activeFetchPromiseRef = useRef(null);

  const fetchProfile = async (userId) => {
    if (!userId) return;
    
    // 1. DEDUPLICATION: Check if we are currently fetching OR already have the data for this user
    if (activeFetchPromiseRef.current) return activeFetchPromiseRef.current;
    if (lastFetchedUserIdRef.current === userId) return;

    // Mark as fetching for this specific user immediately to block parallel attempts
    lastFetchedUserIdRef.current = userId;

    activeFetchPromiseRef.current = (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setProfile(data);
          return data;
        }
      } catch (err) {
        console.warn("Profile fetch error:", err);
        // On error, reset so we can retry if needed
        lastFetchedUserIdRef.current = null;
      } finally {
        activeFetchPromiseRef.current = null;
      }
    })();

    return activeFetchPromiseRef.current;
  };


  const refreshProfile = async () => {
    if (user) {
      lastFetchedUserIdRef.current = null;
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // 1. Capture initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // INSTANT INJECTION: Seed metadata name so Navbar isn't blank while fetching
        const fallbackName = currentUser.user_metadata?.full_name || 
                             currentUser.user_metadata?.name || 
                             currentUser.email?.split("@")[0] || 
                             "User";
        
        setProfile(prev => prev || { full_name: fallbackName, id: currentUser.id });
        fetchProfile(currentUser.id);
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Seed preliminary data if missing
        if (!profile || profile.id !== currentUser.id) {
            const fallbackName = currentUser.user_metadata?.full_name || 
                                 currentUser.user_metadata?.name || 
                                 currentUser.email?.split("@")[0] || 
                                 "User";
            setProfile({ full_name: fallbackName, id: currentUser.id });
        }
        // Trigger fetch in background without blocking
        fetchProfile(currentUser.id);
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
      }
      
      setLoading(false);
    });


    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
