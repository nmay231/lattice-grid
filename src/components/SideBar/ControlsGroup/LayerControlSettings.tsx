import { Text } from "@mantine/core";
import { useProxy } from "valtio/utils";
import { layerIsGOOFy } from "../../../layers/traits/gridOrObjectFirst";
import { usePuzzle } from "../../../state/puzzle";
import { FormSchema, Layer, LayerProps } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { LayerForm, layerSettingsRerender } from "../../LayerForm";
import { ToggleGridObjectFirst } from "../../LayerForm/ToggleGridObjectFirst";
import { Numpad } from "./Numpad";

type InnerProps = { layer: Layer; controls: FormSchema<LayerProps> };

const _LayerControlSettings = ({ layer, controls }: InnerProps) => {
    const puzzle = usePuzzle();
    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });
    const rerender = useProxy(layerSettingsRerender);

    return (
        <div ref={ref} style={{ margin: "auto" }}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            {layerIsGOOFy(layer) && (
                <ToggleGridObjectFirst
                    value={layer.settings.gridOrObjectFirst}
                    onChange={(value) => {
                        puzzle.changeLayerSetting(layer.id, "gridOrObjectFirst", value);
                        // TODO: Update keypress indicators (the little thing that shows which keypress/mouse click activates a control).
                        unfocus();
                    }}
                />
            )}
            {controls.numpadControls && (
                <Numpad
                    onKeyPress={(keypress) => {
                        puzzle.controls.handleKeyPress(keypress);
                        unfocus();
                    }}
                />
            )}
            <LayerForm
                key={rerender.key}
                initialValues={layer.settings}
                elements={controls.elements}
                onChange={(key, value) => {
                    rerender.key += 1;
                    puzzle.changeLayerSetting(layer.id, key, value);
                    puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
                    unfocus();
                }}
            />
        </div>
    );
};

export const LayerControlSettings = () => {
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

    if (!layer.klass.controls) {
        return (
            <Text fs="italic" m="xs">
                This layer has no controls
            </Text>
        );
    }

    return <_LayerControlSettings key={id} layer={layer} controls={layer.klass.controls} />;
};
