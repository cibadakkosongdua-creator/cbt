import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Settings from "./Settings";
import ManageAdmins from "./ManageAdmins";
import ActivityLog from "./ActivityLog";
import SubNav, { SubNavPanels } from "../../components/admin/SubNav";

const TABS = [
  { id: "settings", label: "Pengaturan Ujian", icon: "fa-sliders-h" },
  { id: "admins", label: "Manajemen Admin", icon: "fa-user-shield" },
  { id: "activity", label: "Activity Log", icon: "fa-clock-rotate-left" },
];

const SystemWrapper = ({ onPreview }) => {
  const location = useLocation();
  const initial = new URLSearchParams(location.search).get("tab") || "settings";
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
          settings: <Settings onPreview={onPreview} />,
          admins: <ManageAdmins />,
          activity: <ActivityLog />,
        }}
      />
    </div>
  );
};

export default SystemWrapper;
