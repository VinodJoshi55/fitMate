import React from "react";

const Button = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const baseStyles =
    "font-semibold rounded-lg transition duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs sm:text-sm",
    md: "py-2 px-4 sm:py-3 sm:px-6 text-sm sm:text-base",
    lg: "py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg",
  };
  const variantStyles = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg disabled:hover:bg-indigo-600",
    outline:
      "border-2 border-gray-300 hover:border-indigo-600 hover:bg-indigo-50 text-gray-700 disabled:hover:border-gray-300 disabled:hover:bg-transparent",
    destructive:
      "bg-red-600 hover:bg-red-700 text-white shadow-md disabled:hover:bg-red-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
