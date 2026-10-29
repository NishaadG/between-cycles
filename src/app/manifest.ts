import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Between Cycles",
    short_name: "Between Cycles",
    description: "Measure skin changes during cancer treatment against your own baseline.",
    start_url: "/today",
    display: "standalone",
    background_color: "#fbf7f2",
    theme_color: "#2f6f6a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
