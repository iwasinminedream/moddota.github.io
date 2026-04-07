import React from "react";
import { DeclarationsContext, type DeclarationsContextType } from "./Docs/DeclarationsContext";
import { HashScrollHandler } from "./ElementLink";
import { DeclarationsSidebar, type HoistType } from "./layout/Sidebar";
import { ContentList } from "./Docs/ContentList";
import { NavBar } from "./layout/NavBar";

export function DeclarationsPage({
  context,
  hoist,
}: {
  context: DeclarationsContextType;
  hoist: HoistType[];
}) {
  return (
    <DeclarationsContext.Provider value={context}>
      <HashScrollHandler />
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <DeclarationsSidebar hoist={hoist} />
        <ContentList />
      </div>
      <style>{`
        @media (max-width: 768px) {
          .api-page-content { flex-direction: column; }
        }
      `}</style>
    </DeclarationsContext.Provider>
  );
}
