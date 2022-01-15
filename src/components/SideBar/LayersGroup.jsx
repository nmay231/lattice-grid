import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDispatch, useSelector } from "react-redux";
import { availableLayers } from "../../logic/layers";
import { awaitModalFormSubmission, openModal } from "../../redux/modal";
import { reorderLayers, selectLayer } from "../../redux/puzzle";
import { SortableItem } from "../SortableItem";
import { Group } from "./Group";

export const LayersGroup = ({ puzzle }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const dispatch = useDispatch();
    const layers = useSelector((state) => state.puzzle.layers);
    const selectedLayer = useSelector((state) => state.puzzle.selectedLayer);

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const ids = layers.map(({ id }) => id);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over?.id);
            dispatch(reorderLayers(arrayMove(layers, oldIndex, newIndex)));
            puzzle.redrawScreen();
        }
    };

    const handleAddNewLayer = async () => {
        const layerIds = Object.keys(availableLayers);
        layerIds.sort();

        const initialData = { layerType: layerIds[0] };
        const schemaProperties = {
            layerType: {
                type: "string",
                enum: layerIds,
            },
        };
        const uiGroups = [];
        for (let id of layerIds) {
            const layer = availableLayers[id];
            if (!layer.settingsSchema || !layer.settingsUISchemaElements) {
                continue;
            }
            initialData[id] = layer.defaultSettings;
            schemaProperties[id] = layer.settingsSchema;
            uiGroups.push({
                type: "Group",
                elements: layer.settingsUISchemaElements.map((element) => ({
                    ...element,
                    scope: element.scope.replace("#", `#/properties/${id}`),
                })),
                rule: {
                    effect: "SHOW",
                    condition: {
                        scope: "#/properties/layerType",
                        schema: { enum: [id] },
                    },
                },
            });
        }

        dispatch(
            openModal({
                data: initialData,
                schema: {
                    type: "object",
                    properties: schemaProperties,
                },
                uischema: {
                    type: "VerticalLayout",
                    elements: [
                        {
                            type: "Control",
                            label: "Layer",
                            scope: "#/properties/layerType",
                        },
                        ...uiGroups,
                    ],
                },
            })
        );

        const { data, result } = await awaitModalFormSubmission();
        if (result === "cancel") {
            return;
        }
        puzzle.addLayer(availableLayers[data.layerType], data[data.layerType]);
        puzzle.redrawScreen();
    };

    const handleSelect = (index) => (event) => {
        event.stopPropagation();
        dispatch(selectLayer({ index }));
    };

    const handleDelete = (id) => (event) => {
        event.stopPropagation();
        puzzle.removeLayer(id);
    };

    // TODO: Handle layer options? Or should that just be listed after the layer group?
    return (
        <Group name="Layers" expanded>
            <div>
                <button onPointerDown={handleAddNewLayer}>Add new layer</button>
            </div>
            <DndContext
                sensors={sensors}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <SortableContext
                    items={layers}
                    strategy={verticalListSortingStrategy}
                >
                    {layers.map(
                        ({ id, hidden }, index) =>
                            !hidden && (
                                <SortableItem key={id} id={id}>
                                    {/* TODO: Change the element to be the whole sortableItem but excluding the itemHandle (and maybe not just a simple onPointDown) */}
                                    <p onPointerDown={handleSelect(index)}>
                                        {index === selectedLayer && "✓"}
                                        {id}
                                    </p>
                                    {/* TODO: Icon (?) */}
                                    <div onPointerDown={handleDelete(id)}>
                                        X
                                    </div>
                                </SortableItem>
                            )
                    )}
                </SortableContext>
            </DndContext>
        </Group>
    );
};
