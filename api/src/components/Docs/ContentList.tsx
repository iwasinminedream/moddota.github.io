import React, { useContext, useState, useCallback } from "react";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { Author } from "~components/Author";
import { LazyList, ScrollableList } from "~components/Lists";
import { useFilteredData } from "./utils/filtering";
import { ClassDeclaration } from "./ClassDeclaration";
import { Constant } from "./Constant";
import { Enum } from "./Enum";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { CssProperty } from "./CssProperty";
import { Declaration } from "~components/Docs/api";
import { DeclarationsContext } from "~components/Docs/DeclarationsContext";
import { AvailabilityFiltersContext } from "~components/Search";

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
    <ListItem style={style} key={declaration.name}>
      {children}
    </ListItem>
  );
}

export function ContentList() {
  const { root, declarations } = useContext(DeclarationsContext);
  
  // Show availability filters only for vscripts (Lua API)
  const showAvailabilityFilters = root === "/vscripts";
  
  // Availability filter state
  const [serverEnabled, setServerEnabled] = useState(true);
  const [clientEnabled, setClientEnabled] = useState(true);
  
  const handleServerToggle = useCallback(() => {
    // Can't disable if client is already disabled
    if (!clientEnabled && serverEnabled) return;
    
    const newServerEnabled = !serverEnabled;
    setServerEnabled(newServerEnabled);
    // Auto-enable client if we're disabling server
    if (!newServerEnabled) {
      setClientEnabled(true);
    }
  }, [serverEnabled, clientEnabled]);
  
  const handleClientToggle = useCallback(() => {
    // Can't disable if server is already disabled
    if (!serverEnabled && clientEnabled) return;
    
    const newClientEnabled = !clientEnabled;
    setClientEnabled(newClientEnabled);
    // Auto-enable server if we're disabling client
    if (!newClientEnabled) {
      setServerEnabled(true);
    }
  }, [serverEnabled, clientEnabled]);
  
  const { data, isSearching } = useFilteredData(declarations, { serverEnabled, clientEnabled });

  return (
    <AvailabilityFiltersContext.Provider value={{ serverEnabled, clientEnabled }}>
      <ContentWrapper>
        <StyledSearchBox 
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
          <TextMessage>No results found</TextMessage>
        ) : (
          <TextMessage>Choose a category or use the search bar...</TextMessage>
        )}

        {!isSearching && !data.length && <Author />}
      </ContentWrapper>
    </AvailabilityFiltersContext.Provider>
  );
}
