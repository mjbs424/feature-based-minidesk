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

export function assertTrustedBuildOutputConfig(config) {
  if (JSON.stringify(config) !== JSON.stringify(secureBuildOutputConfig)) {
    throw new Error("Unexpected build output configuration");
  }
}
