import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "vecktrixai@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|leads)/);
}

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Agency PMS/i })).toBeVisible();
});

test("intake API requires auth", async ({ request }) => {
  const res = await request.post("/api/leads/intake", {
    data: { name: "Test", email: "test@example.com" },
  });
  expect(res.status()).toBe(401);
});

test.describe("whiteboard happy path", () => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL required");

  test("admin can navigate leads and clients", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /Leads/i })).toBeVisible();
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: /Clients/i })).toBeVisible();
  });

  test("lead → proposal → client conversion", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@vecktrix.test`;

    await loginAsAdmin(page);
    await page.goto("/leads");
    await page.getByRole("button", { name: /new lead/i }).click();
    await page.getByPlaceholder("Jane Doe").fill(`E2E Lead ${stamp}`);
    await page.getByPlaceholder("jane@company.com").fill(email);
    await page.getByRole("button", { name: /^create lead$/i }).click();
    await page.waitForURL(/\/leads\/[^/]+$/);

    await expect(page.getByRole("heading", { name: new RegExp(`E2E Lead ${stamp}`) })).toBeVisible();

    await page.getByRole("button", { name: /create proposal/i }).click();
    await expect(page.getByText(/proposal/i).first()).toBeVisible();
    await page.getByRole("button", { name: /save draft/i }).click();
    await expect(page.getByText(/proposal saved/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /send proposal/i }).click();
    await expect(page.getByText(/sent/i).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /mark accepted/i }).click();
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /convert → client/i }).click();
    await page.getByRole("button", { name: /^confirm$/i }).click();
    await page.waitForURL(/\/clients/);
    await expect(page.getByRole("heading", { name: /Clients/i })).toBeVisible();
  });
});
