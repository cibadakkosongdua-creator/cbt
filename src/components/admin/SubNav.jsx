import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Unified sub-navigation for admin wrapper pages.
 * Handles both controlled (via `value/onChange`) and URL-synced modes.
 *
 * Props:
 *  - tabs: [{ id, label, icon }]
 *  - defaultTab: string — initial tab if none specified in URL
 *  - syncQueryParam: boolean — if true, reads/writes ?tab= in URL
 *  - value, onChange: optional controlled mode
 */
const SubNav = ({
  tabs = [],
  defaultTab,
  syncQueryParam = false,
  value,
  onChange,
  className = "",
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryTab = (() => {
    if (!syncQueryParam) return null;
    const p = new URLSearchParams(location.search);
    return p.get("tab");
  })();

  const initial = value ?? queryTab ?? defaultTab ?? tabs[0]?.id;
  const [internal, setInternal] = useState(initial);

  useEffect(() => {
    if (syncQueryParam && queryTab && queryTab !== internal) {
      setInternal(queryTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTab]);

  const active = value ?? internal;

  const handleChange = (id) => {
    if (onChange) onChange(id);
    else setInternal(id);
    if (syncQueryParam) {
      const params = new URLSearchParams(location.search);
      params.set("tab", id);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div
        role="tablist"
        aria-label="Sub navigasi"
        className="flex w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(t.id)}
              className={`relative shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
              }`}
            >
              {t.icon && <i className={`fas ${t.icon} text-sm`} />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Render selected child by id using tabs.panels map
export const SubNavPanels = ({ active, panels }) => {
  const node = panels[active];
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {node}
    </div>
  );
};

export default SubNav;
