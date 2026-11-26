const legacyBuildOutputConfig = {
  version: 3,
  routes: [
    {
      src: "/(.*)",
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; upgrade-insecure-requests",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
      continue: true,
    },
  ],
};

// Send only MiniDesk API paths to the Function, then serve static files and SPA routes.
export const secureBuildOutputConfig = {
  ...legacyBuildOutputConfig,
  routes: [
    ...legacyBuildOutputConfig.routes,
    { src: "^/api/minidesk/v1/(.*)$", dest: "/api/minidesk/v1?__route=$1" },
    { src: "^/api/.*$", status: 404 },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};

export function assertTrustedBuildOutputConfig(config) {
  const serialized = JSON.stringify(config);
  if (
    serialized !== JSON.stringify(secureBuildOutputConfig) &&
    serialized !== JSON.stringify(legacyBuildOutputConfig)
  ) {
    throw new Error("Unexpected build output configuration");
  }
}
