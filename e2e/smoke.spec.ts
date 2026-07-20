import { test, expect } from "@playwright/test"

/**
 * Smoke E2E: the app boots and the workspace shell renders.
 *
 * Kept intentionally robust — it asserts on stable, high-level signals (title,
 * a mounted React tree, absence of a fatal error boundary) rather than on
 * specific components, so UI refactors don't make it flaky.
 */

test.describe("app smoke", () => {
  test("loads and renders the workspace shell", async ({ page }) => {
    await page.goto("/")

    // Document title comes from index.html and is stable.
    await expect(page).toHaveTitle(/Eulinx/i)

    // React mounts into #root; wait for it to actually contain UI.
    const root = page.locator("#root")
    await expect(root).toBeAttached()
    await expect
      .poll(async () => (await root.innerHTML()).trim().length, {
        timeout: 15_000,
      })
      .toBeGreaterThan(0)

    // The app must not have crashed into the top-level error boundary.
    const errorAlert = page.getByRole("alert", { name: /failed to render/i })
    await expect(errorAlert).toHaveCount(0)

    // Something visible is painted (the body has rendered content).
    await expect(page.locator("body")).toBeVisible()
  })

  test("has no uncaught page errors during boot", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    expect(pageErrors, `uncaught errors: ${pageErrors.join("; ")}`).toHaveLength(0)
  })
})
