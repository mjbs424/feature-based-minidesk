module.exports = async (browser, context) => {
  const previewUrl = process.env.PREVIEW_URL;
  if (context.url !== previewUrl || !/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(previewUrl))
    throw new Error("Unexpected Lighthouse preview URL");
  const cookie = JSON.parse(process.env.VERCEL_PREVIEW_COOKIE || "null");
  if (cookie?.name !== "_vercel_jwt" || !cookie.value)
    throw new Error("Missing preview bypass cookie");
  const page = await browser.newPage();
  try {
    await page.setCookie({
      name: cookie.name,
      value: cookie.value,
      url: previewUrl,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  } finally {
    await page.close();
  }
};
