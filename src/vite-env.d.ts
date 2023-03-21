/// <reference types="vite/client" />

interface Map<K, V> {
    // Allow chaining map.get(map.get(...))
    get(key: K | undefined): V | undefined;
}
