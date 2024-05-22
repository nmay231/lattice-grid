import { expect, test } from "@playwright/test";
import fc from "fast-check";
import Jimp from "jimp";
import type { PartialPointerEvent } from "../src/ControlsManager";
import { availableLayers } from "../src/layers";
import { FCRepeat, given } from "../src/utils/testing/fcArbitraries";

test.describe(() => {
    // We let fast-check control the timeout, so it is 30 secs per example instead of 30 secs for the whole test
    test.setTimeout(0);

    // TODO: This test has some weaknesses:
    // - It's slow and complicated to understand (speed is less of an issue since it's only run infrequently)
    // - It doesn't account for the interaction of question and answer objects
    // - It can't change layer settings
    // - It doesn't detect state that is different but visually identical, but I guess that would be a different test entirely.
    // - It generates a lot of similar puzzles (I would guess more than half are past examples)
    // - Duplicate layers are not tested (but duplicate layers should be disallowed for now, anyway)
    test("Encoded puzzles decode to the same puzzle", async ({ page }) => {
        const testedURLs = [] as string[];

        const FCCoordinate = FCRepeat(2, fc.integer({ min: 0, max: 100 }));

        const cursorMovements = fc.record({
            cursorStart: FCCoordinate,
            cursorMoves: fc.array(
                fc.oneof(
                    fc.record({
                        type: fc.constant("move" as const),
                        point: FCCoordinate,
                    }),
                    fc.record({ type: fc.constant("toggleUpDown" as const) }),
                ),
                { maxLength: 10 },
            ),
            keyboard: fc.option(
                fc.array(
                    fc.stringMatching(
                        /^([a-zA-Z0-9+\-=_]|Backspace|Space|Tab)$/,
                        // /^(Key[A-Z]|Digit[0-9]|Backspace|Space|Control|Minus|Equal)$/,
                    ),
                    { minLength: 1, maxLength: 3 },
                ),
            ),
        });
        const actions = fc.array(cursorMovements);
        const layers = fc.shuffledSubarray(
            Object.values(availableLayers)
                .filter(
                    (layer) =>
                        !layer.ethereal &&
                        layer.type !== "ToggleCharactersLayer" &&
                        layer.type !== "CenterMarksLayer" &&
                        layer.type !== "TopBottomMarksLayer",
                )
                .map((layer) => layer.displayName),
            { minLength: 1 },
        );
        await given([actions, layers], {
            numRuns: 100,
            timeout: 60_000,
            seed: -674930219,
            path: "9",
            // Keep `endOnFailure: true`, because it's very unlikely that fast-check will actually find a minimum example
            endOnFailure: true,
        }).assertAsyncProperty(async (actions, layers) => {
            page.on("console", async (msg) => {
                const values = [];
                for (const arg of msg.args()) values.push(await arg.jsonValue());
                console.log(...values);
            });

            // console.log(stringifyAnything(layers), stringifyAnything(actions));
            await page.goto("/edit");
            await page.getByRole("button", { name: "Reset Puzzle" }).click();

            const canvas = page.getByTestId("svg-canvas");
            const canvasParams = (await canvas.boundingBox())!;

            const coordToPointerEvent = (coord: [number, number]): PartialPointerEvent => {
                const [x, y] = coord;
                const clientX = (x * canvasParams.width) / 100 + canvasParams.x;
                const clientY = (y * canvasParams.height) / 100 + canvasParams.y;
                return { clientX, clientY, buttons: 1, pointerId: 0 };
            };

            const removeLayer = page.getByTestId("remove-layer");
            await removeLayer.click(); // Remove the number layer that's there by default
            const addLayer = page.locator(`input[value="Add New Layer"][aria-haspopup="listbox"]`);
            for (const layerDisplayName of layers) {
                await addLayer.click();
                await page.getByRole("option", { name: layerDisplayName }).click();
            }

            for (const { cursorMoves, cursorStart, keyboard } of actions) {
                let pointerEvent = coordToPointerEvent(cursorStart);
                await canvas.dispatchEvent("pointermove", pointerEvent);
                await canvas.dispatchEvent("pointerdown", pointerEvent);
                let nextToggle = "up" as "up" | "down";

                for (const act of cursorMoves) {
                    if (act.type === "toggleUpDown") {
                        await canvas.dispatchEvent(`pointer${nextToggle}`, pointerEvent);
                        nextToggle = nextToggle === "up" ? "down" : "up";
                    } else if (act.type === "move") {
                        pointerEvent = coordToPointerEvent(act.point);
                        await canvas.dispatchEvent("pointermove", pointerEvent);
                    }
                }
                if (nextToggle === "up") {
                    await canvas.dispatchEvent("pointerdown", pointerEvent);
                }

                if (keyboard)
                    for (const keyPress of keyboard) {
                        await page.keyboard.press(keyPress);
                    }
            }

            // Hide any remaining overlay elements before screenshoting the answer
            await page.evaluate(`
                const overlayGroups = document.querySelectorAll('[data-testid="svg-canvas-OverlayLayer"]');
                for (const group of overlayGroups) {
                    group.style.display = "none";
                }
            `);

            for (const key of Object.keys(canvasParams) as Array<keyof typeof canvasParams>) {
                canvasParams[key] = Math.round(canvasParams[key]);
            }

            const expectedImage = await page.screenshot({
                clip: canvasParams,
                scale: "css",
            });

            await page.getByText("Import / Export").click();
            const url = await page.getByTestId("exported-url").inputValue();
            if (testedURLs.includes(url)) {
                console.log(`Skipped: ${url}`);
                fc.pre(false);
            } else {
                console.log(`Testing: ${url}`);
                testedURLs.push(url);
            }
            await page.goto(url);

            // Hide "puzzle solved" notifications
            await page.evaluate(`
                const notifications = document.querySelector('.mantine-Notifications-root');
                notifications.style.display = "none";
            `);
            const actualImage = await page.screenshot({
                clip: canvasParams,
                scale: "css",
            });

            const diff = Jimp.diff(await Jimp.read(expectedImage), await Jimp.read(actualImage));

            if (diff.percent > 0) {
                diff.image.write("/tmp/diff.png");
                (await Jimp.read(expectedImage)).write("/tmp/expectedImage.png");
                (await Jimp.read(actualImage)).write("/tmp/actualImage.png");
            }

            expect(diff.percent).toBe(0);
        });
    });
});
