export class CellOutlineLayer {
    /* Prevents objects from being placed in the same spot. Set to a symbol to allow multiple instances of this layer per grid or to a string to prevent it. */
    id = "CellOutlineLayer";
    /* A human readable string describing the layer with a short phrase. */
    displayName;

    // TODO: rename controls and latticePoints to something more sensical

    /* Grids are represented by their lattice containing cell centers, edges, and corners. We define that centers, edges, and corners can be adjacent to each other, e.g. a center is adjacent to the edges and corners surrounding the cell. But contrary to common definitions, a center cannot be adjacent to another center and same with edges to edges and corners to corners. Instead, a center is adjacent to an edge or corner which is adjacent to a center. This allows for more control over which lattice points are selected when a user is drawing the object. */

    /* controls categorizes objects by the number of lattice points required and if order matters. The options are: onePoint, twoPoint, twoPointOrdered, multiPoint, multiPointOrdered, and freeform. For example, sudoku digits are onePoint, one segment lines are twoPoint, simple arrows are twoPointOrdered, multi-cell lines like German Whiskers are multiPoint, and sudoku arrows are multiPointOrdered. Freeform is special and will not be implemented for a while, but it will allow for things like using a custom image as the background, drawing with arbitrary bezier curves, etc. */
    controls = "onePoint";

    /* For onePoint and multiPoint controls, you can simply list a subset of [center, edge, corner] as points the layer can use. For twoPoint, twoPointOrdered, and multiPointOrdered, it is a bit more complicated because there is an inherit direction in how the object is drawn. To maximize control and generalization and minimize boilerplate, the layer whitelists or blacklists starting and ending points according to which points are adjacent to which. The best way to understand this is to read the code for existing layers and observe how they react to drawing motions. */
    latticePoints = ["center"];

    /* Are you allowed to (un)draw multiple objects in one touch-drag */
    drawMultiple = true;

    /* When a puzzle is encoded, each layer is encoded and then joined by exclamation marks. "Standard library" layers use a single char string to prefix its encoded layer string to mark which layer it is. "Preset" layers (which contain multiple layers) are namespaced with a single P (case sensitive) to avoid clashes with regular layers. External or modded layers are namespaced by an X. Therefore, PX would be an external preset.
    After the prefix, required modifiers are listed in a layer-agnostic format followed by optional params in a layer-specific format, followed finally by the data of the layer. The layer specific data must only contain characters from [0-9a-zA-Z().'_-].
    Example: ...!X<prefix>*<modifier1>*<modifier2>*<param1>.<param2>.<last-param>.<layer-data>!...
     */

    /* defaultRenderOrder determines what order layers are rendered *by default*. Users are allowed to reorder layers according to their needs. Smaller numbers are inserted into the layer array below larger ones. Sometimes render order is not enough to handle all rendering issues, e.g. ColorLayer might be drawn above CellOutlineLayer and has to deal with smaller cells around the edge of the grid (because the grid edge uses a thicker line). In this case, use occlusion tests. */
    // TODO: Always draw the thicker grid edges such that cells always have the same size. This helps with layers like ColorLayer, except maybe it doesn't matter at all... I will have a query system to get things like the largest circle or square possible in a cell/point, so I could simply have another for getting the cell outline as an svg path and simply avoid this whole issue. I'll probably do both and have cells be the same size as well as adding the cell outline query.
    defaultRenderOrder = 2;

    /* This is always a string. */
    encoderPrefix = "o";
    encode(grid, settings) {}
    decode(grid, settings) {}
}

export class SelectionLayer {
    id = "SelectionLayer";
    hidden = true;
    controls = "onePoint";
    latticePoints = ["center"];

    defaultRenderOrder = 9;
    encoderPrefix = "S";
}

export class ColorLayer {
    hidden = false;
    controls = "onePoint";
    latticePoints = ["center"];

    constructor() {
        this.id = Symbol();
    }

    defaultRenderOrder = 1;
    encoderPrefix = "c";
}

/* The following classes are only there to see what capabilities I expect of latticePoints */
export class MazeWallLayer {
    // These maze walls can only be drawn between two corners *across* an edge
    controls = "twoPoint";
    latticePoints = { corner: { edge: { corner: true } } };
}

export class MazePathLayer {
    // These maze paths can only be drawn between two centers *across* an edge
    controls = "twoPoint";
    latticePoints = { center: { edge: { center: true } } };
}

export class SudokuKillerSumLayer {
    // The arrow can only start on a center and end on a corner.
    controls = "twoPointOrdered";
    latticePoints = { center: { corner: true } };
}

export class SudokuArrowSumLayer {
    /* A sudoku arrow starts in a center and can cross an adjacent edge or corner to reach the next center */
    controls = "multiPointOrdered";
    latticePoints = { center: { corner: { center: true } } };
}

export class CellDividerLayer {
    // If on a square grid, this can be used for the walls puzzle invented by Naoki Inaba
    controls = "twoPoint";
    latticePoints = {
        edge: {
            center: { edge: true },
            corner: { edge: false },
        },
    };
}
