import { useProxy } from "valtio/utils";
import { availableLayers } from "../../../layers";
import { usePuzzle } from "../../../state/puzzle";
import { JSONSchema, Layer, LayerClass, UnknownObject } from "../../../types";
import { useFocusGroup } from "../../../utils/focusManagement";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

type InnerProps = { layer: Layer; controls: JSONSchema };

const _LayerControlSettings = ({ layer, controls }: InnerProps) => {
    const puzzle = usePuzzle();
    const { ref, unfocus } = useFocusGroup({ puzzle, group: "controlSettings" });

    const { schema, uischemaElements } = controls;
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    return (
        <div ref={ref}>
            {/* TODO: Hack Mantine's useFocusTrap so it doesn't focus the first element right away */}
            <div data-autofocus></div>
            <JsonFormsWrapper
                data={layer.rawSettings}
                onChange={(newData: UnknownObject) => {
                    puzzle.changeLayerSettings(layer.id, newData);
                    puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
                    unfocus();
                }}
                schema={schema}
                uischema={uischema}
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
        return <i>This layer has no control settings</i>;
    }

    return <_LayerControlSettings key={id} layer={layer} controls={layerClass.controls} />;
};
