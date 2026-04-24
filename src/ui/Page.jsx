import React from "react";

export default function Page({ children, className = "" }) {
  return <div className={`min-h-screen app-bg ${className}`}>{children}</div>;
}
