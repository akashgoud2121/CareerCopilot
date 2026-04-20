import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

function FeaturesSection() {
  const { user } = useAuth();
  
  const features = [
    {
      number: "01",
      title: "Guided resume flow",
      description:
        "Move step by step with a simple structure that helps you complete your resume with confidence.",
    },
    {
      number: "02",
      title: "Professional output",
      description:
        "Create a resume that feels clean, polished, and ready to share for internships or jobs.",
    },
    {
      number: "03",
      title: "Student-friendly experience",
      description:
        "Designed for students who want something easy to understand without feeling overwhelmed.",
    },
    {
      number: "04",
      title: "AI-ready foundation",
      description:
        "Built to support future Gemini-powered help for writing, improving, and refining your resume.",
    },
  ];

  return (
    <section
      id="features"
      className="bg-white px-6 py-20 md:px-12 md:py-24 lg:px-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#344955]">
              Features
            </p>

            <h2 className="mt-4 text-3xl font-bold leading-tight text-[var(--color-text)] md:text-4xl lg:text-5xl">
              A simpler way to build your resume
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--color-muted)] md:text-lg">
              Career Copilot is designed to feel easy, supportive, and clear so
              students can focus on building, not figuring out what to do next.
            </p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to={user ? "/dashboard" : "/signup"}
                className="rounded-xl bg-[#344955] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Try Builder Now
              </Link>

              <a
                href="#ai-tools"
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#344955] hover:text-[#344955]"
              >
                Explore More
              </a>
            </motion.div>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[36px] top-0 hidden h-full w-px bg-slate-200 md:block" />

            {features.map((feature, index) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative h-[80vh] min-h-[520px]"
              >
                <div className="sticky top-24">
                  <div className="grid gap-6 md:grid-cols-[72px_1fr] md:gap-8">
                    <div className="relative hidden md:flex md:justify-center">
                      <motion.div 
                        initial={{ scale: 0.8 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-8 border-white bg-[#344955] text-white shadow-[0_12px_30px_rgba(52,73,85,0.18)]"
                      >
                        <span className="text-lg font-bold">
                          {feature.number}
                        </span>
                      </motion.div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-3 md:hidden">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#344955] text-sm font-bold text-white shadow-[0_10px_24px_rgba(52,73,85,0.16)]">
                          {feature.number}
                        </span>
                      </div>

                      <p className="text-sm font-semibold tracking-[0.18em] text-[#344955]">
                        Step {feature.number}
                      </p>

                      <h3 className="mt-3 text-2xl font-bold text-[var(--color-text)] md:text-3xl">
                        {feature.title}
                      </h3>

                      <p className="mt-4 max-w-xl text-base leading-8 text-[var(--color-muted)] md:text-lg">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;