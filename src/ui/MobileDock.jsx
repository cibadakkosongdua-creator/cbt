import React from "react";

/**
 * Bottom navigation dock (mobile only).
 * Features an animated indicator pill that slides between active items
 * for a more modern, polished feel.
 */
export default function MobileDock({ items, activeId, onChange }) {
  const activeIdx = Math.max(
    0,
    items.findIndex((it) => it.id === activeId),
  );

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 w-full md:hidden">
      <div
        className="relative bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-8px_32px_rgb(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Animated top indicator bar that slides with the active tab */}
        <div
          className="absolute top-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
          style={{
            width: `${100 / items.length}%`,
            left: `${(activeIdx * 100) / items.length}%`,
          }}
          aria-hidden="true"
        />

        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
        >
          {items.map((it) => {
            const isActive = it.id === activeId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onChange?.(it.id)}
                className={`relative flex min-w-0 flex-col items-center gap-1 py-2.5 px-1 transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={`flex h-9 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-br from-indigo-50 to-violet-50 scale-105"
                      : "scale-100"
                  }`}
                >
                  <i
                    className={`fas ${it.icon} text-base transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-none truncate w-full text-center transition-colors ${
                    isActive ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
