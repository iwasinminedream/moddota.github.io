import React, { useContext, useMemo } from "react";
import { doSearch } from "./utils/filtering";
import { DeclarationsContext } from "./DeclarationsContext";

export const ReferencesLink: React.FC<{ name: string }> = ({ name }) => {
  const { root, declarations } = useContext(DeclarationsContext);
  const base = typeof window !== "undefined" ? document.querySelector("base")?.getAttribute("href") || "" : "";
  const search = `?search=${encodeURIComponent(`type:${name}`)}`;
  const referencesCount = useMemo(() => {
    const references = doSearch(declarations, [`type:${name.toLowerCase()}`]);
    return references.reduce(
      (n, e) => n + (e.kind === "class" ? e.members.length + (e.extend === name ? 1 : 0) : 1),
      0,
    );
  }, [name]);

  return (
    <a
      // The count is over this page's declarations, so the search must run on this page too.
      href={`${base}api${root}${search}`}
      title="Find all usages of this API"
      style={{ marginRight: 4, color: "var(--color-text)", fontSize: 14 }}
    >
      {referencesCount} reference{referencesCount === 1 ? "" : "s"}
    </a>
  );
};
