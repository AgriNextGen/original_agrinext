import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Log all network to/from Supabase
page.on("request",  req => { if (req.url().includes("supabase")) console.log("REQ :", req.method(), req.url().substring(0, 90)); });
page.on("response", res => { if (res.url().includes("supabase")) console.log("RES :", res.status(), res.url().substring(0, 90)); });
page.on("console",  msg => { if (msg.type() === "error") console.log("JS ERR:", msg.text()); });

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });

// Check env vars visible to the page
const envInfo = await page.evaluate(() => {
  return {
    VITE_SUPABASE_URL: window.__VITE_SUPABASE_URL__ || "not_on_window",
    title: document.title,
  };
}).catch(e => ({ err: e.message }));
console.log("window env:", JSON.stringify(envInfo));

// Check what the login form reports as the URL
const loginPageText = await page.locator("form").textContent().catch(() => "no form");
console.log("Form visible:", loginPageText?.substring(0, 80));

// Click Farmer role
await page.locator('button:has-text("Farmer")').first().click();
await page.locator('#phone, input[type="tel"]').first().fill("9900000101");
await page.locator('input[type="password"]').first().fill("Dummy@12345");

console.log("Form filled. Clicking submit...");
await page.locator('button[type="submit"]').first().click();

// Wait 12 seconds and see what happened
await new Promise(r => setTimeout(r, 12000));

const finalUrl = page.url();
console.log("Final URL:", finalUrl);
console.log("Page title:", await page.title().catch(() => "?"));

// Screenshot
await page.screenshot({ path: "output/playwright/debug-login.png" });
console.log("Screenshot saved");

await browser.close();
