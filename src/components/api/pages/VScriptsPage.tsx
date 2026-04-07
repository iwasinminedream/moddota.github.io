import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { vscriptsScope } from "../../../data/vscripts-data";

export function VScriptsPage() {
  return (
    <DeclarationsPage
      context={vscriptsScope}
      hoist={[
        { label: "Functions", icon: "function", scope: "functions" },
        { label: "Constants", icon: "constant", scope: "constants" },
      ]}
    />
  );
}
