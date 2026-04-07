import React, { useContext, useState, useCallback, useEffect } from "react";
import { LazyList, ScrollableList } from "../Lists";
import { getFilteredData } from "./utils/filtering";
import { ClassDeclaration } from "./ClassDeclaration";
import { Constant } from "./Constant";
import { Enum } from "./Enum";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { CssProperty } from "./CssProperty";
import type { Declaration } from "./api";
import { DeclarationsContext } from "./DeclarationsContext";
import { AvailabilityFiltersContext, SearchBox, getSearchFromUrl } from "../Search";

function getBase(): string {
  if (typeof document === "undefined") return "/moddota.github.io/";
  return document.querySelector("base")?.getAttribute("href") || "/";
}

/** Extract the scope segment from the current URL relative to the API root.
 *  e.g. for path /moddota.github.io/api/vscripts/CDOTA_BaseNPC and root=/vscripts
 *  returns "CDOTA_BaseNPC". For the base path returns "". */
function getScopeFromUrl(root: string): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  const base = getBase();
  // Expected path pattern: {base}api{root}/{scope}
  const prefix = `${base}api${root}`;
  if (!path.startsWith(prefix)) return "";
  const rest = path.slice(prefix.length).replace(/^\//, "").replace(/\/$/, "");
  return rest;
}

function renderItem(declaration: Declaration, style?: React.CSSProperties) {
  let children: JSX.Element;
  switch (declaration.kind) {
    case "class":
      children = <ClassDeclaration declaration={declaration} />;
      break;
    case "enum":
      children = <Enum element={declaration} />;
      break;
    case "constant":
      children = <Constant element={declaration} />;
      break;
    case "function":
      children = <FunctionDeclaration context="functions" declaration={declaration} />;
      break;
    case "cssProperty":
      children = <CssProperty element={declaration} />;
      break;
  }

  return (
    <div style={{ boxSizing: "border-box", padding: 6, ...style }} key={declaration.name}>
      {children}
    </div>
  );
}

export function ContentList({ hasHoist = true }: { hasHoist?: boolean }) {
  const { root, declarations } = useContext(DeclarationsContext);
  const showAvailabilityFilters = root === "/vscripts";

  const [mounted, setMounted] = useState(false);
  const [serverEnabled, setServerEnabled] = useState(true);
  const [clientEnabled, setClientEnabled] = useState(true);
  const [search, setSearch] = useState(() => getSearchFromUrl());
  const [scope, setScope] = useState(() => {
    if (typeof window === "undefined") return "";
    return getScopeFromUrl(root);
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = () => {
      setSearch(getSearchFromUrl());
      setScope(getScopeFromUrl(root));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [root]);

  const handleServerToggle = useCallback(() => {
    if (!clientEnabled && serverEnabled) return;
    const newVal = !serverEnabled;
    setServerEnabled(newVal);
    if (!newVal) setClientEnabled(true);
  }, [serverEnabled, clientEnabled]);

  const handleClientToggle = useCallback(() => {
    if (!serverEnabled && clientEnabled) return;
    const newVal = !clientEnabled;
    setClientEnabled(newVal);
    if (!newVal) setServerEnabled(true);
  }, [serverEnabled, clientEnabled]);

  const effectiveScope = search ? "" : scope;
  const { data, isSearching } = getFilteredData(declarations, search, effectiveScope, { serverEnabled, clientEnabled });

  // Show placeholder during SSR, or when page has hoist sections and nothing is selected
  const showPlaceholder = !mounted || (hasHoist && !search && !scope);

  return (
    <AvailabilityFiltersContext.Provider value={{ serverEnabled, clientEnabled }}>
      <main className="api-content-main" style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 0 0 24px" }}>
        <SearchBox
          baseUrl={root}
          showAvailabilityFilters={showAvailabilityFilters}
          serverEnabled={serverEnabled}
          clientEnabled={clientEnabled}
          onServerToggle={handleServerToggle}
          onClientToggle={handleClientToggle}
        />

        {showPlaceholder ? (
          <div style={{ marginTop: 50, alignSelf: "center", fontSize: 24, textAlign: "center", color: "var(--color-text-faded)" }}>
            Use the search bar or select a category from the sidebar
          </div>
        ) : data.length > 0 ? (
          isSearching ? (
            <LazyList data={data} render={renderItem} />
          ) : (
            <ScrollableList data={data} render={renderItem} />
          )
        ) : isSearching ? (
          <div style={{ marginTop: 50, alignSelf: "center", fontSize: 42, textAlign: "center" }}>No results found</div>
        ) : null}

        {}
      </main>
    </AvailabilityFiltersContext.Provider>
  );
}
