export class DelayedCallback {
    callback: null | (() => any) = null;

    get wasCalled() {
        return this.callback === null;
    }

    set(cb: null | (() => any)) {
        this.callback = cb;
    }

    call() {
        this.callback?.();
        this.callback = null;
    }
}

export class LatestTimeout {
    timeoutId = undefined as undefined | number;

    after(sleepMS: number, func: () => void) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(func, sleepMS);
    }

    clear() {
        window.clearTimeout(this.timeoutId);
    }
}
