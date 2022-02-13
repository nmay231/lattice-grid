import { isEqual } from "lodash";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { availableLayers } from "../../../logic/layers";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

export const CurrentLayerSettings = ({ puzzle }) => {
    const layers = useSelector((state) => state.puzzle.layers);
    const selectedLayer = useSelector((state) => state.puzzle.selectedLayer);
    const [data, setData] = useState(null);

    const { layerType, id } = layers[selectedLayer];
    const layer = puzzle.layers[id];
    const layerClass = availableLayers[layerType];

    const schema = layerClass.settingsSchema;
    const uischema = {
        type: "VerticalLayout",
        elements: layerClass.settingsUISchemaElements,
    };
    const changed = !isEqual(data, layer.rawSettings);

    useEffect(() => {
        setData(layer.rawSettings);
    }, [layer.rawSettings]);

    if (!data) {
        return <></>;
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        puzzle.changeLayerSettings(layers[selectedLayer].id, data);
        setData(null); // Trigger render

        // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
        // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
        // TODO: Changes = []
        puzzle.redrawScreen([]);
    };

    const handleCancel = () => {
        setData(layer.rawSettings);
    };

    // TODO: Handle when no layers are present.
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <JsonFormsWrapper
                    data={data}
                    setData={(newData) => {
                        setData(newData);
                    }}
                    schema={schema}
                    uischema={uischema}
                />
                <button type="submit" disabled={!changed}>
                    Save
                </button>
                <button
                    type="button"
                    disabled={!changed}
                    onClick={handleCancel}
                >
                    Cancel
                </button>
            </form>
        </div>
    );
};
