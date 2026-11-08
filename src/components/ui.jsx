import { useEffect } from "react";

export const inputClass =
  "w-full rounded-2xl border border-line bg-ink px-3.5 py-3 text-base text-paper outline-none placeholder:text-mist/45 focus:border-gold/70 focus:ring-2 focus:ring-gold/25";

export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-[#ecd29a] disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-line bg-card px-4 py-2.5 text-sm font-medium text-paper transition hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonDanger =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-bad/15 px-4 py-2.5 text-sm font-semibold text-bad transition hover:bg-bad/25";

export const buttonGhost =
  "inline-flex min-h-11 items-center justify-center rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-paper";

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-mist">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-mist/80">{hint}</span> : null}
    </label>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-3xl leading-none text-paper">{title}</h2>
          <button type="button" className={buttonGhost} onClick={onClose} aria-label="Kapat">
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
