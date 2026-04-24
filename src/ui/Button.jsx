import React from "react";

const styles = {
  primary: "btn btn-primary",
  ghost: "btn btn-ghost",
  danger: "btn btn-danger",
  outline: "btn btn-outline",
  success: "btn btn-success",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const cn = styles[variant] || styles.primary;
  return (
    <button type={type} className={`${cn} ${className}`} {...props}>
      {children}
    </button>
  );
}
