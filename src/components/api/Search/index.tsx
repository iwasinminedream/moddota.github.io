import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";

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

export function getSearchFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("search") ?? "";
}

export function useCtrlFHook<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (ref.current && event.ctrlKey && event.key === "f") {
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
  const [search, setSearch] = useState(() => getSearchFromUrl());

  useEffect(() => {
    const s = getSearchFromUrl();
    setSearch(s);
  }, []);

  const setSearchQuery = useCallback(
    (query: string) => {
      const base = document.querySelector("base")?.getAttribute("href") || "/";
      if (query === "") {
        window.history.pushState({}, "", `${base}api${baseUrl}`);
      } else {
        window.history.pushState({}, "", `${base}api${baseUrl}?search=${encodeURIComponent(query)}`);
      }
      window.dispatchEvent(new Event("popstate"));
    },
    [baseUrl],
  );

  const handleKey = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") setSearchQuery(search);
    },
    [search, setSearchQuery],
  );

  const ref = useCtrlFHook<HTMLInputElement>();

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexFlow: "row",
        flexShrink: 0,
        alignItems: "center",
        backgroundColor: "var(--color-searchbox-bg)",
        border: "var(--color-searchbox-border)",
        borderRadius: 32,
        padding: "0 6px",
        margin: 6,
      }}
    >
      <button
        onClick={() => setSearchQuery(search)}
        onMouseDown={(e) => e.preventDefault()}
        title="Search"
        style={{
          border: "none",
          backgroundColor: "var(--color-searchbox-button)",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx="7" cy="7" r="5" fill="none" stroke="var(--color-searchbox-button-fill)" strokeWidth="2" />
          <line
            x1="11"
            y1="11"
            x2="14"
            y2="14"
            stroke="var(--color-searchbox-button-fill)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <input
        ref={ref}
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyUp={handleKey}
        aria-label="Search"
        style={{
          flex: 1,
          padding: 8,
          background: "none",
          border: "none",
          outline: "none",
          color: "var(--color-text)",
          fontSize: 14,
        }}
      />

      {showAvailabilityFilters && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginLeft: 8,
            paddingLeft: 8,
            borderLeft: "1px solid var(--color-group-border)",
          }}
        >
          <AvailabilityFilterButton color="#5b82ee" active={serverEnabled} onClick={onServerToggle} label="s" />
          <AvailabilityFilterButton color="#59df37" active={clientEnabled} onClick={onClientToggle} label="c" />
        </div>
      )}
    </div>
  );
}

function AvailabilityFilterButton({
  color,
  active,
  onClick,
  label,
}: {
  color: string;
  active: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={`Click to ${active ? "hide" : "show"} ${label === "s" ? "server" : "client"}-side functions`}
      style={{
        boxSizing: "border-box",
        fontSize: 16,
        lineHeight: 1,
        width: 24,
        height: 24,
        textAlign: "center",
        userSelect: "none",
        background: `radial-gradient(${color}, ${color}88)`,
        color: "white",
        borderRadius: 3,
        fontWeight: "bold",
        textShadow: "1px 1px 1px black",
        boxShadow: active ? "1px 1px 1px #00000030" : "inset 0 0 10px rgba(0,0,0,0.7)",
        border: "none",
        cursor: "pointer",
        filter: active ? "none" : "saturate(10%)",
        opacity: active ? 1 : 0.4,
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
