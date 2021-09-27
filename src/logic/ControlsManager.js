export class ControlsManager {
    constructor(puzzle) {
        this.puzzle = puzzle;
        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            // onPointerUp: this.onPointerUp.bind(this),
            // onPointerMove: this.onPointerMove.bind(this),
        };
    }

    getXY(event, grid, settings) {
        const { clientX, clientY, target } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = target.getBoundingClientRect();
        const { width, height } = grid.getCanvasRequirements();
        const { border } = settings;
        // These transformations convert dom coordinates to svg coords
        let x = ((clientX - left) * height) / realHeight - border,
            y = ((clientY - top) * width) / realWidth - border;
        return { x, y };
    }

    onPointerDown(event) {
        const {
            buttons,
            // TODO: I think that unless a layer specifically needs modifier keys, they should be used to pass user input onto the next layer
            // ctrlKey,
            // altKey,
            // shiftKey,
        } = event;
        const { layers, grid, settings } = this.puzzle;

        const cursor = this.getXY(event, grid, settings);

        // TODO: Pretend we're accessing the redux store to see which layer we are using
        const currentLayer = layers[0];
        const { controls, pointTypes } = currentLayer;

        if (controls === "onePoint") {
            const point = grid.nearest({
                to: cursor,
                intersection: "polygon",
                pointTypes,
            });
            if (point === null) {
                return;
            }

            grid.cycleState({
                layer: currentLayer,
                point,
            });
            this.puzzle.redrawScreen();
        }

        const options = [
            { intersection: "polygon", pointTypes: ["cells"] },
            { intersection: "ellipse", pointTypes: ["cells"] },
            { intersection: "polygon", pointTypes: ["corners"] },
            { intersection: "ellipse", pointTypes: ["corners"] },
            // { intersection: "polygon", pointTypes: ["edges"] },
            // { intersection: "ellipse", pointTypes: ["edges"] },
        ];
        if (buttons)
            console.log(
                ...options.map(
                    ({ intersection, pointTypes }) =>
                        intersection +
                        ":" +
                        pointTypes +
                        ":" +
                        grid.nearest({
                            to: cursor,
                            intersection,
                            pointTypes,
                        })
                )
            );

        event.preventDefault();
    }

    // onPointerMove(event) {
    //     const {button, clientX, clientY} = event;
    // }

    // onPointerUp(event) {
    //     console.log(event);
    // }
}
