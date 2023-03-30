import fc from "fast-check";
import { Mock } from "vitest";
import { given } from "./fcArbitraries";

describe("given", () => {
    beforeAll(() => {
        vi.mock("fast-check", async () => {
            const fc = (await vi.importActual("fast-check")) as any;
            return {
                default: {
                    ...fc,
                    assert: vi.fn().mockReturnValue("assert"),
                    property: vi.fn().mockReturnValue("property"),
                },
            };
        });
    });

    afterAll(() => {
        vi.clearAllMocks();
    });

    it("wraps fc.assert correctly when given no runtime parameters", () => {
        const predicate = vi.fn();
        const arbitraries = [fc.integer(), fc.string()];
        given(arbitraries as any).assertProperty(predicate);

        expect(fc.property as Mock).toBeCalledWith(...arbitraries, predicate);
        expect(fc.assert as Mock).toBeCalledWith("property", undefined);
    });

    it("wraps fc.assert correctly when given runtime parameters", () => {
        const predicate = vi.fn();
        const arbitraries = [fc.string(), fc.integer()];
        const parameters = { numRuns: 42 };
        given(arbitraries as any, parameters).assertProperty(predicate);

        expect(fc.property as Mock).toBeCalledWith(...arbitraries, predicate);
        expect(fc.assert as Mock).toBeCalledWith("property", { numRuns: 42 });
    });
});
