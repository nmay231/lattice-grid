import { clamp as nClamp } from "lodash";
import { Keypress } from "../../types";

//** Clamp the value to less than `max` and stringify it  */
const getCleaner = (max: number) => {
    if (max === -1) {
        return (x: number) => x.toString();
    } else {
        return (next: number) => {
            next = Math.abs(next) <= max ? next : next % 10;
            return nClamp(next, -max, max).toString();
        };
    }
};

const toOptionalNumber = (val: string | null): number | null => {
    const num = val ? parseInt(val) : null;
    if (Number.isNaN(num)) return null;
    return num;
};

type TypeNumberArg = { max: number; negatives: boolean };
export const numberTyper = ({ max, negatives }: TypeNumberArg) => {
    const clean = getCleaner(max);

    return (
        numberStrings: Array<string | null>,
        event: Keypress,
    ): Array<string | null> | "doNothing" => {
        if (!numberStrings.length) return "doNothing";

        let numbers = numberStrings.map(toOptionalNumber);

        if (event.keypress === "Backspace") {
            return numbers.map((num) => {
                if (num === null) return null;
                num = Math.floor(num / 10);
                return num ? clean(num) : null;
            });
        } else if (event.type === "delete") {
            return numbers.map(() => null);
        } else if (event.keypress === "-") {
            // TODO: Keep the minus sign as part of an inProgress object and remove it when the interaction times out.
            if (!negatives) return "doNothing";
            return numbers.map((num) => (num === null ? null : clean(-num)));
        } else if (/^[a-fA-F]$/.test(event.keypress)) {
            // TODO: if (!(settings.allowHex && (max === -1 || max > 10))) return "doNothing";
            // TODO: Should I allow the option to type multiDigit characters in hex?
            const num = clean(parseInt(event.keypress.toLowerCase(), 36));
            return numbers.map(() => num);
        }

        const isSame = numbers.reduce((prev, next) => (prev === next ? next : null));
        if (isSame === null) {
            // If not all of the selected numbers are the same, then they should all be considered unset numbers
            numbers = numbers.map(() => null);
        }
        if (/^[0-9]$/.test(event.keypress)) {
            return numbers.map((num) => clean(10 * (num || 0) + parseInt(event.keypress)));
        }
        return "doNothing"; // Change nothing
    };
};
