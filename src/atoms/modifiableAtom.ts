import { atom } from "jotai";

type SubscriptionContainer<T extends object = any> = {
    subs: Array<(newValue: T) => void>;
    value: T;
};

const setAtom =
    <T extends object>(subscriptions: SubscriptionContainer<T>) =>
    (value: T) => {
        subscriptions.subs.forEach((setValue) => setValue(value));
        subscriptions.value = value;
    };

export const modifiableAtom = <T extends object = any>(initialValue: T) => {
    const atom_ = atom(initialValue);
    const subscriptions: SubscriptionContainer = {
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

    return { atom: atom_, setValue: setAtom<T>(subscriptions) };
};
