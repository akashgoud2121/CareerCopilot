import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { IoArrowBack, IoMenu, IoClose } from "react-icons/io5";
import { FiChevronDown, FiLayout, FiBookmark, FiLogOut } from "react-icons/fi";
import { supabase } from "../../services/supabase";
import Logo from "../../assets/Carrer_Copilot_Logo.png";

function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadProfile = async (sessionUser) => {
      if (!sessionUser) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sessionUser.id)
        .maybeSingle();
      if (data) setProfile(data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
    navigate("/");
  };
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="flex items-center gap-4">
          {location.pathname !== "/" && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-[var(--color-primary)]"
              title="Go back"
            >
              <IoArrowBack size={22} />
            </button>
          )}

        <Link to="/" className="flex items-center select-none">
          <img
            src={Logo}
            alt="Career Copilot logo"
            className="h-10 w-10 object-contain md:h-14 md:w-14"
          />
          <span className="-ml-1 text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--color-primary)] leading-none md:text-[1.75rem]">
            areer Copilot
          </span>
        </Link>
        </div>

        {location.pathname === "/" && (
          <nav className="hidden items-center gap-9 md:flex">
            <a
              href="#why-us"
              className="text-[15px] font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              Why Us
            </a>
            <a
              href="#features"
              className="text-[15px] font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              Features
            </a>
            <a
              href="#ai-tools"
              className="text-[15px] font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              AI Tools
            </a>
          </nav>
        )}

        <div className="flex items-center gap-4 relative">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-3 rounded-full border bg-white/80 py-2 pl-2 pr-5 text-sm font-semibold text-slate-700 transition-all duration-300 backdrop-blur-sm hover:shadow-md ${
                  showDropdown
                    ? "border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/5 shadow-inner"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-[13px] font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                  {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt={profile?.full_name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile?.full_name?.charAt(0).toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() ||
                    "U"
                  )}
                </div>
                <div className="hidden max-w-[120px] sm:flex">
                  <span className="truncate py-0.5 text-[13px] font-bold leading-normal text-slate-900 capitalize">
                    {profile?.full_name || "Account"}
                  </span>
                </div>
                <FiChevronDown
                  className={`text-slate-400 transition-transform duration-300 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="mb-1 rounded-xl bg-slate-50/50 px-4 py-3 border border-slate-100/50">
                    <p className="truncate text-[13px] font-bold text-slate-900 capitalize">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500 mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <Link
                      to="/onboarding"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold text-[var(--color-primary)] transition-all hover:bg-[var(--color-primary)] hover:text-white group bg-indigo-50/30 mb-1"
                    >
                      <FiLayout className="text-lg text-[var(--color-primary)] transition-colors group-hover:text-white" />
                      Edit Profile
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold text-slate-700 transition-all hover:bg-[var(--color-primary)] hover:text-white group"
                    >
                      <FiLayout className="text-lg text-slate-400 transition-colors group-hover:text-white" />
                      Dashboard
                    </Link>
                    <Link
                      to="/saved-jobs"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold text-slate-700 transition-all hover:bg-[var(--color-primary)] hover:text-white group"
                    >
                      <FiBookmark className="text-lg text-slate-400 transition-colors group-hover:text-white" />
                      Tracked Jobs
                    </Link>
                    <div className="my-1.5 h-px bg-slate-100 mx-2" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold text-red-600 transition-all hover:bg-red-50"
                    >
                      <FiLogOut className="text-lg" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:inline-flex"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="hidden rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(53,0,139,0.18)] transition hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
              >
                Signup
              </Link>
            </>
          )}
          {location.pathname === "/" && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-[var(--color-primary)]"
              title="Toggle mobile menu"
            >
              {showMobileMenu ? <IoClose size={26} /> : <IoMenu size={26} />}
            </button>
          )}
        </div>
      </div>

      {showMobileMenu && location.pathname === "/" && (
        <div className="md:hidden absolute left-0 right-0 top-full border-b border-slate-200 bg-white/95 px-6 py-6 shadow-xl backdrop-blur-md">
          <nav className="flex flex-col gap-6">
            <a
              href="#why-us"
              onClick={() => setShowMobileMenu(false)}
              className="text-lg font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              Why Us
            </a>
            <a
              href="#features"
              onClick={() => setShowMobileMenu(false)}
              className="text-lg font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              Features
            </a>
            <a
              href="#ai-tools"
              onClick={() => setShowMobileMenu(false)}
              className="text-lg font-medium text-slate-700 transition hover:text-[var(--color-primary)]"
            >
              AI Tools
            </a>
            <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-4">
              <Link
                to="/login"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                Signup
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;