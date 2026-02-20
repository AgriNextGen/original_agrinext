import { Loader } from "@googlemaps/js-api-loader";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  // This helps you catch misconfig fast during development
  console.warn("Missing VITE_GOOGLE_MAPS_API_KEY in .env");
}

export const googleMapsLoader = new Loader({
  apiKey,
  version: "weekly",
  libraries: ["places"], // keep only what you use; add "geometry" if needed
});