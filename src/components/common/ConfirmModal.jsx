import { motion, AnimatePresence } from "framer-motion";
import { IoAlertCircleOutline } from "react-icons/io5";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 10 }
};

function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger" // 'danger' or 'info'
}) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${isDanger ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'}`}>
              <IoAlertCircleOutline size={32} />
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-slate-900">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {message}
            </p>

            {/* Actions */}
            <div className="mt-8 flex w-full flex-col gap-3">
              <button
                onClick={onConfirm}
                className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isDanger 
                    ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700' 
                    : 'bg-violet-600 shadow-violet-200 hover:bg-violet-700'
                }`}
              >
                {confirmText}
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-[0.98]"
              >
                {cancelText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ConfirmModal;
