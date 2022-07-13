import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { constraintSettingsAtom } from "../../../atoms/constraintSettings";
import { layersAtom } from "../../../atoms/layers";
import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

export const LayerControlSettings = () => {
    const puzzle = usePuzzle();
    const { layers, currentLayerId: id } = useAtomValue(layersAtom);
    const layer = puzzle.layers[id || ""];

    const [data, setData] = useState<object | null>(null);
    const [constraintSettings, setConstraintSettings] = useAtom(
        constraintSettingsAtom,
    );

    // We want to update a layer's settings whenever data changes, but changing id also changes data.
    // So we keep track of the data and only update settings when data changes but id doesn't.
    const [lastId, setLastId] = useState(id);

    useEffect(() => {
        if (layer) {
            setData(layer.rawSettings);
        }
        // Putting constraintSettings as a render dependency is necessary to update this component's `data`
    }, [layer, setData, constraintSettings]);

    if (!data || !layer || !id) {
        return <></>;
    }

    const layerType = layers.filter((layer) => layer.id === id)[0].layerType;
    const layerClass = availableLayers[layerType];

    const { schema, uischemaElements } = layerClass.controls || {};
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    return (
        <div {...puzzle.controls.stopPropagation}>
            <JsonFormsWrapper
                data={data}
                setData={(newData: any) => {
                    setData(newData);
                    // Constraint settings cannot be left out of date
                    setConstraintSettings(newData);

                    if (id !== lastId) {
                        setLastId(id);
                    } else {
                        puzzle.changeLayerSettings(id, newData);

                        // TODO: This can call .redrawScreen() twice if changing settings adds/removes objects as well as changing how the objects are displayed.
                        // e.g. using the ToggleCharacters() layer, you might change the allowed characters and the displayStyle/positioning and that will call it twice: once from .changeLayerSettings (calling ControlsManager.handleLayerActions) and a second time directly in this function.
                        // TODO: Changes = []
                        puzzle.renderChange({ type: "draw", layerIds: [id] });
                        blurActiveElement();
                    }
                }}
                schema={schema}
                uischema={uischema}
            />
            {layerClass.controls ? null : <i>No controls for this layer</i>}
        </div>
    );
};
