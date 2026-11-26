import assert from "node:assert/strict";
import test from "node:test";
import { authorizePreviewDeployment } from "../.github/scripts/preview-authorization.mjs";

const sha = "a".repeat(40);
const comment = (body, login = "reviewer") => ({ body, user: { type: "User", login } });

test("accepts an exact SHA approval from a current repository writer", async () => {
  const routes = [];
  const github = async (route) => {
    routes.push(route);
    return route.startsWith("/issues/")
      ? [comment(`/approve-preview ${sha}`)]
      : { permission: "write" };
  };
  await authorizePreviewDeployment(github, 48, sha);
  assert.deepEqual(routes, [
    "/issues/48/comments?per_page=100&page=1",
    "/collaborators/reviewer/permission",
  ]);
});

test("rejects approval for a different commit or from a reader", async () => {
  const github = async (route) =>
    route.startsWith("/issues/")
      ? [comment(`/approve-preview ${"b".repeat(40)}`), comment(`/approve-preview ${sha}`)]
      : { permission: "read" };
  await assert.rejects(authorizePreviewDeployment(github, 48, sha), /requires a repository writer/);
});

test("ignores bot comments and copied approval text", async () => {
  const github = async (route) =>
    route.startsWith("/issues/")
      ? [
          { body: `/approve-preview ${sha}`, user: { type: "Bot", login: "robot" } },
          comment(`Please run /approve-preview ${sha}`),
        ]
      : { permission: "admin" };
  await assert.rejects(authorizePreviewDeployment(github, 48, sha), /requires a repository writer/);
});

test("ignores a non-collaborator who copied approval and accepts a later writer", async () => {
  const github = async (route) => {
    if (route.startsWith("/issues/"))
      return [comment(`/approve-preview ${sha}`, "stranger"), comment(`/approve-preview ${sha}`)];
    if (route.includes("stranger")) throw new Error(`GitHub API ${route}: 404`);
    return { permission: "maintain" };
  };
  await authorizePreviewDeployment(github, 48, sha);
});
