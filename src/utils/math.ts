import { euclidean } from "../algorithms/hopStraight";
import { Vector } from "../types";

// TODO: Tests
// Rename to Vector and replace the simple `type Vector=[number, number]`
export class FancyVector {
    public x: number;
    public y: number;
    constructor([x, y]: Vector) {
        this.x = x;
        this.y = y;
    }

    get xy() {
        return [this.x, this.y] as Vector;
    }

    get length() {
        return euclidean(0, 0, this.x, this.y);
    }

    // TODO: Rename add/subtract
    plus(other: FancyVector | Vector) {
        if (other instanceof FancyVector) {
            other = other.xy;
        }

        return new FancyVector([this.x + other[0], this.y + other[1]]);
    }

    minus(other: FancyVector | Vector) {
        return this.scale(-1).plus(other).scale(-1); // TODO: Too lazy right now...
    }

    scale(by: number) {
        return new FancyVector([by * this.x, by * this.y]);
    }
}
