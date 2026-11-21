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

// Serve existing static files first, then rewrite client-side routes to the SPA shell.
export const secureBuildOutputConfig = {
  ...legacyBuildOutputConfig,
  routes: [
    ...legacyBuildOutputConfig.routes,
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
