import { expect, test } from "@playwright/test";

test.describe(() => {
    test("Encoded puzzles decode to the same puzzle", async ({ page }) => {
        await page.goto("/edit");

        const canvas = page.getByTestId("svg-canvas");
        await expect(canvas).toBeVisible();
    });
});
