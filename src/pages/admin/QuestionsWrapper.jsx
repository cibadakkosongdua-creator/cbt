import React, { useState } from "react";
import ManageQuestions from "./ManageQuestions";
import ItemAnalysis from "./ItemAnalysis";
import SubNav, { SubNavPanels } from "../../components/admin/SubNav";

const TABS = [
  { id: "bank", label: "Bank Soal", icon: "fa-book" },
  { id: "analysis", label: "Analisis Soal", icon: "fa-microscope" },
];

const QuestionsWrapper = () => {
  const [active, setActive] = useState("bank");
  return (
    <div className="space-y-6">
      <SubNav tabs={TABS} value={active} onChange={setActive} />
      <SubNavPanels
        active={active}
        panels={{
          bank: <ManageQuestions />,
          analysis: <ItemAnalysis />,
        }}
      />
    </div>
  );
};

export default QuestionsWrapper;
