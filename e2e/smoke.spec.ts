import { test, expect } from "@playwright/test";

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

test("intake API accepts valid secret", async ({ request }) => {
  const secret = process.env.LEAD_INTAKE_SECRET;
  test.skip(!secret, "LEAD_INTAKE_SECRET not set");
  const email = `e2e-${Date.now()}@example.com`;
  const res = await request.post("/api/leads/intake", {
    headers: { Authorization: `Bearer ${secret}` },
    data: { name: "E2E Lead", email },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body).toHaveProperty("id");
  expect(body.created).toBe(true);
});
