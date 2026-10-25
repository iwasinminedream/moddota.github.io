import React, { useCallback, useEffect } from "react";
import { notifySearchChange } from "./Search";

function getBase(): string {
  return document.querySelector("base")?.getAttribute("href") || "";
}

// The element a `#hash` names. getElementById, not querySelector: declaration names such
// as `$` are not valid CSS selectors.
function getHashTarget(): HTMLElement | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  let id = hash;
  try {
    id = decodeURIComponent(hash);
  } catch {
    // Malformed escape: look the raw value up.
  }
  return document.getElementById(id);
}

/** Scrolls to the element the URL's `#hash` names, if it is on the page. */
export function scrollToHash() {
  getHashTarget()?.scrollIntoView();
}

// The scroll on page load is done by ContentList once the list has rendered
// (it renders only after mount, so the element is not there yet when this mounts).
export function HashScrollHandler() {
  useEffect(() => {
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return null;
}

/** Follows a link to `api<root>/…`. On the page that shows `root` it only updates the URL
 *  (the list re-renders from it); anywhere else — e.g. a card on the all-search page —
 *  the URL would change while the page stays the same, so it loads the target page. */
export function followApiLink(e: React.MouseEvent, root: string, href: string) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const prefix = `${getBase()}api${root}`;
  const path = window.location.pathname;
  if (path === prefix || path.startsWith(`${prefix}/`)) {
    window.history.pushState({}, "", href);
    notifySearchChange();
  } else {
    window.location.assign(href);
  }
}

export function useLinkedElement(root: string, { scope, hash }: { scope?: string; hash?: string }) {
  const urlHash = hash ? `#${hash}` : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";
  // Match on the scope part of the URL
  return scope !== undefined && path.endsWith(`/${scope}`) && currentHash === urlHash;
}

export function ElementLink({ root, scope, hash }: { root: string; scope: string; hash?: string }) {
  const base = typeof window !== "undefined" ? getBase() : "";
  const urlHash = hash ? `#${hash}` : "";
  const href = `${base}api${root}/${scope}${urlHash}`;

  const handleClick = useCallback((e: React.MouseEvent) => followApiLink(e, root, href), [root, href]);

  return (
    <a
      href={href}
      onClick={handleClick}
      title="Link"
      style={{
        marginRight: 2,
        fontSize: 24,
        lineHeight: 1,
        textDecoration: "none",
        color: "var(--color-text)",
        userSelect: "none",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      #
    </a>
  );
}
