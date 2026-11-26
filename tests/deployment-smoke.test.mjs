import assert from "node:assert/strict";
import test from "node:test";
import { smokeDeployment, smokeTarget } from "../.github/scripts/deployment-smoke.mjs";
import { secureBuildOutputConfig } from "../.github/scripts/build-output-config.mjs";

const url = "https://minidesk-preview.vercel.app/";
const html =
  '<div id="root"></div><script src="/assets/app-123.js"></script><link href="/assets/app-123.css" rel="stylesheet">';

test("uses the public production domain and the exact preview deployment URL", () => {
  assert.equal(
    smokeTarget("push", "https://protected-deployment.vercel.app/"),
    "https://feature-based-minidesk.vercel.app/",
  );
  assert.equal(smokeTarget("pull_request", url), url);
  assert.throws(() => smokeTarget("workflow_dispatch", url), /Unsupported smoke test event/);
});

test("checks the deployed application and its built assets", async () => {
  const seen = [];
  await smokeDeployment(url, "test-secret", async (target, options) => {
    seen.push([target.pathname, options.headers["x-vercel-protection-bypass"]]);
    return new Response(
      target.pathname === "/api/minidesk/v1/demo"
        ? JSON.stringify({
            datasetId: "dataset",
            currency: "USD",
            timeZone: "UTC",
            serverNow: "2026-11-26T00:00:00.000Z",
            resetAt: "2026-11-26T12:00:00.000Z",
          })
        : target.pathname === "/" || target.pathname === "/unknown-page"
          ? html
          : target.pathname === "/favicon.svg"
            ? "<svg></svg>"
            : target.pathname === "/assets/app-123.js"
              ? 'const chunks = ["assets/routes-123.js", "assets/routes-123.css"]'
              : "built asset",
      {
        headers: {
          ...secureBuildOutputConfig.routes[0].headers,
          "content-type": target.pathname.endsWith(".js")
            ? "text/javascript; charset=utf-8"
            : target.pathname === "/api/minidesk/v1/demo"
              ? "application/json; charset=utf-8"
              : target.pathname.endsWith(".css")
                ? "text/css; charset=utf-8"
                : target.pathname.endsWith(".svg")
                  ? "image/svg+xml"
                  : "text/html",
          ...(target.pathname === "/api/minidesk/v1/demo" ? { "cache-control": "no-store" } : {}),
        },
      },
    );
  });
  assert.deepEqual(seen, [
    ["/", "test-secret"],
    ["/assets/app-123.js", "test-secret"],
    ["/assets/app-123.css", "test-secret"],
    ["/assets/routes-123.js", "test-secret"],
    ["/assets/routes-123.css", "test-secret"],
    ["/unknown-page", "test-secret"],
    ["/favicon.svg", "test-secret"],
    ["/api/minidesk/v1/demo", "test-secret"],
  ]);
});

test("checks a static deployment without requesting the MiniDesk API", async () => {
  const seen = [];
  await smokeDeployment(
    url,
    "",
    async (target) => {
      seen.push(target.pathname);
      const contentType = target.pathname.endsWith(".js")
        ? "text/javascript"
        : target.pathname.endsWith(".css")
          ? "text/css"
          : target.pathname.endsWith(".svg")
            ? "image/svg+xml"
            : "text/html";
      return new Response(
        target.pathname === "/" || target.pathname === "/unknown-page"
          ? html
          : target.pathname.endsWith(".svg")
            ? "<svg></svg>"
            : "built asset",
        {
          headers: {
            ...secureBuildOutputConfig.routes[0].headers,
            "content-type": contentType,
          },
        },
      );
    },
    "static",
  );
  assert.equal(seen.includes("/api/minidesk/v1/demo"), false);
});

