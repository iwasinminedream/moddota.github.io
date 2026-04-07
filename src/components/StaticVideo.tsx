import React from "react";

export function StaticVideo({ path, controls = false }: { path: string; controls: boolean }) {
    const baseUrl = import.meta.env.BASE_URL || "/moddota.github.io";
    const src = path.startsWith("/") ? `${baseUrl}${path}` : path;
    return (
        <video width="100%" height="100%" autoPlay muted loop controls={controls}>
            <source src={src} type="video/mp4"></source>
        </video>
    );
}
