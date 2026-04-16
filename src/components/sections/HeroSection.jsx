import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HeroImage from "../../assets/HeroPreviewImage.png";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-81px)] overflow-hidden bg-white px-6 md:px-12 lg:px-20">
      {/* Background decorative elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-violet-100/40 blur-[120px]" />
        <div className="absolute -right-[5%] top-[20%] h-[400px] w-[400px] rounded-full bg-orange-50/30 blur-[100px]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.p 
            variants={fadeInUp}
            className="mb-4 inline-flex rounded-full bg-violet-50 px-4 py-1 text-sm font-medium text-[var(--color-primary)]"
          >
            More than just a tool
          </motion.p>

          <motion.h1 
            variants={fadeInUp}
            className="max-w-3xl text-4xl font-bold leading-tight text-[var(--color-text)] md:text-5xl lg:text-6xl"
          >
            Your career starts with a <span className="text-[var(--color-primary)]">better resume</span>
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-base leading-7 text-[var(--color-muted)] md:text-lg"
          >
            Career Copilot helps students begin with a professional resume and
            evolves into a complete career support platform. Start building
            today, grow with AI tools tomorrow.
          </motion.p>

          <motion.div 
            variants={fadeInUp}
            className="mt-8 flex flex-col gap-4 sm:flex-row"
          >
            <Link
              to="/signup"
              className="group relative overflow-hidden rounded-xl bg-[var(--color-primary)] px-8 py-4 text-center text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              <span className="relative z-10">Create Resume</span>
              <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            </Link>

            <a
              href="#features"
              className="rounded-xl border border-slate-200 px-8 py-4 text-center text-sm font-semibold text-slate-700 transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]"
            >
              Explore Features
            </a>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-[var(--color-accent-2)]/30 blur-3xl" />
          <div className="absolute -bottom-8 -right-6 h-40 w-40 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />

          <motion.div 
            animate={{ 
              y: [0, -15, 0],
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
          >
            <img
              src={HeroImage}
              alt="Career Copilot resume builder preview"
              className="h-full w-full rounded-2xl object-cover"
            />
          </motion.div>
        </motion.div>
      </div>


    </section>
  );
}

export default HeroSection;