import React from "react";

export default function Card({ children, className = "" }) {
  return <div className={`card rounded-2xl ${className}`}>{children}</div>;
}
