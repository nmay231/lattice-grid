import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { availableLayers } from "../../../logic/layers";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";
import { usePuzzle } from "../../PuzzleContext/PuzzleContext";

export const LayerControlSettings = () => {
    const puzzle = usePuzzle();
    const layers = useSelector((state) => state.puzzle.layers);
    const id = useSelector((state) => state.puzzle.currentLayerId);
    const layer = puzzle.layers[id];
    const [data, setData] = useState(null);

    useEffect(() => {
        if (layer) {
            setData(layer.rawSettings);
        }
    }, [layer]);

    if (!data || !layer) {
        return <></>;
    }

    const layerType = layers.filter((layer) => layer.id === id)[0].layerType;
    const layerClass = availableLayers[layerType];

    if (!layerClass.controlsSchema || !layerClass.controlsUISchemaElements) {
        // We don't need to display anything if the layer only has regular settings but no control settings
        return <></>;
    }

    const schema = layerClass.controlsSchema;
    const uischema = {
        type: "VerticalLayout",
        elements: layerClass.controlsUISchemaElements,
    };

    return (
        <div {...puzzle.controls.stopPropagation}>
            <JsonFormsWrapper
                data={data}
                setData={(newData) => {
                    puzzle.changeLayerSettings(id, newData);

                    // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
                    // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
                    // TODO: Changes = []
                    puzzle.redrawScreen([]);
                    blurActiveElement();
                }}
                schema={schema}
                uischema={uischema}
            />
        </div>
    );
};
