import React, { useState } from "react";
import ManageStudents from "./ManageStudents";
import Announcements from "./Announcements";
import SubNav, { SubNavPanels } from "../../components/admin/SubNav";

const TABS = [
  { id: "students", label: "Data Siswa", icon: "fa-users" },
  { id: "announcements", label: "Pengumuman", icon: "fa-bullhorn" },
];

const AcademicWrapper = () => {
  const [active, setActive] = useState("students");
  return (
    <div className="space-y-6">
      <SubNav tabs={TABS} value={active} onChange={setActive} />
      <SubNavPanels
        active={active}
        panels={{
          students: <ManageStudents />,
          announcements: <Announcements />,
        }}
      />
    </div>
  );
};

export default AcademicWrapper;
