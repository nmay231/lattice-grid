import { expect, test } from "@playwright/test";
import Jimp from "jimp";
import { PartialPointerEvent } from "../src/ControlsManager";
// eslint-disable-next-line no-restricted-imports
import { availableLayers, type AvailableLayerType } from "../src/layers";
import { BackgroundColorLayer } from "../src/layers/BackgroundColor";
import { SimpleLineLayer } from "../src/layers/SimpleLine";
import type { CreateSubtypeOf } from "../src/types";

const coordToPointerEventFromCanvasParams =
    (canvasParams: Record<"x" | "y" | "width" | "height", number>) =>
    (x: number, y: number): PartialPointerEvent => {
        const clientX = ((x + 0.5) * canvasParams.width) / 12 + canvasParams.x;
        const clientY = ((y + 0.5) * canvasParams.height) / 12 + canvasParams.y;
        return { clientX, clientY, buttons: 1, pointerId: 0 };
    };

test.describe("Answer check for BackgroundColor, SimpleLine, and Number", () => {
    const parameters = [
        // TODO: I could technically do "not-present" | "question-only" | "question-answer"
        // For now, this means "question-only" | "question-answer"
        { color: true, line: true, number: true },
        { color: false, line: true, number: true },
        { color: true, line: false, number: true },
        { color: false, line: false, number: true },
        { color: true, line: true, number: false },
        { color: false, line: true, number: false },
        { color: true, line: false, number: false },
        { color: false, line: false, number: false },
    ];

    for (const param of parameters) {
        test(`should answer check for combination: color-${param.color}, line-${param.line}, number-${param.number}`, async ({
            page,
        }) => {
            await page.goto("/edit");
            await page.getByRole("button", { name: "Reset Puzzle" }).click();
            await page.getByRole("button", { name: "Yes I'm sure" }).click();

            const addLayer = page.locator(`input[value="Add New Layer"][aria-haspopup="listbox"]`);
            const layers = [BackgroundColorLayer.displayName, SimpleLineLayer.displayName];
            for (const layerDisplayName of layers) {
                await addLayer.click();
                await page.getByRole("option", { name: layerDisplayName }).click();
            }

            type UsedLayers = CreateSubtypeOf<
                AvailableLayerType,
                "NumberLayer" | "BackgroundColorLayer" | "SimpleLineLayer"
            >;
            const selectLayer = async (layer: UsedLayers) => {
                const displayName = availableLayers[layer].displayName;
                await page.getByRole("button", { name: displayName }).click();
            };
            const selectEditMode = async (mode: "Setting" | "Solving") => {
                await page.locator("label").filter({ hasText: mode }).first().click();
            };

            const canvas = page.getByTestId("svg-canvas");
            const canvasParams = (await canvas.boundingBox())!;
            for (const key of Object.keys(canvasParams) as Array<keyof typeof canvasParams>) {
                canvasParams[key] = Math.round(canvasParams[key]);
            }

            const coordToPointerEvent = coordToPointerEventFromCanvasParams(canvasParams);

            await selectEditMode("Setting");

            await selectLayer("NumberLayer");
            let pointerEvent = coordToPointerEvent(1, 1);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);
            await page.keyboard.press("1");
            pointerEvent = coordToPointerEvent(10, 10);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);
            await page.keyboard.press("2");

            await selectLayer("BackgroundColorLayer");
            pointerEvent = coordToPointerEvent(1, 2);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);
            pointerEvent = coordToPointerEvent(9, 10);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);

            await selectLayer("SimpleLineLayer");
            pointerEvent = coordToPointerEvent(5, 1);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            pointerEvent = coordToPointerEvent(6, 1);
            await canvas.dispatchEvent("pointermove", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);
            pointerEvent = coordToPointerEvent(10, 6);
            await canvas.dispatchEvent("pointerdown", pointerEvent);
            pointerEvent = coordToPointerEvent(10, 5);
            await canvas.dispatchEvent("pointermove", pointerEvent);
            await canvas.dispatchEvent("pointerup", pointerEvent);

            await selectEditMode("Solving");
            let expectedImageBuffer: Buffer;
            for (const editMode of ["edit", "play"] as const) {
                if (param.number) {
                    await selectLayer("NumberLayer");
                    pointerEvent = coordToPointerEvent(1, 10);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                    await page.keyboard.press("3");
                    pointerEvent = coordToPointerEvent(10, 1);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                    await page.keyboard.press("4");
                }
                if (param.color) {
                    await selectLayer("BackgroundColorLayer");
                    pointerEvent = coordToPointerEvent(2, 1);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                    pointerEvent = coordToPointerEvent(10, 9);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                }
                if (param.line) {
                    await selectLayer("SimpleLineLayer");
                    pointerEvent = coordToPointerEvent(1, 5);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    pointerEvent = coordToPointerEvent(1, 6);
                    await canvas.dispatchEvent("pointermove", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                    pointerEvent = coordToPointerEvent(6, 10);
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                    pointerEvent = coordToPointerEvent(5, 10);
                    await canvas.dispatchEvent("pointermove", pointerEvent);
                    await canvas.dispatchEvent("pointerup", pointerEvent);
                }

                // Hide any remaining overlay elements before taking a screenshot
                await page.evaluate(`
                    const overlayGroups = document.querySelectorAll('[data-testid="svg-canvas-OverlayLayer"]');
                    for (const group of overlayGroups) {
                        group.style.display = "none";
                    }
                `);

                if (editMode === "edit") {
                    expectedImageBuffer = await page.screenshot({
                        clip: canvasParams,
                        scale: "css",
                    });

                    await page.getByText("Import / Export").click();
                    const url = await page.getByTestId("exported-url").inputValue();
                    // Load solve URL
                    await page.goto(url);
                }
            }

            // TODO: Only needed when all params are false, but also should the "you solved it!" message even show if there is no answer check?
            await page.keyboard.press("Escape");
            // Expect "puzzle solved" notification (dev mode can give more than one)
            await expect(
                page.getByText("your answer matches the setter's answer").first(),
            ).toBeVisible();

            // Hide "puzzle solved" notifications
            await page.evaluate(`
                const notifications = document.querySelector('.mantine-Notifications-root');
                notifications.style.display = "none";
            `);

            const actualImageBuffer = await page.screenshot({
                clip: canvasParams,
                scale: "css",
            });

            const expectedImage = await Jimp.read(expectedImageBuffer!);
            const actualImage = await Jimp.read(actualImageBuffer);
            const diff = Jimp.diff(expectedImage, actualImage);
            expect(diff.percent).toBe(0);

            await expect(page).toHaveScreenshot({ clip: canvasParams, scale: "css" });
        });
    }
});

