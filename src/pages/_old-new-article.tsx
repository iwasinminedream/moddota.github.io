import React, { useState, useMemo } from "react";
import Layout from "@theme/Layout";

const REPO_OWNER = "iwasinminedream";
const REPO_NAME = "moddota.github.io";
const BRANCH = "source";
const ARTICLES_PATH = "_articles";

const CATEGORIES = [
    { value: "", label: "Root (no category)" },
    { value: "abilities", label: "Abilities, items, modifiers" },
    { value: "units", label: "Units" },
    { value: "scripting", label: "Scripting" },
    { value: "panorama", label: "Panorama UI" },
    { value: "assets", label: "Assets" },
    { value: "tools", label: "Tools" },
];

const MAX_URL_LENGTH = 6000;

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function generateMarkdown(title: string, author: string, steamId: string, content: string): string {
    const date = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    let frontmatter = `---\ntitle: ${JSON.stringify(title)}\n`;
    if (author) frontmatter += `author: ${JSON.stringify(author)}\n`;
    if (steamId) frontmatter += `steamId: '${steamId}'\n`;
    frontmatter += `date: ${date}\n---\n\n`;

    return frontmatter + content;
}

function ArticlePreview({ markdown }: { markdown: string }) {
    // Strip frontmatter for display
    const body = markdown.replace(/^---[\s\S]*?---\n*/, "");
    return (
        <div
            style={{
                border: "1px solid var(--ifm-color-emphasis-300)",
                borderRadius: 8,
                padding: 16,
                marginTop: 12,
                backgroundColor: "var(--ifm-background-surface-color)",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: 13,
                maxHeight: 400,
                overflow: "auto",
            }}
        >
            {markdown}
        </div>
    );
}

