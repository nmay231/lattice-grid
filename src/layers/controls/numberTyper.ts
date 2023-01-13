import { clamp as nClamp } from "lodash";
import { Keypress } from "../../types";

type TypeNumberArg = { max: number; negatives: boolean };

export const DO_NOTHING = Symbol("typeNumber: Do nothing");

const getClamper = (max: number) => {
    type Input = number | null | typeof DO_NOTHING;
    if (max === -1) {
        return (x: Input) => (typeof x === "number" ? x.toString() : x);
    } else {
        return (next: Input) => {
            if (typeof next === "number") {
                if (Math.abs(next) <= max) return nClamp(next, -max, max).toString();
                return (next % 10).toString();
            }
            return next;
        };
    }
};

export const numberTyper = ({ max, negatives }: TypeNumberArg) => {
    const clamp = getClamper(max);

    return (numberString: string, event: Keypress): string | null | typeof DO_NOTHING => {
        const number: number | null = numberString ? parseInt(numberString) : null;
        if (Number.isNaN(number)) return null;

        if (event.keypress === "Backspace") {
            return clamp(number === null ? null : Math.floor(number / 10) || null);
        } else if (event.type === "delete") {
            return null;
        } else if (event.keypress === "-") {
            // TODO: Keep the minus sign as part of an inProgress object and remove it when the interaction times out.
            if (!negatives) return DO_NOTHING;
            return clamp(number === null ? null : -number);
        } else if (event.keypress === "+" || event.keypress === "=") {
            if (!negatives) return DO_NOTHING;
            return clamp(number === null ? null : Math.abs(number));
        } else if (/^[0-9]$/.test(event.keypress)) {
            return clamp(10 * (number || 0) + parseInt(event.keypress));
        } else if (/^[a-fA-F]$/.test(event.keypress)) {
            // TODO: if (!settings.allowHex && (max === -1 || max > 10)) return DO_NOTHING;
            const one = number ? Math.sign(number) : 1;
            return clamp(one * parseInt(event.keypress.toLowerCase(), 36));
        }
        return DO_NOTHING; // Change nothing
    };
};