test.describe("Miscellaneous controls tests", () => {
    // TODO: Not really an answer check thing, but I don't feel like making a whole new file for just this
    test("should draw a diagonal line using debug point selector", async ({ page }) => {
        await page.goto("/edit");
        await page.getByRole("button", { name: "Reset Puzzle" }).click();
        await page.getByRole("button", { name: "Yes I'm sure" }).click();

        const addLayer = page.locator(`input[value="Add New Layer"][aria-haspopup="listbox"]`);

        const canvas = page.getByTestId("svg-canvas");
        const canvasParams = (await canvas.boundingBox())!;
        for (const key of Object.keys(canvasParams) as Array<keyof typeof canvasParams>) {
            canvasParams[key] = Math.round(canvasParams[key]);
        }

        const coordToPointerEvent = coordToPointerEventFromCanvasParams(canvasParams);

        // Enable debug mode
        await page.keyboard.press("Control+`");
        await addLayer.click();
        await page.getByRole("option", { name: "DEBUG: Select Points" }).click();
        await page.getByLabel("Straight").click();
        await page.getByLabel("Diagonal").click();
        await page.getByText("Save").click();

        // Draw a line from top-left to bottom-right.
        // TODO: The svg to screen coordinate translation gets less accurate the further from 0,0 you get, which you can observe from the bottom-right dot being off-center.
        let pointerEvent = coordToPointerEvent(1, 1);
        await canvas.dispatchEvent("pointerdown", pointerEvent);
        pointerEvent = coordToPointerEvent(10, 10);
        await canvas.dispatchEvent("pointermove", pointerEvent);
        await canvas.dispatchEvent("pointerup", pointerEvent);

        await expect(page).toHaveScreenshot({ clip: canvasParams, scale: "css" });
    });
});
