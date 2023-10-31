import { Text } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { usePuzzle } from "../../../state/puzzle";
import { FormSchema, Layer, LayerProps } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { LayerForm, layerSettingsRerender } from "../../LayerForm";

type InnerProps = { layer: Layer; constraints: FormSchema<LayerProps> };

const _LayerConstraintSettings = ({ layer, constraints }: InnerProps) => {
    const puzzle = usePuzzle();
    const rerender = useProxy(layerSettingsRerender);
    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });

    return (
        <div ref={ref}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            <LayerForm
                // Force a new LayerForm to be created whenever settings changes. `initialValues` are stored in useState.
                key={rerender.key}
                initialValues={layer.settings}
                elements={constraints.elements}
                submitLabel="Save"
                resetLabel="Cancel"
                onSubmit={(newSettings) => {
                    rerender.key += 1;
                    for (const [key, value] of Object.entries(newSettings)) {
                        if (layer.settings[key as never] !== value) {
                            puzzle.changeLayerSetting(layer.id, key, value);
                        }
                    }
                    puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
                    unfocus();
                }}
            />
        </div>
    );
};

export const LayerConstraintSettings = () => {
    const { layers: layersProxy } = usePuzzle();
    const layers = useProxy(layersProxy);
    const id = layers.currentKey;
    const layer = id && layers.get(id);

    if (!layer) {
        return (
            <Text fs="italic" m="xs">
                Add a layer to get started
            </Text>
        );
    }

    if (!layer.klass.constraints) {
        return (
            <Text fs="italic" m="xs">
                This layer has no settings
            </Text>
        );
    }

    return (
        <_LayerConstraintSettings key={id} layer={layer} constraints={layer.klass.constraints} />
    );
};
