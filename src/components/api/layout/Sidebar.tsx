import React, { useContext, useCallback } from "react";
import { KindIcon, type IconKind } from "../KindIcon";
import type { Declaration } from "../Docs/api";
import { DeclarationsContext } from "../Docs/DeclarationsContext";
import { Star } from "../Docs/Star";

export type HoistType = {
  label: string;
  icon: IconKind;
  scope: string;
};

function getBase(): string {
  if (typeof document === "undefined") return "/moddota.github.io/";
  return document.querySelector("base")?.getAttribute("href") || "/";
}

export function DeclarationsSidebar({ hoist }: { hoist: HoistType[] }) {
  const { root, declarations } = useContext(DeclarationsContext);
  const base = typeof window !== "undefined" ? getBase() : "/";
  const hoistedKinds = hoist.map((h) => h.scope);

  const filteredDeclarations = declarations.filter(
    (d) =>
      !(d.kind === "function" && hoistedKinds.includes("functions")) &&
      !(d.kind === "constant" && hoistedKinds.includes("constants")) &&
      !(d.kind === "cssProperty" && hoistedKinds.includes("properties")),
  );

  return (
    <div
      style={{
        width: 340,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexFlow: "column",
        overflowY: "scroll",
        padding: "2px 12px",
      }}
      className="api-sidebar"
    >
      {hoist.map((h) => (
        <SidebarElement key={h.scope} to={`${base}api${root}/${h.scope}`} icon={h.icon} text={h.label} />
      ))}
      {filteredDeclarations.map((d) => (
        <SidebarElement
          key={d.name}
          to={`${base}api${root}/${d.name}`}
          icon={d.kind}
          text={d.name}
          extra={d.isStarred ? <Star style={{ float: "right" }} /> : undefined}
        />
      ))}

      <style>{`
        @media (max-width: 1100px) { .api-sidebar { width: 200px !important; } }
        @media (max-width: 768px) { .api-sidebar { width: 100% !important; max-height: 40vh; border-bottom: 1px solid var(--color-group-border); } }
      `}</style>
    </div>
  );
}

function SidebarElement({
  to,
  icon,
  text,
  extra,
}: {
  to: string;
  icon: IconKind;
  text: string;
  extra?: React.ReactNode;
}) {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const isActive = currentPath === to || currentPath === to + "/";

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      window.history.pushState({}, "", to);
      window.dispatchEvent(new Event("popstate"));
    },
    [to],
  );

  return (
    <a
      href={to}
      onClick={handleClick}
      style={{
        background: isActive ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
        borderBottom: isActive ? "3px solid var(--color-highlight)" : "3px solid transparent",
        borderRadius: 3,
        padding: "2px 2px 0 2px",
        textDecoration: "none",
        color: "var(--color-text)",
        wordBreak: "break-all",
        fontWeight: isActive ? 600 : "normal",
        marginBottom: 3,
        display: "block",
      }}
    >
      <KindIcon kind={icon} size="small" /> {text}
      {extra}
    </a>
  );
}
