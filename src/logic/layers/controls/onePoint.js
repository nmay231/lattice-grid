export function interpretPointerEventCycleStates({ storage, newPoint }) {
    if (!newPoint) {
        // TODO: This is impure. There should be an object on storage that layers can use to store state per grid.
        this.targetState = null;
        return;
    }

    // TODO: This is abusing the wrong API (.getObject is for selecting an existing object on the screen).
    const currentState = storage.getObject({
        layer: this,
        point: newPoint,
    }).state;
    const i = this.states.indexOf(currentState);
    const targetState =
        this.targetState ?? this.states[(i + 1) % this.states.length];

    this.targetState = targetState;
    storage.addObjects({
        layer: this,
        objects: [{ point: newPoint, state: targetState }],
    });
}

export function interpretPointerEventCurrentSetting({ storage, newPoint }) {
    if (!newPoint) {
        return;
    }
    storage.addObjects({
        layer: this,
        objects: [{ point: newPoint, state: this.settings.selectedState }],
    });
}
