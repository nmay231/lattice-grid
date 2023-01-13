import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { availableLayers } from "../../../layers";
import { constraintSettingsProxy } from "../../../state/constraintSettings";

import { usePuzzle } from "../../../state/puzzle";
import { UnknownObject } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { valtioRef } from "../../../utils/imports";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

export const LayerControlSettings = () => {
    const puzzle = usePuzzle();

    const snap = useSnapshot(puzzle.layers);
    const id = snap.currentKey;
    const layer = id && puzzle.layers.get(id);

    const [data, setData] = useState<UnknownObject | null>(null);
    const settingsSnap = useSnapshot(constraintSettingsProxy);

    // We want to update a layer's settings whenever data changes, but changing id also changes data.
    // So we keep track of the data and only update settings when data changes but id doesn't.
    const [lastId, setLastId] = useState(id);

    useEffect(() => {
        if (layer) {
            setData(layer.rawSettings);
        }
        // Putting settingsSnap.settings as a render dependency is necessary to update this component's `data`
        // TODO: This doesn't seem necessary
    }, [layer, settingsSnap.settings]);

    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });

    if (!data || !layer || !id) {
        return <></>;
    }

    const layerType = snap.map[id].type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers];

    const { schema, uischemaElements } = layerClass.controls || {};
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    return (
        <div ref={ref}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            <JsonFormsWrapper
                data={data}
                setData={(newData: UnknownObject) => {
                    setData(newData);
                    // Constraint settings cannot be left out of date
                    // TODO: PuzzleManager maybe should have a .selectLayer method. If so, this needs to go in that instead of this.
                    // eslint-disable-next-line valtio/state-snapshot-rule
                    constraintSettingsProxy.settings = valtioRef(newData);

                    if (id !== lastId) {
                        setLastId(id);
                    } else {
                        puzzle.changeLayerSettings(id, newData);
                        puzzle.renderChange({ type: "draw", layerIds: [id] });
                        unfocus();
                    }
                }}
                schema={schema}
                uischema={uischema}
            />
            {layerClass.controls ? null : <i>No control settings for this layer</i>}
        </div>
    );
};
