import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { 
  IoPersonOutline, 
  IoMailOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline 
} from "react-icons/io5";
import { useAuth } from "../../contexts/AuthContext";

const ProfileSection = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!user) return;


        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        setProfile({
          fullName: profileData?.full_name || "",
          email: user.email || "",
        });
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: profile.fullName,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
      <div className="mb-10 flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-[var(--color-primary)] shadow-sm">
          <IoPersonOutline size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Profile Details</h2>
          <p className="text-sm font-medium text-[var(--color-muted)]">Manage your identity and contact info.</p>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-3">
            <label 
              htmlFor="fullName" 
              className="text-sm font-semibold text-[var(--color-text)]"
            >
              Full Name
            </label>
            <div className="relative">
              <IoPersonOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="fullName"
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Your Name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-5 text-sm font-medium outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
              />
            </div>
          </div>

          {/* Email (Read Only) */}
          <div className="space-y-3">
            <label 
              htmlFor="email" 
              className="text-sm font-semibold text-[var(--color-text)]"
            >
              Email Address
            </label>
            <div className="relative">
              <IoMailOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50/50 py-4 pl-14 pr-5 text-sm font-medium text-slate-400 outline-none"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100/50 px-2 py-1 rounded">Locked</span>
            </div>
          </div>
        </div>

        {message && (
          <div 
            className={`flex items-start gap-4 rounded-2xl p-5 text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === "success" 
                ? "bg-emerald-50 text-emerald-700 shadow-emerald-100/20" 
                : "bg-rose-50 text-rose-700 shadow-rose-100/20"
            }`}
          >
            {message.type === "success" ? <IoCheckmarkCircleOutline className="mt-0.5 shrink-0" size={20} /> : <IoAlertCircleOutline className="mt-0.5 shrink-0" size={20} />}
            <p className="leading-6">{message.text}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="group flex items-center gap-2 rounded-2xl bg-slate-900 px-10 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {saving ? "Saving Changes..." : "Save Profile Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSection;
