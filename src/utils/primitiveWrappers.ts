// TODO: Move LatestTimeout to this file.

export class DelayedCallback {
    callback: null | (() => any) = null;

    get wasCalled() {
        return this.callback === null;
    }

    set(cb: () => any) {
        this.callback = cb;
    }

    call() {
        this.callback?.();
        this.callback = null;
    }
}
