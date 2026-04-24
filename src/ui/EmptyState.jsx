import React from 'react';

/* ── Inline SVG Illustrations ── */
const illustrations = {
  "fa-folder-open": (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Folder body */}
      <rect x="20" y="40" width="80" height="55" rx="8" fill="url(#folderGrad)" opacity="0.9"/>
      <path d="M20 48C20 43.58 23.58 40 28 40H48L56 30H92C96.42 30 100 33.58 100 38V40H20V48Z" fill="url(#folderTab)" opacity="0.7"/>
      {/* Sparkle dots */}
      <circle cx="60" cy="65" r="8" fill="white" opacity="0.3"/>
      <circle cx="45" cy="72" r="3" fill="#fbbf24" opacity="0.8" className="animate-pulse"/>
      <circle cx="78" cy="58" r="2.5" fill="#a78bfa" opacity="0.7" className="animate-bounce"/>
      <circle cx="85" cy="78" r="2" fill="#34d399" opacity="0.6"/>
      <defs>
        <linearGradient id="folderGrad" x1="20" y1="40" x2="100" y2="95"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient>
        <linearGradient id="folderTab" x1="20" y1="30" x2="100" y2="40"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  ),
  "fa-chart-column": (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Chart bars */}
      <rect x="22" y="70" width="14" height="30" rx="4" fill="#818cf8" opacity="0.4"/>
      <rect x="42" y="50" width="14" height="50" rx="4" fill="#818cf8" opacity="0.6"/>
      <rect x="62" y="35" width="14" height="65" rx="4" fill="url(#chartGrad)" opacity="0.8"/>
      <rect x="82" y="55" width="14" height="45" rx="4" fill="#818cf8" opacity="0.5"/>
      {/* Trend line */}
      <path d="M28 68 L48 48 L68 33 L88 53" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" opacity="0.6"/>
      {/* Star */}
      <circle cx="68" cy="28" r="5" fill="#fbbf24" opacity="0.8" className="animate-pulse"/>
      <defs>
        <linearGradient id="chartGrad" x1="62" y1="35" x2="76" y2="100"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  ),
  "fa-users": (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Person 1 (center) */}
      <circle cx="60" cy="42" r="14" fill="url(#userGrad1)" opacity="0.8"/>
      <path d="M36 90C36 74 46 64 60 64C74 64 84 74 84 90" stroke="url(#userGrad1)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.3"/>
      {/* Person 2 (left) */}
      <circle cx="32" cy="50" r="9" fill="#a78bfa" opacity="0.5"/>
      <path d="M18 82C18 72 24 66 32 66C40 66 46 72 46 82" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.2"/>
      {/* Person 3 (right) */}
      <circle cx="88" cy="50" r="9" fill="#34d399" opacity="0.5"/>
      <path d="M74 82C74 72 80 66 88 66C96 66 102 72 102 82" stroke="#34d399" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.2"/>
      {/* Sparkle */}
      <circle cx="75" cy="35" r="3" fill="#fbbf24" opacity="0.7" className="animate-bounce"/>
      <defs>
        <linearGradient id="userGrad1" x1="46" y1="28" x2="74" y2="56"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient>
      </defs>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Box */}
      <rect x="30" y="35" width="60" height="55" rx="10" fill="url(#boxGrad)" opacity="0.7"/>
      <path d="M30 50H90" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      {/* Question mark */}
      <path d="M55 60C55 55 58 52 63 52C68 52 71 55 71 59C71 63 67 64 64 66V70" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      <circle cx="64" cy="76" r="2" fill="white" opacity="0.6"/>
      {/* Decorative */}
      <circle cx="80" cy="32" r="4" fill="#fbbf24" opacity="0.6" className="animate-pulse"/>
      <circle cx="38" cy="30" r="2.5" fill="#34d399" opacity="0.5" className="animate-bounce"/>
      <circle cx="92" cy="70" r="2" fill="#f472b6" opacity="0.4"/>
      <defs>
        <linearGradient id="boxGrad" x1="30" y1="35" x2="90" y2="90"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient>
      </defs>
    </svg>
  ),
};

const getIllustration = (icon) => {
  return illustrations[icon] || illustrations.default;
};

const EmptyState = ({ 
  icon = "fa-folder-open", 
  title = "Belum Ada Data", 
  description = "Data yang Anda cari masih kosong atau belum ditambahkan.",
  colSpan = 1,
  isTable = true,
  size = "large" // "large" | "small"
}) => {
  const isSmall = size === "small";

  const content = (
    <div className={`px-4 ${isTable ? 'py-20' : isSmall ? 'py-2' : 'py-10'} text-center w-full`}>
      <div className="flex flex-col items-center justify-center">
          <div className={`relative ${isSmall ? 'mb-3' : 'mb-6'} group cursor-default`}>
            {/* Illustration Container */}
            <div className={`relative flex ${isSmall ? 'h-16 w-16 rounded-2xl' : 'h-24 w-24 rounded-3xl'} items-center justify-center bg-slate-50 border border-slate-200 transition-transform duration-500 transform group-hover:-translate-y-1 p-3`}>
              {isSmall ? (
                <i className={`fas ${icon} ${isSmall ? 'text-2xl' : 'text-4xl'} text-slate-300`}></i>
              ) : (
                getIllustration(icon)
              )}
            </div>
          </div>
          
          <h3 className={`${isSmall ? 'text-sm font-bold' : 'text-lg font-black'} text-slate-800 mb-1 tracking-tight`}>{title}</h3>
          <p className={`max-w-sm ${isSmall ? 'text-[11px]' : 'text-sm'} text-slate-500 font-medium leading-relaxed`}>
            {description}
          </p>
        </div>
      </div>
  );

  if (!isTable) return content;

  return (
    <tr>
      <td colSpan={colSpan}>
        {content}
      </td>
    </tr>
  );
};

export default EmptyState;
