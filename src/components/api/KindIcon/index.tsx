import React from "react";

export type IconKind = "class" | "enum" | "constant" | "field" | "interface" | "function" | "cssProperty";

// Inline SVG icons based on VS Code IntelliSense icons
const iconPaths: Record<IconKind, { color: string; letter: string }> = {
  class: { color: "#E5A411", letter: "C" },
  enum: { color: "#E5A411", letter: "E" },
  constant: { color: "#E5A411", letter: "e" },
  field: { color: "#52AAFC", letter: "F" },
  interface: { color: "#2BAB64", letter: "I" },
  function: { color: "#B365E0", letter: "M" },
  cssProperty: { color: "#52AAFC", letter: "F" },
};

export const KindIcon: React.FC<{
  className?: string;
  kind: IconKind;
  size: "small" | "medium" | "big";
}> = React.memo(({ className, kind, size }) => {
  const s = size === "small" ? 16 : size === "medium" ? 20 : 24;
  const { color, letter } = iconPaths[kind];

  return (
    <svg className={className} width={s} height={s} viewBox="0 0 16 16" style={{ verticalAlign: "middle" }}>
      <rect x="1" y="1" width="14" height="14" rx="2" fill={color} />
      <text
        x="8"
        y="12"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {letter}
      </text>
    </svg>
  );
});
