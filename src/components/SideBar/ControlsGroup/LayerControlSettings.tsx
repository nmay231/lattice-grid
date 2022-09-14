import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { constraintSettingsAtom } from "../../../atoms/constraintSettings";
import { useLayers } from "../../../atoms/layers";
import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";
import { UnknownObject } from "../../../types";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

export const LayerControlSettings = () => {
    const puzzle = usePuzzle();

    const { Layers } = useLayers();
    const snap = useSnapshot(Layers.state);
    const id = snap.currentLayerId;
    const layer = puzzle.layers[id || ""];

    const [data, setData] = useState<UnknownObject | null>(null);
    const [constraintSettings, setConstraintSettings] = useAtom(constraintSettingsAtom);

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

    const layerType = snap.layers[id].type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers];

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
                        puzzle.renderChange({ type: "draw", layerIds: [id] });
                        blurActiveElement();
                    }
                }}
                schema={schema}
                uischema={uischema}
            />
            {layerClass.controls ? null : <i>No control settings for this layer</i>}
        </div>
    );
};