test("deep-link redirects must preserve the requested path", async () => {
  for (const location of ["/unknown-page", "/"]) {
    let deepRequests = 0;
    const request = async (target) => {
      if (target.pathname === "/unknown-page" && deepRequests++ === 0)
        return new Response(null, { status: 302, headers: { location } });
      const contentType = target.pathname.endsWith(".js")
        ? "text/javascript"
        : target.pathname === "/api/minidesk/v1/demo"
          ? "application/json"
          : target.pathname.endsWith(".css")
            ? "text/css"
            : target.pathname.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html";
      const body =
        target.pathname === "/api/minidesk/v1/demo"
          ? JSON.stringify({
              datasetId: "dataset",
              currency: "USD",
              timeZone: "UTC",
              serverNow: "2026-11-26T00:00:00.000Z",
              resetAt: "2026-11-26T12:00:00.000Z",
            })
          : target.pathname === "/" || target.pathname === "/unknown-page"
            ? html
            : target.pathname === "/favicon.svg"
              ? "<svg></svg>"
              : "built asset";
      return new Response(body, {
        headers: {
          ...secureBuildOutputConfig.routes[0].headers,
          "content-type": contentType,
          ...(target.pathname === "/api/minidesk/v1/demo" ? { "cache-control": "no-store" } : {}),
        },
      });
    };
    if (location === "/") {
      await assert.rejects(
        smokeDeployment(url, "", request),
        /Deployment redirected to a different path/,
      );
      assert.equal(deepRequests, 1);
    } else {
      await smokeDeployment(url, "", request);
      assert.equal(deepRequests, 2);
    }
  }
});

test("rejects a root redirect to another path", async () => {
  let calls = 0;
  await assert.rejects(
    smokeDeployment(url, "", async (target) => {
      calls++;
      if (target.pathname === "/")
        return new Response(null, { status: 302, headers: { location: "/unknown-page" } });
      return new Response(html, {
        headers: { ...secureBuildOutputConfig.routes[0].headers, "content-type": "text/html" },
      });
    }),
    /Deployment redirected to a different path/,
  );
  assert.equal(calls, 1);
});

test("rejects a missing dynamically imported route chunk", async () => {
  await assert.rejects(
    smokeDeployment(url, "", async (target) => {
      if (target.pathname === "/") {
        return new Response(html, { headers: { "content-type": "text/html" } });
      }
      if (target.pathname === "/assets/app-123.js") {
        return new Response('import("./routes-123.js")', {
          headers: { "content-type": "text/javascript" },
        });
      }
      if (target.pathname === "/assets/routes-123.js") {
        return new Response("fallback", { headers: { "content-type": "text/html" } });
      }
      return new Response("asset", { headers: { "content-type": "text/css" } });
    }),
    /Unexpected asset content type/,
  );
});

test("rejects an HTML fallback for an asset and an interrupted asset transfer", async () => {
  const htmlAsset = async (target) =>
    new Response(target.pathname === "/" ? html : "<h1>Fallback</h1>", {
      headers: { "content-type": "text/html" },
    });
  await assert.rejects(smokeDeployment(url, "", htmlAsset), /Unexpected asset content type/);

  const interruptedAsset = async (target) => {
    if (target.pathname === "/")
      return new Response(html, { headers: { "content-type": "text/html" } });
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new Error("Asset transfer interrupted"));
        },
      }),
      { headers: { "content-type": "text/javascript" } },
    );
  };
  await assert.rejects(smokeDeployment(url, "", interruptedAsset), /Asset transfer interrupted/);
});

test("rejects MIME subtype suffixes on built assets", async () => {
  for (const [extension, contentType] of [
    [".js", "text/javascript+json"],
    [".css", "text/css-invalid"],
  ]) {
    await assert.rejects(
      smokeDeployment(url, "", async (target) => {
        const type =
          target.pathname === "/"
            ? "text/html"
            : target.pathname.endsWith(extension)
              ? contentType
              : target.pathname.endsWith(".js")
                ? "text/javascript"
                : "text/css";
        return new Response(target.pathname === "/" ? html : "asset", {
          headers: { "content-type": type },
        });
      }),
      /Unexpected asset content type/,
    );
  }
});

test("rejects an external redirect without sending the bypass secret to that host", async () => {
  let calls = 0;
  await assert.rejects(
    smokeDeployment(url, "test-secret", async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: "https://example.com/" } });
    }),
    /outside its origin/,
  );
  assert.equal(calls, 1);
});

test("rejects login pages and missing built assets", async () => {
  await assert.rejects(
    smokeDeployment(
      url,
      "test-secret",
      async () => new Response("<h1>Sign in</h1>", { headers: { "content-type": "text/html" } }),
    ),
    /application page/,
  );
  await assert.rejects(
    smokeDeployment(
      url,
      "",
      async () =>
        new Response('<div id="root"></div>', { headers: { "content-type": "text/html" } }),
    ),
    /no built JavaScript or stylesheet/,
  );
});
