export const secureBuildOutputConfig = {
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

// Deploy runs from main, so approve the SPA artifact before its feature branch merges.
const secureSpaBuildOutputConfig = {
  ...secureBuildOutputConfig,
  routes: [
    ...secureBuildOutputConfig.routes,
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};

export function assertTrustedBuildOutputConfig(config) {
  const serialized = JSON.stringify(config);
  if (
    serialized !== JSON.stringify(secureBuildOutputConfig) &&
    serialized !== JSON.stringify(secureSpaBuildOutputConfig)
  ) {
    throw new Error("Unexpected build output configuration");
  }
}
