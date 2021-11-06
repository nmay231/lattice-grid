// TODO: I'm trying a different setup than the other functions for onePoint. It's a bit cleaner IMO.
// TODO: Rename this if I stick to it.
export const interpretPointerEventStopOnFirstPoint = (
    layer,
    { directional }
) => {
    layer.interpretPointerEvent = ({ storage, points, newPoint }) => {
        if (!newPoint || points.length === 1) {
            return;
        }
        const pair = points.slice(points.length - 2);
        if (!directional) {
            pair.sort();
        }
        const id = pair.join(",");
        // TODO: Abusing private attributes (storage.twoPoint)
        const exists = id in storage.twoPoint[layer.id];

        storage.addObjects({
            layer,
            objects: [
                {
                    points: pair,
                    state: exists ? undefined : layer.settings.selectedState,
                },
            ],
        });
    };
};

// TODO: Either merge this with the previous function or implement it
// eslint-disable-next-line no-unused-vars
function interpretPointerEventStopOnPointerRelease() {}
