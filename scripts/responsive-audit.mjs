import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const baseUrl = process.env.SIAGAKITA_BASE_URL ?? "http://127.0.0.1:3100";
const email = process.env.SIAGAKITA_E2E_EMAIL ?? "operator@siagakita.local";
const password = process.env.SIAGAKITA_E2E_PASSWORD ?? "SiagaKitaDemo2026!";
const outputDir = resolve(process.cwd(), "output", "playwright", "responsive-audit");

const routes = [
  "/dashboard",
  "/kejadian",
  "/kejadian/evt-sumbar-001",
  "/laporan",
  "/posko",
  "/logistik",
  "/audit-log",
  "/peta-publik",
];

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

mkdirSync(outputDir, { recursive: true });

function routeSlug(route) {
  return route === "/" ? "home" : route.replace(/^\/+/, "").replaceAll("/", "-");
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("input[name='email']").fill(email);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole("button", { name: /Masuk ke sistem|Masuk|Sign in/i }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 20000 });
}

async function auditRoute(page, viewportName, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);

  const checks = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const overflow = Math.max(html.scrollWidth - html.clientWidth, body.scrollWidth - body.clientWidth);
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const ignoredTarget = (element) =>
      element.closest(".maplibregl-ctrl-attrib") ||
      element.closest("[data-sidebar='rail']") ||
      (element.tagName === "SELECT" && element.getBoundingClientRect().width <= 1);
    const smallTargets = Array.from(document.querySelectorAll("button, a, input, select, textarea, [role='button']"))
      .filter(visible)
      .filter((element) => !ignoredTarget(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().slice(0, 48),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((target) => target.width < 32 || target.height < 32);
    const errorText = document.body.innerText.match(/Application error|Unhandled Runtime Error|500 Internal Server Error|404|This page could not be found/i)?.[0] ?? null;
    return { overflow, smallTargets: smallTargets.slice(0, 8), smallTargetCount: smallTargets.length, errorText };
  });

  const screenshotPath = join(outputDir, `${viewportName}-${routeSlug(route)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (checks.errorText) {
    throw new Error(`${viewportName} ${route} menampilkan error: ${checks.errorText}`);
  }
  if (checks.overflow > 2) {
    throw new Error(`${viewportName} ${route} horizontal overflow ${checks.overflow}px`);
  }

  const smallTargetNote = checks.smallTargetCount ? `; target kecil: ${checks.smallTargetCount}` : "";
  console.log(`PASS ${viewportName} ${route} overflow=${checks.overflow}px${smallTargetNote}`);
}

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await login(page);

    for (const route of routes) {
      await auditRoute(page, viewport.name, route);
    }

    await context.close();
  }

  console.log(`DONE responsive audit selesai. Screenshot: ${outputDir}`);
} finally {
  await browser.close();
}
