import { useLocation } from "react-router-dom";
import Logo from "../../assets/Carrer_Copilot_Logo.png";

function Footer() {
  const location = useLocation();

  return (
    <footer className="border-t border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-0">
              <img
                src={Logo}
                alt="Career Copilot logo"
                className="h-9 w-9 object-contain md:h-12 md:w-12"
              />

              <span className="-ml-0.5 text-xl font-bold tracking-[-0.03em] text-[var(--color-primary)] md:text-2xl">
                areer Copilot
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
              Career Copilot helps students build a stronger starting point with
              a guided resume experience and future-ready career support tools.
            </p>
          </div>

          <div className={`grid gap-10 sm:grid-cols-2 md:gap-14 ${location.pathname !== "/" ? "sm:grid-cols-1" : ""}`}>
            {location.pathname === "/" && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                  Explore
                </p>
                <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
                  <a
                    href="#why-us"
                    className="transition hover:text-[var(--color-primary)]"
                  >
                    Why Us
                  </a>
                  <a
                    href="#features"
                    className="transition hover:text-[var(--color-primary)]"
                  >
                    Features
                  </a>
                  <a
                    href="#roadmap"
                    className="transition hover:text-[var(--color-primary)]"
                  >
                    Roadmap
                  </a>
                  <a
                    href="#ai-tools"
                    className="transition hover:text-[var(--color-primary)]"
                  >
                    AI Tools
                  </a>
                </div>
              </div>
            )}


            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                Platform
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
                <p>Resume Builder</p>
                <p>Gemini Integration</p>
                <p>Student-first Experience</p>
                <p>Future Career Tools</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Career Copilot. All rights reserved.</p>
            <p>Built for students with a career-first approach.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;