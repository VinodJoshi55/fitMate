import React from "react";

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-indigo-100 text-indigo-700",
    secondary: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
};

export default Badge;
