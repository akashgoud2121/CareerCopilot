import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

function CTASection() {
  const { user } = useAuth();
  
  return (
    <section className="bg-white px-6 pb-16 md:px-12 md:pb-24 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[var(--color-text)] px-6 py-14 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:px-10 md:py-20"
        >
          <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-[var(--color-accent-1)]/20 blur-3xl" />
          <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[var(--color-accent-2)]/12 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70"
            >
              Get Started
            </motion.p>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl"
            >
              Build a resume that gives your career a stronger beginning
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/75 md:text-lg"
            >
              Start with a guided resume builder designed for students, then
              grow into a broader career platform as new tools are added to
              Career Copilot.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-9 flex flex-col justify-center gap-4 sm:flex-row"
            >
              <Link
                to={user ? "/dashboard" : "/login"}
                className="rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-text)] transition-all hover:scale-105 hover:bg-slate-50 active:scale-95"
              >
                {user ? "Go to Dashboard" : "Login"}
              </Link>

              <Link
                to={user ? "/dashboard" : "/signup"}
                className="rounded-2xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
              >
                Create Resume
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/65"
            >
              <span>Student-friendly flow</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />
              <span>Clean professional output</span>
              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />
              <span>Built to grow with you</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default CTASection;