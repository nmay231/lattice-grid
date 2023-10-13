import { Text } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { availableLayers } from "../../../layers";
import { usePuzzle } from "../../../state/puzzle";
import { FormSchema, Layer, LayerClass, LayerProps } from "../../../types";
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
                // Force a new LayerForm to be created whenever settings changes. Mantines's useForm assumes initialValues never changes.
                key={rerender.key}
                initialValues={layer.rawSettings}
                elements={constraints.elements}
                submitLabel="Save"
                resetLabel="Cancel"
                onSubmit={(newSettings) => {
                    rerender.key += 1;
                    puzzle.changeLayerSettings(layer.id, newSettings);
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

    const layerType = layer.type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers] as LayerClass;

    if (!layerClass.constraints) {
        return (
            <Text fs="italic" m="xs">
                This layer has no settings
            </Text>
        );
    }

    return <_LayerConstraintSettings key={id} layer={layer} constraints={layerClass.constraints} />;
};
