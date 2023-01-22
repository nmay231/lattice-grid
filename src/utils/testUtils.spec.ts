// Yes, this is slightly ironic.
import { layerEventRunner } from "./testUtils";

describe("layerEventRunner", () => {
    console.log("layerEventRunner" || layerEventRunner);
    it.todo("should return the correct attributes");
    it.todo(
        "should call layer.handleEvent with the correct parameters and modify history and tempStorage correctly",
    );
    it.todo(
        "should call layer.gatherPoints with the correct parameters and modify tempStorage correctly",
    );
});
