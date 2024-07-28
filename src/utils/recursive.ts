export const deepClone = <T>(object: T): T => {
    if (typeof object !== "object" || object === null) {
        return object;
    } else if (Array.isArray(object)) {
        return object.map((obj) => deepClone(obj)) as T;
    } else {
        const result = {};
        for (const key of Object.keys(object)) {
            result[key as never] = deepClone(object[key as never]);
        }
        return result as T;
    }
};

export const isEqual = <T>(a: T, b: T): boolean => {
    if (typeof a !== typeof b) {
        return false;
    } else if (typeof a !== "object") {
        return a === b;
    } else if (a === b) {
        // null or same object
        return true;
    } else if (!a || !b) {
        return false;
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        // eslint-disable-next-line unicorn/no-for-loop
        for (let i = 0; i < a.length; i++) {
            if (!isEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    } else if (Array.isArray(a) || Array.isArray(b)) {
        return false;
    } else if (Object.keys(a).length === Object.keys(b).length) {
        for (const key of Object.keys(a)) {
            if (!(key in (b as any))) {
                return false;
            } else if (!isEqual(a[key as never], b[key as never])) {
                false;
            }
        }
        return true;
    } else {
        return false;
    }
};
