import React, { useState } from "react";

const languageNames: Record<string, string | undefined> = {
    lua: "Lua",
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
};

export function MultiCodeBlock({
    children,
    group,
    titles,
}: {
    children: React.ReactNode;
    group: string | undefined;
    titles: string | undefined;
}) {
    const tabs = React.Children.toArray(children).map((element: any, index) => {
        const language = element.props.children?.props?.className?.replace(/language-/, "") ?? `Tab ${index + 1}`;
        const tabTitles = titles !== undefined && titles.length > 0 ? titles.split("|") : [];
        const languageName = tabTitles[index] ?? languageNames[language] ?? language;
        return { id: index, languageName, element };
    });

    const [active, setActive] = useState(0);

    return (
        <div>
            <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e0e0e0" }}>
                {tabs.map(({ id, languageName }) => (
                    <button
                        key={id}
                        onClick={() => setActive(id)}
                        style={{
                            padding: "8px 16px",
                            border: "none",
                            borderBottom: active === id ? "2px solid #89a62e" : "2px solid transparent",
                            background: "none",
                            cursor: "pointer",
                            fontWeight: active === id ? 600 : 400,
                            marginBottom: "-2px",
                        }}
                    >
                        {languageName}
                    </button>
                ))}
            </div>
            <div>{tabs[active]?.element}</div>
        </div>
    );
}
