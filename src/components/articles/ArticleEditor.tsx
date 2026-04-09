import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

const REPO_OWNER = "iwasinminedream";
const REPO_NAME = "moddota.github.io";
const BRANCH = "source";
const ARTICLES_PATH = "src/content/articles";

const CATEGORIES = [
  { value: "", label: "Root (no category)" },
  { value: "abilities", label: "Abilities, items, modifiers" },
  { value: "units", label: "Units" },
  { value: "scripting", label: "Scripting" },
  { value: "panorama", label: "Panorama UI" },
  { value: "assets", label: "Assets" },
  { value: "tools", label: "Tools" },
];

function titleToFilename(title: string): string {
  return title.trim().replace(/\s+/g, "-");
}

function generateMarkdown(title: string, author: string, steamId: string, content: string): string {
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  let frontmatter = `---\ntitle: ${JSON.stringify(title)}\n`;
  if (author) frontmatter += `author: ${JSON.stringify(author)}\n`;
  if (steamId) frontmatter += `steamId: '${steamId}'\n`;
  frontmatter += `date: ${date}\n---\n\n`;
  return frontmatter + content;
}

// Simple markdown to HTML converter for preview
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%"/>')
    // YouTube component
    .replace(/<YouTube\s+id="([^"]+)"\s*\/>/g, '<div style="background:#1a1a2e;padding:20px;text-align:center;border-radius:4px;margin:8px 0">YouTube: $1</div>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr/>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

export function ArticleEditor() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [steamId, setSteamId] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("article-draft");
    if (saved) {
      try {
        const { title: t, author: a, steamId: s, category: c, content: co } = JSON.parse(saved);
        if (t) setTitle(t);
        if (a) setAuthor(a);
        if (s) setSteamId(s);
        if (c) setCategory(c);
        if (co) setContent(co);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("article-draft", JSON.stringify({ title, author, steamId, category, content }));
    }, 500);
    return () => clearTimeout(timer);
  }, [title, author, steamId, category, content]);

  const filename = useMemo(() => titleToFilename(title), [title]);
  const markdown = useMemo(() => generateMarkdown(title, author, steamId, content), [title, author, steamId, content]);
  const filePath = category ? `${ARTICLES_PATH}/${category}/${filename}.md` : `${ARTICLES_PATH}/${filename}.md`;

  const githubNewFileUrl = useMemo(() => {
    const base = `https://github.com/${REPO_OWNER}/${REPO_NAME}/new/${BRANCH}/`;
    return filename ? `${base}?filename=${encodeURIComponent(filePath)}` : base;
  }, [filename, filePath]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy markdown:", e);
    }
  }, [markdown]);

  // Toolbar helpers
  const wrapSelection = useCallback((before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, end + before.length); }, 0);
  }, [content]);

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    setContent(content.substring(0, pos) + text + content.substring(pos));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + text.length, pos + text.length); }, 0);
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
      if (e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
      if (e.key === "k") { e.preventDefault(); wrapSelection("[", "](url)"); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [wrapSelection]);

  const previewHtml = useMemo(() => markdownToHtml(content), [content]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 6,
    border: "1px solid var(--color-border)", backgroundColor: "var(--color-content-bg)",
    color: "var(--color-text)", fontSize: 14,
  };

  const btnStyle: React.CSSProperties = {
    padding: "4px 8px", border: "1px solid var(--color-border)", borderRadius: 4,
    background: "var(--color-sidebar)", color: "var(--color-text)", cursor: "pointer", fontSize: 13,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Metadata bar */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: "2 1 200px" }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Title *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Awesome Tutorial" />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Author</label>
          <input style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Category</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="mobile-tabs" style={{ display: "none", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => setActiveTab("editor")} style={{ ...btnStyle, flex: 1, borderRadius: 0, borderBottom: activeTab === "editor" ? "2px solid var(--color-highlight)" : "none" }}>Editor</button>
        <button onClick={() => setActiveTab("preview")} style={{ ...btnStyle, flex: 1, borderRadius: 0, borderBottom: activeTab === "preview" ? "2px solid var(--color-highlight)" : "none" }}>Preview</button>
      </div>

      {/* Split view */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 1, background: "var(--color-border)" }} className="editor-split">
        {/* Editor */}
        <div className="editor-panel" style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-bg)", overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 2, padding: "4px 8px", borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" }}>
            <button style={btnStyle} onClick={() => wrapSelection("**", "**")} title="Bold (Ctrl+B)"><b>B</b></button>
            <button style={btnStyle} onClick={() => wrapSelection("*", "*")} title="Italic (Ctrl+I)"><i>I</i></button>
            <button style={btnStyle} onClick={() => insertAtCursor("## ")} title="Heading">H</button>
            <button style={btnStyle} onClick={() => wrapSelection("`", "`")} title="Inline code">{'<>'}</button>
            <button style={btnStyle} onClick={() => insertAtCursor('```lua\n\n```\n')} title="Code block">Code</button>
            <button style={btnStyle} onClick={() => wrapSelection("[", "](url)")} title="Link (Ctrl+K)">Link</button>
            <button style={btnStyle} onClick={() => insertAtCursor('![alt](url)')} title="Image">Img</button>
            <button style={btnStyle} onClick={() => insertAtCursor('<YouTube id="" />')} title="YouTube embed">YT</button>
            <button style={btnStyle} onClick={() => insertAtCursor("- ")} title="List">List</button>
            <button style={btnStyle} onClick={() => insertAtCursor("> ")} title="Quote">Quote</button>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article in Markdown..."
            style={{ flex: 1, resize: "none", border: "none", outline: "none", padding: 16, fontFamily: "'Fira Code', 'Fira Mono', monospace", fontSize: 14, color: "var(--color-text)", backgroundColor: "var(--color-bg)", lineHeight: 1.6 }}
          />
        </div>

        {/* Preview */}
        <div className="preview-panel" style={{ flex: 1, overflow: "auto", padding: 16, background: "var(--color-bg)" }}>
          <div style={{ maxWidth: 700 }}>
            {title && <h1 style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 8, marginBottom: 16 }}>{title}</h1>}
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ lineHeight: 1.7 }} />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a
          href={githubNewFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "10px 24px", backgroundColor: "var(--color-highlight)", color: "#fff", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}
        >
          Create PR on GitHub
        </a>
        <button onClick={handleCopy} style={{ padding: "10px 24px", backgroundColor: "transparent", color: "var(--color-highlight)", borderRadius: 6, border: "1px solid var(--color-highlight)", cursor: "pointer", fontWeight: 600 }}>
          {copied ? "Copied!" : "Copy markdown"}
        </button>
        {filename && <small style={{ color: "var(--color-text-dim)" }}>File: <code>{filePath}</code></small>}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-tabs { display: flex !important; }
          .editor-split { flex-direction: column; }
          .editor-panel { display: ${activeTab === "editor" ? "flex" : "none"} !important; }
          .preview-panel { display: ${activeTab === "preview" ? "block" : "none"} !important; }
        }
      `}</style>
    </div>
  );
}
