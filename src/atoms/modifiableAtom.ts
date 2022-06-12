import { atom } from "jotai";

type SubscriptionContainer<T extends object> = {
    subs: Array<(value: T | ((old: T) => T)) => void>;
    value: T;
};

// This is simpler to implement than isFunction
const isNotFunction = <T>(arg: any): arg is T => {
    return typeof arg !== "function";
};

const setAtom =
    <T extends object>(subscriptions: SubscriptionContainer<T>) =>
    (value: T | ((old: T) => T)) => {
        subscriptions.subs.forEach((setValue) => setValue(value));
        subscriptions.value = isNotFunction<T>(value)
            ? value
            : (value as (old: T) => T)(subscriptions.value);
    };

export const modifiableAtom = <T extends object = any>(initialValue: T) => {
    const atom_ = atom(initialValue);
    const subscriptions: SubscriptionContainer<T> = {
        subs: [],
        value: initialValue,
    };

    atom_.onMount = (setValue) => {
        subscriptions.subs.push(setValue);
        setValue(subscriptions.value);

        return () => {
            subscriptions.subs.splice(subscriptions.subs.indexOf(setValue), 1);
        };
    };
    const getValue = () => subscriptions.value;

    return { atom: atom_, setValue: setAtom<T>(subscriptions), getValue };
};
