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
