import { handleEventsUnorderedSets } from "./multiPoint";

describe("multiPoint.handleEventsUnorderedSets", () => {
    if (false) console.log(handleEventsUnorderedSets);

    // Remember to draw points in an unsorted order
    // How to handle ids changing as an object is drawn... I guess I could still "snapshot" it, and just update tests when things change
    it.todo("should draw a new object when none were selected");

    it.todo("should draw a new object when a previous one was selected");

    it.todo(
        "should expand, shrink, and expand an object that was previously selected",
    );

    it.todo(
        "should expand, shrink, and expand an object that was not previously selected",
    );

    it.todo(
        "should shrink, expand, and shrink an object that was previously selected",
    );

    it.todo(
        "should shrink, expand, and shrink an object that was not previously selected",
    );

    it.todo("should remove a point from an object after a simple click");

    it.todo("should delete a single-point object after a simple click");

    it.todo("should deselect an object when escape is pressed");
});
