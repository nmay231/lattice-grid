import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { availableLayers } from "../../../logic/layers";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

export const CurrentLayerSettings = ({ puzzle }) => {
    const layers = useSelector((state) => state.puzzle.layers);
    const selectedLayer = useSelector((state) => state.puzzle.selectedLayer);
    const [changed, setChanged] = useState(false);

    const { initialData, schema, uischema } = useMemo(() => {
        setChanged(false);

        const { layerType, id } = layers[selectedLayer];
        const layer = puzzle.layers[id];
        const layerClass = availableLayers[layerType];
        console.log(layer);

        return {
            initialData: layer.rawSettings,
            schema: layerClass.settingsSchema,
            uischema: {
                type: "VerticalLayout",
                elements: layerClass.settingsUISchemaElements,
            },
        };
    }, [layers, puzzle.layers, selectedLayer]);

    const [data, setData] = useState(initialData);
    useEffect(() => {
        setData(initialData);
        setChanged(false);
    }, [initialData]);

    const handleSubmit = (event) => {
        event.preventDefault();
        puzzle.changeLayerSettings(layers[selectedLayer].id, data);
        // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
        // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
        // TODO: Changes = []
        puzzle.redrawScreen([]);
    };

    // TODO: Handle when no layers are present.
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <JsonFormsWrapper
                    data={data}
                    setData={(newData) => {
                        console.log(`Change data`, newData);
                        console.log();
                        setData(newData);
                        setChanged(true);
                    }}
                    schema={schema}
                    uischema={uischema}
                />
                {changed && <button type="submit">Save</button>}
            </form>
        </div>
    );
};