export default function NewArticlePage() {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [steamId, setSteamId] = useState("");
    const [category, setCategory] = useState("");
    const [content, setContent] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    const slug = useMemo(() => generateSlug(title), [title]);
    const markdown = useMemo(
        () => generateMarkdown(title, author, steamId, content),
        [title, author, steamId, content],
    );

    const filePath = category ? `${ARTICLES_PATH}/${category}/${slug}.md` : `${ARTICLES_PATH}/${slug}.md`;

    const githubNewFileUrl = useMemo(() => {
        const url = `https://github.com/${REPO_OWNER}/${REPO_NAME}/new/${BRANCH}/?filename=${encodeURIComponent(filePath)}&value=${encodeURIComponent(markdown)}`;
        return url;
    }, [filePath, markdown]);

    const isUrlTooLong = githubNewFileUrl.length > MAX_URL_LENGTH;
    const isValid = title.trim().length > 0 && content.trim().length > 0;

    function handleDownload() {
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug || "article"}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid var(--ifm-color-emphasis-300)",
        backgroundColor: "var(--ifm-background-surface-color)",
        color: "var(--ifm-font-color-base)",
        fontSize: 14,
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: 4,
        fontWeight: 600,
    };

    return (
        <Layout title="New Article" description="Create a new article for ModDota">
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
                <h1>Create New Article</h1>
                <p>
                    Fill out the form below to create a new article. You can submit it directly as a Pull Request
                    on GitHub, or download the file and upload it manually.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={labelStyle} htmlFor="title">
                            Title *
                        </label>
                        <input
                            id="title"
                            style={inputStyle}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Awesome Tutorial"
                        />
                        {slug && (
                            <small style={{ color: "var(--ifm-color-emphasis-600)" }}>
                                File: <code>{filePath}</code>
                            </small>
                        )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                            <label style={labelStyle} htmlFor="author">
                                Author
                            </label>
                            <input
                                id="author"
                                style={inputStyle}
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="steamId">
                                Steam ID
                            </label>
                            <input
                                id="steamId"
                                style={inputStyle}
                                value={steamId}
                                onChange={(e) => setSteamId(e.target.value)}
                                placeholder="76561198000000000"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle} htmlFor="category">
                            Category
                        </label>
                        <select
                            id="category"
                            style={inputStyle}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle} htmlFor="content">
                            Content (Markdown) *
                        </label>
                        <textarea
                            id="content"
                            style={{
                                ...inputStyle,
                                minHeight: 300,
                                fontFamily: "monospace",
                                resize: "vertical",
                            }}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`Write your article in Markdown...\n\n## Section Title\n\nYour content here.\n\n\`\`\`lua\nfunction MyFunction()\n  print("Hello!")\nend\n\`\`\``}
                        />
                    </div>

                    <div>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--ifm-color-primary)",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: 14,
                                textDecoration: "underline",
                            }}
                        >
                            {showPreview ? "Hide raw preview" : "Show raw preview"}
                        </button>
                        {showPreview && <ArticlePreview markdown={markdown} />}
                    </div>

                    <hr style={{ margin: "8px 0" }} />

                    {!isUrlTooLong ? (
                        <div>
                            <a
                                href={isValid ? githubNewFileUrl : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-block",
                                    padding: "10px 24px",
                                    backgroundColor: isValid
                                        ? "var(--ifm-color-primary)"
                                        : "var(--ifm-color-emphasis-400)",
                                    color: "#fff",
                                    borderRadius: 6,
                                    textDecoration: "none",
                                    fontWeight: 600,
                                    pointerEvents: isValid ? "auto" : "none",
                                }}
                            >
                                Create Pull Request on GitHub
                            </a>
                            <p style={{ marginTop: 8, fontSize: 13, color: "var(--ifm-color-emphasis-600)" }}>
                                Opens GitHub where you can review and submit your article as a PR.
                                You need a GitHub account.
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: 16,
                                borderRadius: 8,
                                border: "1px solid var(--ifm-color-warning-dark)",
                                backgroundColor: "var(--ifm-color-warning-contrast-background)",
                            }}
                        >
                            <p style={{ fontWeight: 600, marginBottom: 8 }}>
                                Your article is too large to submit directly via URL.
                            </p>
                            <p style={{ marginBottom: 12 }}>
                                Please download the file and upload it manually to GitHub:
                            </p>
                            <button
                                onClick={handleDownload}
                                disabled={!isValid}
                                style={{
                                    padding: "10px 24px",
                                    backgroundColor: isValid
                                        ? "var(--ifm-color-primary)"
                                        : "var(--ifm-color-emphasis-400)",
                                    color: "#fff",
                                    borderRadius: 6,
                                    border: "none",
                                    fontWeight: 600,
                                    cursor: isValid ? "pointer" : "not-allowed",
                                }}
                            >
                                Download .md file
                            </button>

                            <div style={{ marginTop: 16 }}>
                                <h4>How to upload manually:</h4>
                                <ol style={{ fontSize: 14 }}>
                                    <li>
                                        Download the <code>.md</code> file using the button above.
                                    </li>
                                    <li>
                                        Go to the{" "}
                                        <a
                                            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${BRANCH}/${ARTICLES_PATH}${category ? "/" + category : ""}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {category || "articles"} folder on GitHub
                                        </a>
                                        .
                                    </li>
                                    <li>
                                        Click <strong>Add file</strong> &rarr; <strong>Upload files</strong>.
                                    </li>
                                    <li>Drag and drop your downloaded <code>.md</code> file.</li>
                                    <li>
                                        At the bottom, select{" "}
                                        <strong>&quot;Create a new branch for this commit and start a pull request&quot;</strong>.
                                    </li>
                                    <li>
                                        Click <strong>Propose changes</strong>, then{" "}
                                        <strong>Create pull request</strong>.
                                    </li>
                                </ol>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                        <button
                            onClick={handleDownload}
                            disabled={!isValid}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "transparent",
                                color: "var(--ifm-color-primary)",
                                borderRadius: 6,
                                border: "1px solid var(--ifm-color-primary)",
                                cursor: isValid ? "pointer" : "not-allowed",
                                fontSize: 14,
                                opacity: isValid ? 1 : 0.5,
                            }}
                        >
                            Download .md file
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
