import { isEqual } from "lodash";
import { useState } from "react";
import { useProxy } from "valtio/utils";
import { availableLayers } from "../../../layers";
import { usePuzzle } from "../../../state/puzzle";
import { JSONSchema, Layer, LayerClass } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

type InnerProps = { layer: Layer; constraints: JSONSchema };

const _LayerConstraintSettings = ({ layer, constraints }: InnerProps) => {
    const puzzle = usePuzzle();
    const initialSettings = layer.rawSettings;
    const [settings, setSettings] = useState(initialSettings);
    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });

    const handleSubmit: React.FormEventHandler = (event) => {
        event.preventDefault();

        puzzle.changeLayerSettings(layer.id, settings);
        puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
        unfocus();
    };

    const handleCancel = () => {
        setSettings(initialSettings);
        unfocus();
    };

    const changed = !isEqual(settings, initialSettings);

    const { schema, uischemaElements } = constraints;
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    return (
        <div ref={ref}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            <form action="#" onSubmit={handleSubmit}>
                <JsonFormsWrapper
                    data={settings}
                    onChange={setSettings}
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

export const LayerConstraintSettings = () => {
    const { layers: layersProxy } = usePuzzle();
    const layers = useProxy(layersProxy);
    const id = layers.currentKey;
    const layer = id && layers.get(id);

    if (!layer) {
        return <i>Add a layer to get started</i>;
    }

    const layerType = layer.type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers] as LayerClass;

    if (!layerClass.constraints) {
        return <i>This layer has no settings</i>;
    }

    return <_LayerConstraintSettings key={id} layer={layer} constraints={layerClass.constraints} />;
};
