import { darken } from "polished";
import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import SearchIcon from "./search.svg";

const SearchBoxWrapper = styled.div`
  display: flex;
  flex-flow: row;
  flex-shrink: 0;
  align-items: center;
  background-color: ${(props) => props.theme.searchbox.background};
  border: ${(props) => props.theme.searchbox.border};
  border-radius: 32px;
  padding-left: 6px;
  padding-right: 6px;
`;

const SearchBoxInput = styled.input`
  flex: 1;
  padding: 8px;
  background: none;
  border: none;
  outline: none;
  color: ${(props) => props.theme.text};
  font-size: 14px;

  ::placeholder {
    color: ${(props) => props.theme.searchbox.placeholder};
  }
`;

const SearchButton = styled.button<{ isUpdated: boolean }>`
  border: none;
  background-color: ${(props) => darken(props.isUpdated ? 0 : 0.1, props.theme.searchbox.button)};

  path {
    fill: ${(props) => (props.isUpdated ? props.theme.searchbox.buttonFillUpdated : props.theme.searchbox.buttonFill)};
  }

  > * {
    vertical-align: middle;
  }
`;

const AvailabilityFilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid ${(props) => props.theme.groupBorder};
`;

const AvailabilityFilterButton = styled.button<{ color: string; active: boolean }>`
  box-sizing: border-box;
  font-size: 16px;
  line-height: 1;
  width: 24px;
  height: 24px;
  text-align: center;
  user-select: none;
  background: radial-gradient(${(props) => props.color}, ${(props) => darken(0.22, props.color)});
  color: white;
  border-radius: 3px;
  font-weight: bold;
  text-shadow: 1px 1px 1px black;
  box-shadow: 1px 1px 1px #00000030;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  ${(props) =>
    !props.active &&
    css`
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7);
      filter: saturate(10%);
      opacity: 40%;
    `}

  &:hover {
    transform: scale(1.1);
  }
`;

export const composeFilters =
  <T,>(filters: ((member: T) => boolean | undefined)[]) =>
  (value: T) => {
    const results = filters.map((fn) => fn(value));
    if (results.includes(false)) return false;
    if (results.includes(true)) return true;
    return false;
  };

// Context for availability filters
export type AvailabilityFilters = {
  serverEnabled: boolean;
  clientEnabled: boolean;
};

export const AvailabilityFiltersContext = createContext<AvailabilityFilters>({
  serverEnabled: true,
  clientEnabled: true,
});

export function useAvailabilityFilters() {
  return useContext(AvailabilityFiltersContext);
}

export function useRouterSearch() {
  const location = useLocation();
  return new URLSearchParams(location.search).get("search") ?? "";
}

export function useCtrlFHook<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (ref.current && event.ctrlKey && event.key === "f") {
        // Use default CTRL+F only when element already has focus
        if (document.activeElement !== ref.current) event.preventDefault();
        ref.current.focus();
      }
    };

    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [ref.current]);

  return ref;
}

export function SearchBox({ 
  baseUrl, 
  className, 
  showAvailabilityFilters = false,
  serverEnabled = true,
  clientEnabled = true,
  onServerToggle,
  onClientToggle,
}: { 
  baseUrl: string; 
  className?: string; 
  showAvailabilityFilters?: boolean;
  serverEnabled?: boolean;
  clientEnabled?: boolean;
  onServerToggle?: () => void;
  onClientToggle?: () => void;
}) {
  const routerSearch = useRouterSearch();
  const [search, setSearch] = useState(routerSearch);
  useEffect(() => setSearch(routerSearch), [routerSearch]);

  // TODO: Location.state should be nullable
  const history = useHistory<{ searchReferrer?: string } | null>();

  const setSearchQuery = useCallback(
    (query: string) => {
      const { state, pathname, search: urlSearch } = history.location;
      if (query === "") {
        history.push(state?.searchReferrer || baseUrl);
      } else {
        const searchReferrer = state?.searchReferrer || `${pathname}${urlSearch}`;
        history.push(`${baseUrl}?search=${encodeURIComponent(query)}`, { searchReferrer });
      }
    },
    [history, baseUrl],
  );

  const handleSearchButton = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    () => setSearchQuery(search),
    [search, setSearchQuery],
  );
  const handleSearchButtonMouseDown = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (event) => event.preventDefault(),
    [],
  );

  const updateCurrentSearch = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    ({ target: { value } }) => setSearch(value),
    [],
  );
  const handleKey = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
    (event) => event.key === "Enter" && setSearchQuery(search),
    [search, setSearchQuery],
  );

  const ref = useCtrlFHook<HTMLInputElement>();

  return (
    <SearchBoxWrapper className={className}>
      <SearchButton
        isUpdated={search !== routerSearch}
        onClick={handleSearchButton}
        onMouseDown={handleSearchButtonMouseDown}
        title="Search"
      >
        <SearchIcon width={16} height={16} />
      </SearchButton>

      <SearchBoxInput
        placeholder="Search..."
        ref={ref}
        value={search}
        onChange={updateCurrentSearch}
        onKeyUp={handleKey}
        aria-label="Search"
      />
      
      {showAvailabilityFilters && (
        <AvailabilityFilterWrapper>
          <AvailabilityFilterButton
            color="#5b82ee"
            active={serverEnabled}
            onClick={onServerToggle}
            title={serverEnabled ? "Click to hide server-side functions" : "Click to show server-side functions"}
          >
            s
          </AvailabilityFilterButton>
          <AvailabilityFilterButton
            color="#59df37"
            active={clientEnabled}
            onClick={onClientToggle}
            title={clientEnabled ? "Click to hide client-side functions" : "Click to show client-side functions"}
          >
            c
          </AvailabilityFilterButton>
        </AvailabilityFilterWrapper>
      )}
    </SearchBoxWrapper>
  );
}
