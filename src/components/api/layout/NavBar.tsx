import React, { useState, useEffect } from "react";

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkmode, setDarkmode] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    setDarkmode(
      theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, []);

  const toggleTheme = () => {
    const newDark = !darkmode;
    setDarkmode(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "");
    document.documentElement.setAttribute("data-theme", newDark ? "dark" : "");
  };

  const base = typeof window !== "undefined"
    ? document.querySelector("base")?.getAttribute("href") || "/moddota.github.io/"
    : "/moddota.github.io/";

  const links = [
    { href: `${base}api/vscripts`, label: "Lua API" },
    { href: `${base}api/events`, label: "Game Events" },
    { href: `${base}api/panorama/api`, label: "Panorama API" },
    { href: `${base}api/panorama/css`, label: "Panorama CSS" },
    { href: `${base}api/panorama/events`, label: "Panorama Events" },
    { href: `${base}api/abilities`, label: "Abilities" },
    { href: `${base}api/modifiers`, label: "Modifiers" },
    { href: `${base}api/convars`, label: "Convars" },
    { href: `${base}api/changelog`, label: "Changelog" },
  ];

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-navbar)",
        borderBottom: "1px solid var(--color-navbar-shadow)",
        boxShadow: "0 0 4px var(--color-navbar-shadow)",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <a
          href={base}
          style={{
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            textDecoration: "none",
            color: "var(--color-text)",
            textShadow: "1px 1px 2px var(--color-navbar-link-shadow)",
            padding: "0 20px",
          }}
        >
          <img src={`${base}images/moddota-logo.svg`} width="36" height="32" alt="ModDota" style={{ marginRight: 8 }} />
          <span className="brand-text">ModDota</span>
        </a>

        <div className="nav-desktop-links" style={{ display: "flex" }}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                padding: "12px 20px",
                fontWeight: 600,
                textDecoration: "none",
                color: currentPath.startsWith(link.href) ? "var(--color-highlight)" : "var(--color-text-dim)",
                textShadow: "1px 1px 2px var(--color-navbar-link-shadow)",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", flex: "auto", justifyContent: "flex-end", alignItems: "center", paddingRight: 12 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: darkmode ? "#101010" : "#c0c0c0",
              border: "none",
              borderRadius: 12,
              width: 48,
              height: 24,
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
            aria-label="Dark Mode Toggle"
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: darkmode ? 26 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: darkmode ? "#606060" : "#ffffff",
                transition: "left 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              {darkmode ? "\uD83C\uDF1C" : "\uD83C\uDF1E"}
            </span>
          </button>

          <button
            className="burger-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              padding: 8,
              color: "var(--color-text)",
              marginLeft: 8,
            }}
          >
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="mobile-menu-items"
          onClick={() => setMenuOpen(false)}
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "4px 0",
            borderTop: "1px solid var(--color-navbar-shadow)",
          }}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                padding: "12px 20px",
                fontWeight: 600,
                textDecoration: "none",
                color: currentPath.startsWith(link.href) ? "var(--color-highlight)" : "var(--color-text-dim)",
                textShadow: "1px 1px 2px var(--color-navbar-link-shadow)",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .burger-button { display: block !important; }
          .brand-text { display: none; }
        }
        @media (min-width: 769px) {
          .mobile-menu-items { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
