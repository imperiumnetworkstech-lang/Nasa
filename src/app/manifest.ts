import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antariksha — Crew wellbeing",
    short_name: "Antariksha",
    description: "Mission-aware crew health & wellbeing platform for simulated missions.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F6F4FF",
    theme_color: "#6C4CF5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
