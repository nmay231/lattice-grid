import { useAtom } from "jotai";
import { isEqual } from "lodash";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { availableLayers } from "../../../logic/layers";
import { behaviorSettingsAtom } from "../../../redux/jotai";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";
import { usePuzzle } from "../../PuzzleContext/PuzzleContext";

export const LayerBehaviorSettings = () => {
    const puzzle = usePuzzle();
    const layers = useSelector((state) => state.puzzle.layers);
    const id = useSelector((state) => state.puzzle.currentLayerId);
    const layer = puzzle.layers[id];

    const [data, setData] = useAtom(behaviorSettingsAtom);

    useEffect(() => {
        if (layer) {
            setData(layer.rawSettings);
        }
    }, [layer, setData]);

    if (!data || !layer) {
        return <></>;
    }

    const layerType = layers.filter((layer) => layer.id === id)[0].layerType;
    const layerClass = availableLayers[layerType];

    if (!layerClass.settingsSchema || !layerClass.settingsUISchemaElements) {
        // We don't want to display anything if the layer only has control settings but no regular settings
        return <></>;
    }

    const schema = layerClass.settingsSchema;
    const uischema = {
        type: "VerticalLayout",
        elements: layerClass.settingsUISchemaElements,
    };
    const changed = !isEqual(data, layer.rawSettings);

    const handleSubmit = (event) => {
        event.preventDefault();
        puzzle.changeLayerSettings(id, data);

        setData({
            // Guarantee that JSONForms didn't remove fields that are not specified in regular settings (e.g. control settings)
            ...layer.rawSettings,
            // Besides, calling setData() is required to trigger a rerender
            ...data,
        });

        // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
        // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
        // TODO: Changes = []
        puzzle.redrawScreen([]);
        blurActiveElement();
    };

    const handleCancel = () => {
        setData(layer.rawSettings);
        blurActiveElement();
    };

    // TODO: Handle when no layers are present.
    return (
        <div {...puzzle.controls.stopPropagation}>
            <form action="#" onSubmit={handleSubmit}>
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
