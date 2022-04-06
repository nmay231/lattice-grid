import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { availableLayers } from "../../../logic/layers";
import { behaviorSettingsAtom } from "../../../redux/jotai";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";
import { usePuzzle } from "../../PuzzleContext/PuzzleContext";

export const LayerControlSettings = () => {
    const puzzle = usePuzzle();
    const layers = useSelector((state) => state.puzzle.layers);
    const id = useSelector((state) => state.puzzle.currentLayerId);
    const layer = puzzle.layers[id];

    const [data, setData] = useState(null);
    const setBehaviorSettings = useSetAtom(behaviorSettingsAtom);

    // We want to update a layer's settings whenever data changes, but changing id also changes data.
    // So we keep track of the data and only update settings when data changes but id doesn't.
    const [lastId, setLastId] = useState(id);

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
                    setData(newData);
                    // Behavior settings cannot be left out of date
                    setBehaviorSettings(newData);

                    if (id !== lastId) {
                        setLastId(id);
                    } else {
                        puzzle.changeLayerSettings(id, newData);

                        // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
                        // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
                        // TODO: Changes = []
                        puzzle.redrawScreen([]);
                        blurActiveElement();
                    }
                }}
                schema={schema}
                uischema={uischema}
            />
        </div>
    );
};
