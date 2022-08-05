import { ILayer } from "../../globals";

// The settings type is described separately from ILayer to allow easier custom typing.
type Settings = { onlyUsedInternally: string; canContainFunctions: () => void };

// A layer used for testing, and also contains inline documentation (might be out of date, FYI)
export const DummyLayer: ILayer & { settings: Settings } = {
    // Layer ids are unique so that object ids of different layers can be the same without issue
    id: "DO NOT USE",

    // For some layers, it only makes sense to allow a single instance, like CellOutlineLayer and SelectionLayer.
    unique: true,

    // If true, the layer is hidden from the sidebar. For example, CellOutlineLayer and SelectionLayer are not listed.
    ethereal: true,

    // Layers have settings, obviously, but not all settings are created equal. Generally, these settings can be split into two groups: constraints and controls. The biggest difference is that constraints define what objects are possible in the layer while controls just define how those objects are added to the grid. Put another, changing constraints might require deleting objects because they violate the current constraints; changing controls does not.

    // Layers (if they have settings at all), have both .rawSettings and .settings attributes. The rawSettings attr is some JSON object created by a form while settings contains the transformed data that might change the layer's behavior in a more convenient manner. rawSettings is also what is saved in localStorage. When settings change, layer.newSettings is called with the new rawSettings. rawSettings is set to defaultSettings for new layers.
    defaultSettings: { attr: "for new layers", JSONSerializable: true },
    rawSettings: {
        attr: "something submitted in the form",
        JSONSerializable: true,
    },
    settings: {
        onlyUsedInternally: "yes",
        canContainFunctions: () => true,
    },
    newSettings: (settingsChange) => ({}),

    // The .controls and .constraints attributes describe two separate forms of how to modify rawSettings. They are the same structure (both use JSON Forms). They are only separate because the forms need to be separate.
    constraints: { schema: {}, uischemaElements: [] },
    controls: { schema: {}, uischemaElements: [] },

    // TODO: to be implemented
    /* defaultRenderOrder determines what order layers are rendered *by default*. Users are allowed to reorder layers according to their needs. Smaller numbers are inserted into the layer array below larger ones. Sometimes render order is not enough to handle all rendering issues, e.g. ColorLayer might be drawn above CellOutlineLayer and has to deal with smaller cells around the edge of the grid (because the grid edge uses a thicker line). In this case, use occlusion tests. */
    // defaultRenderOrder: 2,

    // The main purpose of this function is to return all objects of the layer decomposed into individual "blits". Blits are simply ways to decompose objects into drawable parts. For example, a sudoku arrow is made of a circle and multiple lines marking the arrow's path and tip. Blits are grouped into objects for a couple of reasons. For one, they can have styles applied to every blit in the group. Also, grouped can be ordered to hide blemishes (it's easier to draw a good looking sudoku arrow by drawing the circle over the lines).
    getBlits: () => [],

    // Overlay blits are used for objects only shown when that layer is in focus, e.g. SelectionLayer overrides this function to show its blits when NumberLayer is focused.
    getOverlayBlits: () => [],

    // gatherPoints is called on pointerDown and pointerMove events, so it is optimized to only run code that is necessary. It simply returns a list of points that will be passed to handleEvent to interpret. If the array is empty (no new points have been selected), handleEvent is not even called. Technically, gatherPoints can return an array of anything, but that will only be used in instances where controls don't snap to the grid, like free-form bezier drawing.
    gatherPoints: () => [],

    // Basically, it receives all keyboard and pointer events in a controlled fashion. It returns an object with a .history attr that contains a list of object additions/deletions. There's also discontinueInput that allows a layer to stop receiving input (it's already drawn the object); that only applies to pointerMove/Up events, though.
    handleEvent: () => ({}),
};
