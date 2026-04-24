import React from "react";

/**
 * Unified admin page header.
 * Props:
 *  - icon: FA icon class (e.g. "fa-users")
 *  - iconTone: tailwind palette: indigo, emerald, amber, violet, sky, rose, slate
 *  - title: string
 *  - subtitle: string (optional)
 *  - actions: ReactNode placed on the right
 *  - badge: { label, tone } optional small badge next to title
 */
const TONES = {
  indigo: { bg: "from-indigo-500 to-violet-600", ring: "ring-indigo-100", chip: "bg-indigo-50 text-indigo-600" },
  emerald: { bg: "from-emerald-500 to-teal-600", ring: "ring-emerald-100", chip: "bg-emerald-50 text-emerald-600" },
  amber: { bg: "from-amber-500 to-orange-500", ring: "ring-amber-100", chip: "bg-amber-50 text-amber-600" },
  violet: { bg: "from-violet-500 to-fuchsia-500", ring: "ring-violet-100", chip: "bg-violet-50 text-violet-600" },
  sky: { bg: "from-sky-500 to-blue-600", ring: "ring-sky-100", chip: "bg-sky-50 text-sky-600" },
  rose: { bg: "from-rose-500 to-pink-500", ring: "ring-rose-100", chip: "bg-rose-50 text-rose-600" },
  slate: { bg: "from-slate-600 to-slate-800", ring: "ring-slate-100", chip: "bg-slate-100 text-slate-600" },
};

const PageHeader = ({
  icon,
  iconTone = "indigo",
  title,
  subtitle,
  actions,
  badge,
  className = "",
}) => {
  const tone = TONES[iconTone] || TONES.indigo;
  return (
    <header
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.bg} shadow-md ring-4 ${tone.ring}`}
          >
            <i className={`fas ${icon} text-base text-white`} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {title}
            </h1>
            {badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONES[badge.tone || "slate"].chip}`}>
                {badge.icon && <i className={`fas ${badge.icon} text-[10px]`} />}
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
