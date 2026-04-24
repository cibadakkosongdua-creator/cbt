import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LiveMonitor from "./LiveMonitor";
import ManageResults from "./ManageResults";
import SubNav, { SubNavPanels } from "../../components/admin/SubNav";

const TABS = [
  { id: "live", label: "Live Monitor", icon: "fa-satellite-dish" },
  { id: "results", label: "Hasil Ujian", icon: "fa-chart-bar" },
];

const MonitoringWrapper = () => {
  const location = useLocation();
  const initial = new URLSearchParams(location.search).get("tab") || "live";
  const [active, setActive] = useState(initial);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t) setActive(t);
  }, [location.search]);

  return (
    <div className="space-y-6">
      <SubNav tabs={TABS} value={active} onChange={setActive} syncQueryParam />
      <SubNavPanels
        active={active}
        panels={{
          live: <LiveMonitor />,
          results: <ManageResults />,
        }}
      />
    </div>
  );
};

export default MonitoringWrapper;
