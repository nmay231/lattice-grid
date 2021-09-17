/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */
import { CellOutlineLayer, SelectionLayer } from "./layers";
import { MasterBlitter } from "./blitters";
import { SquareGrid } from "./grids/SquareGrid";

export class PuzzleManager {
    settings;
    // TODO: Also store default render layers 1-9 so that if a user reorders some layers, new layers still are inserted in a reasonable spot according to their defaultRenderOrder
    layers = [new CellOutlineLayer(), new SelectionLayer()];
    canvas;
    ctx;
    grid;
    blitter;

    constructor(canvas) {
        this.settings = new Settings();
        this.grid = new SquareGrid(this.settings, { width: 10, height: 10 });

        const { width, height } = this.grid.getCanvasRequirements();
        canvas.width = width;
        canvas.height = height;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.blitter = new MasterBlitter(this.ctx, this.grid);
        this.blitter.blitToCanvas(this.layers, this.settings, {});
    }

    // TODO
    updateScreen() {}
}

/* The main reason this class is necessary is to automatically change defaults stored in localStorage for that seamless experience */
export class Settings {
    cellSize = 30;
    border = 15;
}

export const POINT_TYPES = {
    CELL: "cell",
    EDGE: "edge",
    CORNER: "corner",
};
