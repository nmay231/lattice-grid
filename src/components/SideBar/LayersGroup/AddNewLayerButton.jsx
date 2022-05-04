import { availableLayers } from "../../../logic/layers";
import { usePuzzle } from "../../PuzzleContext/PuzzleContext";

export const AddNewLayerButton = () => {
    const puzzle = usePuzzle();

    const handleAddNewLayer = async () => {
        // Generate the JsonForms schema, uischema, and data required then open a modal
        const layerIds = Object.keys(availableLayers);
        layerIds.sort();

        const initialData = { layerType: layerIds[0] };
        const schemaProperties = {
            layerType: {
                type: "string",
                enum: layerIds,
            },
        };
        const uiGroups = [];
        for (let id of layerIds) {
            const layer = availableLayers[id];
            if (!layer.constraints) {
                continue;
            }
            initialData[id] = layer.defaultSettings;
            schemaProperties[id] = layer.constraints.schema;
            uiGroups.push({
                type: "Group",
                elements: layer.constraints.uischemaElements.map((element) => ({
                    ...element,
                    scope: element.scope.replace("#", `#/properties/${id}`),
                })),
                rule: {
                    effect: "SHOW",
                    condition: {
                        scope: "#/properties/layerType",
                        schema: { enum: [id] },
                    },
                },
            });
        }

        // dispatch(
        //     openModal({
        //         data: initialData,
        //         schema: {
        //             type: "object",
        //             properties: schemaProperties,
        //         },
        //         uischema: {
        //             type: "VerticalLayout",
        //             elements: [
        //                 {
        //                     type: "Control",
        //                     label: "Layer",
        //                     scope: "#/properties/layerType",
        //                 },
        //                 ...uiGroups,
        //             ],
        //         },
        //     }),
        // );

        // const { data, result } = await awaitModalFormSubmission();
        // if (result === "cancel") {
        //     return;
        // }
        // puzzle.addLayer(availableLayers[data.layerType], data[data.layerType]);
        // puzzle.redrawScreen();
    };

    return <button onPointerDown={handleAddNewLayer}>Add new layer</button>;
};
