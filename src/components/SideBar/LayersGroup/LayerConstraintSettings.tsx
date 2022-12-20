import { isEqual } from "lodash";
import { useEffect } from "react";
import { ref, useSnapshot } from "valtio";
import { availableLayers } from "../../../logic/layers";
import { constraintSettingsProxy } from "../../../state/constraintSettings";
import { useLayers } from "../../../state/layers";
import { usePuzzle } from "../../../state/puzzle";
import { UnknownObject } from "../../../types";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

const noSettingsPreset = <i>No settings for this layer</i>;

export const LayerConstraintSettings = () => {
    const puzzle = usePuzzle();
    const {
        Layers: { state: layersState },
    } = useLayers();
    const layersSnap = useSnapshot(layersState);
    const id = layersSnap.currentLayerId;
    const layer = id && puzzle.layers[id];

    const settingsSnap = useSnapshot(constraintSettingsProxy);

    useEffect(() => {
        if (layer) {
            constraintSettingsProxy.settings = ref(layer.rawSettings);
        }
    }, [layer]);

    if (!layer || !id) {
        return <i>Add a layer to get started</i>;
    }
    if (!settingsSnap.settings) {
        return noSettingsPreset;
    }

    const layerType = layersSnap.layers[id].type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers];

    if (!layerClass.constraints) {
        return noSettingsPreset;
    }

    const { schema, uischemaElements } = layerClass.constraints || {};
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    const changed = !isEqual(settingsSnap.settings, layer.rawSettings);

    const handleSubmit: React.FormEventHandler = (event) => {
        event.preventDefault();

        puzzle.changeLayerSettings(id, constraintSettingsProxy.settings);

        constraintSettingsProxy.settings = ref({
            // Guarantee that JSONForms didn't remove fields that are not specified in regular settings (e.g. control settings)
            ...layer.rawSettings,
            // Besides, calling setData() is required to trigger a rerender
            ...constraintSettingsProxy.settings,
        });

        puzzle.renderChange({ type: "draw", layerIds: [id] });
        blurActiveElement();
    };

    const handleCancel = () => {
        constraintSettingsProxy.settings = ref(layer.rawSettings);
        blurActiveElement();
    };

    // TODO: Handle when no layers are present.
    return (
        <div {...puzzle.controls.stopPropagation}>
            <form action="#" onSubmit={handleSubmit}>
                <JsonFormsWrapper
                    data={settingsSnap.settings}
                    setData={(newData: UnknownObject) => {
                        constraintSettingsProxy.settings = ref(newData);
                    }}
                    schema={schema}
                    uischema={uischema}
                />
                <button type="submit" disabled={!changed}>
                    Save
                </button>
                <button type="button" disabled={!changed} onClick={handleCancel}>
                    Cancel
                </button>
            </form>
        </div>
    );
};
