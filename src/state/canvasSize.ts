import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { CANVAS_CONTAINER_ID } from "../components/SVGCanvas/SVGCanvas";

// Do grids really need to be scaled independently?
// TODO: Make this an object where the keys are the different grids so that grids can have different sizes, be scaled independently, etc.

// minX, minY, width, and height describe the size of the canvas in SVG units, i.e. it describes the SVG Viewbox
// zoom goes from 0 to 1: 0 fits everything on the screen and 1 is zoomed in (if the grid is large enough) so that 1 square cell is 60x60px large
export const canvasSizeProxy = proxy({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    zoom: 0,
    unclampedZoom: 0,
});

subscribeKey(canvasSizeProxy, "zoom", (zoom) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById(CANVAS_CONTAINER_ID)!.style.setProperty("--canvas-zoom", `${zoom}`);
});
