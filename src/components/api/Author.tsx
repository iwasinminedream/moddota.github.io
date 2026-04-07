import React from "react";

export function Author() {
  return (
    <div
      style={{
        maxWidth: 600,
        border: "3px solid var(--color-author-epitaph)",
        borderRadius: 3,
        background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-author-epitaph) 15%, var(--color-group)), var(--color-group))",
        boxShadow: "2px 2px 4px #00000030",
        padding: 15,
        margin: "50px 20px",
        alignSelf: "center",
        fontSize: 18,
        color: "var(--color-text)",
        overflowY: "auto",
      }}
    >
      <p>
        This page was created by <b>ark120202</b> who unfortunately has passed away on 29th November 2020 at the age of
        18.
      </p>
      <p>
        ark120202 was a pillar and champion of this community, he spent countless hours helping others, developing
        tools, and selflessly sharing his brilliance and intelligence to all that asked for help.
      </p>
      <p>You will always be remembered. — ModDota Community</p>
    </div>
  );
}
