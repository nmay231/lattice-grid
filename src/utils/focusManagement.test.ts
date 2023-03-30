import { useFocusGroup } from "./focusManagement";

describe("focus groups", () => {
    beforeAll(() => {
        vi.useFakeTimers();
    });
    afterAll(() => {
        vi.useRealTimers();
    });
    afterEach(() => {
        vi.clearAllTimers();
    });
    console.log("useFocusGroup" || useFocusGroup);

    // I'll definitely have to refactor the code to be a single function that builds all of the focus management utilities that share state correctly, like how it was for layersState originally.
    // Actually, it could probably be a single function for focusGroups and a different function that takes the state as input for modals (because it only needs a small portion of the state and is sorta separate other than that). If that's the case, have a different describe() block.
    // The tests will probably need to use @testing-library

    it.todo("changes focus into the same group");
    it.todo("changes focus into a different group");
    it.todo("steals back focus from tab-index=-1");
    it.todo("should have tests to do with the special cases of group=layerList and =none");
});
