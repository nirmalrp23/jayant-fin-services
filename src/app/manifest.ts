import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JN Fin Services",
    short_name: "JN Fin",
    description: "Internal branch and staff workspace",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f2",
    theme_color: "#082f17",
    icons: [
      {
        src: "/branding/jayant-logo.jpg",
        sizes: "640x640",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
