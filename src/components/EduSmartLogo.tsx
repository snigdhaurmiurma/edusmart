import React from "react";

interface EduSmartLogoProps {
  variant?: "student" | "admin";
  compact?: boolean;
  onClick?: () => void;
}

export const EduSmartLogo: React.FC<EduSmartLogoProps> = ({
  variant = "student",
  compact = false,
  onClick,
}) => {
  const title = variant === "admin" ? "Admin Panel" : "EduSmart";
  const subtitle = variant === "admin" ? "Edu Smart" : "Your AI Academic Companion";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 11,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: compact ? 38 : 44,
          height: compact ? 38 : 44,
          borderRadius: 12,
          background: "linear-gradient(145deg, #4eb0fb 0%, #2784f3 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(39, 132, 243, 0.28)",
          flexShrink: 0,
        }}
      >
        <svg
          width={compact ? 24 : 28}
          height={compact ? 24 : 28}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 5L3.5 10.2L14 15.4L24.5 10.2L14 5Z"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12.6V18.3C7.5 19.6 10.4 21.4 14 21.4C17.6 21.4 20.5 19.6 20.5 18.3V12.6"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23.5 11.2V18.6"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <circle cx="23.5" cy="19.6" r="1.2" fill="#FFFFFF" />
        </svg>
      </div>
      <div style={{ lineHeight: 1.15 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? "1.1rem" : "1.28rem",
            fontWeight: 800,
            color: "var(--brand-blue)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: compact ? "0.68rem" : "0.74rem",
            fontWeight: 600,
            color: "#2b62cb",
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};
