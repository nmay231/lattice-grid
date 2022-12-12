import { proxy } from "valtio";

export class OrderedMap<V> {
    map = proxy<Record<string, V>>({});
    order = proxy<string[]>([]);

    set(key: string, value: V, nextKey: string | null = null): void {
        if (key in this.map) {
            this.order.splice(this.order.indexOf(key), 1);
        }
        this.map[key] = value;
        if (nextKey === null || !(nextKey in this.map)) {
            this.order.push(key);
        } else {
            this.order.splice(this.order.indexOf(nextKey), 0, key);
        }
    }

    has(key: string): boolean {
        return key in this.map;
    }

    get(key: string): V {
        return this.map[key];
    }

    getNextKey(key: string): string | null {
        const i = this.order.indexOf(key);
        return i === -1 || i === this.order.length - 1 ? null : this.order[i + 1];
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
        const had = this.has(key);
        delete this.map[key];
        this.order.splice(this.order.indexOf(key), 1);
        return had;
    }

    // TODO: toJSON()
}

export class IndexedOrderedMap<V> extends OrderedMap<V> {
    currentKey: string | null = null;
    constructor(public selectable: (value: V) => boolean = () => true) {
        super();
    }

    set(key: string, value: V, nextKey: string | null = null): void {
        super.set(key, value, nextKey);
        if (this.selectable(value)) {
            this.currentKey = key;
        }
    }

    delete(key: string): boolean {
        if (!this.has(key)) {
            return false;
        }

        const index = this.order.indexOf(key);
        this.order.splice(index, 1);
        delete this.map[key];

        if (this.currentKey === key) {
            let nextId = null;

            // We try to select the next id without wrapping to the other end
            for (const id of this.order.slice(index)) {
                if (this.selectable(this.map[id])) {
                    nextId = id;
                    break;
                }
            }

            // If that fails, try selecting the previous id
            if (nextId === null) {
                for (const id of this.order.slice(0, index).reverse()) {
                    if (this.selectable(this.map[id])) {
                        nextId = id;
                        break;
                    }
                }
                // If THAT fails, then no id is selectable anyways and currentKey should be null
            }
            this.currentKey = nextId;
        }
        return true;
    }
}
