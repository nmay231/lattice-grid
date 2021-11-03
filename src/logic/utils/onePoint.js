export function interpretPointerEventCycleStates({ storage, newPoint }) {
    if (!newPoint) {
        // TODO: This is impure. There should be an object on storage that layers can use to store state per grid.
        this.targetState = null;
        return;
    }

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
