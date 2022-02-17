import { handlePointerEventUnorderedSets } from "./controls/multiPoint";

export class KillerCagesLayer {
    static id = "Killer Cages";
    static unique = false;
    hidden = false;

    _handleKeyDown(args) {
        console.log("keyDown", this, args);
    }

    newSettings({ newSettings, grid, storage }) {
        // this.rawSettings = newSettings;

        handlePointerEventUnorderedSets(this, {
            handleKeyDown: this._handleKeyDown.bind(this),
            pointTypes: ["cells"],
            ensureConnected: false, // TODO: Change to true when properly implemented
            allowOverlap: true, // TODO: Change to false when properly implemented
            overwriteOthers: false,
        });
    }

    getBlits({ grid, stored }) {
        let blits = {};
        for (let id of stored.renderOrder) {
            const object = stored.objects[id];
            const { cageOutline } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "cageOutline",
                            svgPolygons: { inset: 5 },
                        },
                    },
                },
                points: object.points,
            });

            // TODO: Color the selected object
            for (let key in cageOutline.svgPolygons) {
                blits[`${object.id}-${key}`] = cageOutline.svgPolygons[key];
            }
        }

        return [
            {
                id: "killerCage",
                blitter: "polygon",
                blits,
                style: {
                    strokeDasharray: "7 3",
                    strokeDashoffset: 3.5,
                    stroke: "#333",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    fill: "none",
                },
                renderOnlyWhenFocused: true,
            },
        ];
    }
}
