import React, { useContext, useState, useCallback, useEffect } from "react";
import { Author } from "../Author";
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

export function ContentList() {
  const { root, declarations } = useContext(DeclarationsContext);
  const showAvailabilityFilters = root === "/vscripts";

  const [serverEnabled, setServerEnabled] = useState(true);
  const [clientEnabled, setClientEnabled] = useState(true);
  const [search, setSearch] = useState(() => getSearchFromUrl());
  const [scope, setScope] = useState(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);
    // scope is the last segment after the route base
    return parts[parts.length - 1] || "";
  });

  useEffect(() => {
    const handler = () => {
      setSearch(getSearchFromUrl());
      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean);
      setScope(parts[parts.length - 1] || "");
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

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

  // Determine scope: for pages like /api/vscripts/CDOTA_BaseNPC, scope is CDOTA_BaseNPC
  // For search, we use the search query
  const effectiveScope = search ? "" : scope;
  const { data, isSearching } = getFilteredData(declarations, search, effectiveScope, { serverEnabled, clientEnabled });

  return (
    <AvailabilityFiltersContext.Provider value={{ serverEnabled, clientEnabled }}>
      <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: "0 0 0 24px" }}>
        <SearchBox
          baseUrl={root}
          showAvailabilityFilters={showAvailabilityFilters}
          serverEnabled={serverEnabled}
          clientEnabled={clientEnabled}
          onServerToggle={handleServerToggle}
          onClientToggle={handleClientToggle}
        />

        {data.length > 0 ? (
          isSearching ? (
            <LazyList data={data} render={renderItem} />
          ) : (
            <ScrollableList data={data} render={renderItem} />
          )
        ) : isSearching ? (
          <div style={{ marginTop: 50, alignSelf: "center", fontSize: 42, textAlign: "center" }}>No results found</div>
        ) : (
          <div style={{ marginTop: 50, alignSelf: "center", fontSize: 42, textAlign: "center" }}>
            Choose a category or use the search bar...
          </div>
        )}

        {!isSearching && !data.length && <Author />}
      </main>
    </AvailabilityFiltersContext.Provider>
  );
}
