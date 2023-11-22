export const PUT_AT_END = Symbol("PUT_AT_END");
export type PutAtEnd = typeof PUT_AT_END;

export class OrderedMap<V> {
    map: Record<string, V> = {};
    order: string[] = [];

    clear(): void {
        this.order = [];
        this.map = {};
    }

    set(key: string, value: V, prevKey = PUT_AT_END as PutAtEnd | null | string): void {
        if (key in this.map) {
            this.order.splice(this.order.indexOf(key), 1);
        }
        this.map[key] = value;

        if (prevKey === null) {
            this.order.unshift(key);
        } else if (prevKey === PUT_AT_END || !(prevKey in this.map) || key === prevKey) {
            this.order.push(key);
        } else {
            this.order.splice(this.order.indexOf(prevKey) + 1, 0, key);
        }
    }

    has(key: string): boolean {
        return key in this.map;
    }

    get(key: string): V {
        return this.map[key];
    }

    getPrevKey(key: string): string | null {
        const i = this.order.indexOf(key);
        return i === -1 || i === 0 ? null : this.order[i - 1];
    }

    getNextKey(key: string): string | null {
        const i = this.order.indexOf(key);
        return i === -1 || i === this.order.length - 1 ? null : this.order[i + 1];
    }

    getFirstKey(): string | null {
        return this.order.length ? this.order[0] : null;
    }

    getLastKey(): string | null {
        return this.order.length ? this.order[this.order.length - 1] : null;
    }

    keys(): string[] {
        return this.order;
    }

    values(): V[] {
        return this.order.map((key) => this.map[key]);
    }

    entries(): Array<[string, V]> {
        return this.order.map((key) => [key, this.map[key]]);
    }

    delete(key: string): boolean {
        if (!this.has(key)) return false;
        delete this.map[key];
        this.order.splice(this.order.indexOf(key), 1);
        return true;
    }

    // TODO: toJSON()
}

export class IndexedOrderedMap<V> extends OrderedMap<V> {
    currentKey: string | null = null;

    constructor(public selectable: (value: V) => boolean = () => true) {
        super();
    }

    getNextSelectableKey(key: string): string | null {
        let next: string | null = key;
        do next = this.getNextKey(next) ?? null;
        while (next && !this.selectable(this.get(next)));
        return next;
    }

    getPrevSelectableKey(key: string): string | null {
        let prev: string | null = key;
        do prev = this.getPrevKey(prev) ?? null;
        while (prev && !this.selectable(this.get(prev)));
        return prev;
    }

    getFirstSelectableKey(): string | null {
        const first = this.getFirstKey();
        if (!first || this.selectable(this.map[first])) return first;
        return this.getNextSelectableKey(first);
    }

    getLastSelectableKey(): string | null {
        const last = this.getLastKey();
        if (!last || this.selectable(this.map[last])) return last;
        return this.getPrevSelectableKey(last);
    }

    delete(key: string): boolean {
        if (!this.has(key)) {
            return false;
        }

        const index = this.order.indexOf(key);
        this.order.splice(index, 1);
        delete this.map[key];
        if (this.currentKey === key) this.currentKey = null;

        return true;
    }

    select(key: string) {
        if (key in this.map && this.selectable(this.map[key])) {
            this.currentKey = key;
            return true;
        }
        return false;
    }

    _toJSON__TESTING() {
        return { order: this.keys(), currentKey: this.currentKey };
    }
}
