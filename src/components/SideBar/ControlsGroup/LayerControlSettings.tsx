import { useProxy } from "valtio/utils";
import { availableLayers } from "../../../layers";
import { usePuzzle } from "../../../state/puzzle";
import { FormSchema, Layer, LayerClass, LayerProps } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { LayerForm } from "../../LayerForm";
import { Numpad } from "./Numpad";

type InnerProps = { layer: Layer; controls: FormSchema<LayerProps> };

const _LayerControlSettings = ({ layer, controls }: InnerProps) => {
    const puzzle = usePuzzle();
    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });

    return (
        <div ref={ref}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            {controls.numpadControls && (
                <Numpad
                    onKeyPress={(keypress) => {
                        puzzle.controls.handleKeyPress(keypress);
                        unfocus();
                    }}
                />
            )}
            <LayerForm
                initialValues={layer.rawSettings}
                elements={controls.elements}
                onChange={(newSettings) => {
                    puzzle.changeLayerSettings(layer.id, newSettings);
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
        return <i>Add a layer to get started</i>;
    }

    const layerType = layer.type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers] as LayerClass;

    if (!layerClass.controls) {
        return <i>This layer has no controls</i>;
    }

    return <_LayerControlSettings key={id} layer={layer} controls={layerClass.controls} />;
};
