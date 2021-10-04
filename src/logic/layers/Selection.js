export class SelectionLayer {
    static id = "Selections";
    static unique = true;

    hidden = true;
    controls = "onePoint";
    pointTypes = ["cells"];

    defaultRenderOrder = 9;
    encoderPrefix = "S";
    getBlits(grid, settings, change) {
        // TODO
        return [];
    }
}
