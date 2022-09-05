import { useAtom, useAtomValue } from "jotai";
import { isEqual } from "lodash";
import { useEffect } from "react";
import { constraintSettingsAtom } from "../../../atoms/constraintSettings";
import { layersAtom } from "../../../atoms/layers";
import { usePuzzle } from "../../../atoms/puzzle";
import { availableLayers } from "../../../logic/layers";
import { blurActiveElement } from "../../../utils/DOMUtils";
import { JsonFormsWrapper } from "../../JsonFormsWrapper";

const noSettingsPreset = <i>No settings for this layer</i>;

export const LayerConstraintSettings = () => {
    const puzzle = usePuzzle();
    const { layers, currentLayerId: id } = useAtomValue(layersAtom);
    const layer = id && puzzle.layers[id];

    const [data, setData] = useAtom(constraintSettingsAtom);

    useEffect(() => {
        if (layer) {
            setData(layer.rawSettings);
        }
    }, [layer, setData]);

    if (!layer || !id) {
        return <i>Add a layer to get started</i>;
    }
    if (!data) {
        return noSettingsPreset;
    }

    const layerType = layers.filter((layer_) => layer_.id === id)[0].type;
    const layerClass = availableLayers[layerType as keyof typeof availableLayers];

    if (!layerClass.constraints) {
        return noSettingsPreset;
    }

    const { schema, uischemaElements } = layerClass.constraints || {};
    const uischema = { type: "VerticalLayout", elements: uischemaElements };

    const changed = !isEqual(data, layer.rawSettings);

    const handleSubmit: React.FormEventHandler = (event) => {
        event.preventDefault();

        puzzle.changeLayerSettings(id, data);

        setData({
            // Guarantee that JSONForms didn't remove fields that are not specified in regular settings (e.g. control settings)
            ...layer.rawSettings,
            // Besides, calling setData() is required to trigger a rerender
            ...data,
        });

        puzzle.renderChange({ type: "draw", layerIds: [id] });
        blurActiveElement();
    };

    const handleCancel = () => {
        setData(layer.rawSettings);
        blurActiveElement();
    };

    // TODO: Handle when no layers are present.
    return (
        <div {...puzzle.controls.stopPropagation}>
            <form action="#" onSubmit={handleSubmit}>
                <JsonFormsWrapper
                    data={data}
                    setData={(newData: any) => {
                        setData(newData);
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
