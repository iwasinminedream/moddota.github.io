import React from "react";

export function Star({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={{ fontSize: 12, ...style }} title="This event is useful for custom games">
      &#11088;
    </span>
  );
}
