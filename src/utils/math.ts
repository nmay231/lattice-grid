import { euclidean } from "../algorithms/hopStraight";
import { Vector } from "../types";

export class FancyVector {
    public x: number;
    public y: number;
    constructor([x, y]: Vector) {
        this.x = x;
        this.y = y;
    }

    static from(vec: FancyVector | Vector) {
        if (vec instanceof FancyVector) {
            return vec;
        }

        return new FancyVector([vec[0], vec[1]]);
    }

    get xy() {
        return [this.x, this.y] as Vector;
    }

    get size() {
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

    unit() {
        const size = this.size;
        return new FancyVector([this.x / size, this.y / size]); // TODO: division by zero
    }

    scale(by: number) {
        return new FancyVector([by * this.x, by * this.y]);
    }

    dotProduct(other: FancyVector | Vector) {
        other = FancyVector.from(other);
        return this.x * other.x + this.y * other.y;
    }

    scalarProjectionOnto(other: FancyVector | Vector) {
        other = FancyVector.from(other);
        // TODO: Potential division by zero
        return this.dotProduct(other) / other.size;
    }

    /** Since 90 degree rotations are calculable by simply swapping x, y and multiplying by negatives, this is separate than rotate(deg) */
    rotate90(clockwiseQuarterTurns: number) {
        // I wish modulus always returned positive like it does in python...
        const qt = ((clockwiseQuarterTurns % 4) + 4) % 4;
        switch (qt) {
            case 0:
                return this;
            case 1:
                return new FancyVector([this.y, -this.x]);
            case 2:
                return new FancyVector([-this.x, -this.y]);
            case 3:
                return new FancyVector([-this.y, this.x]);
            default:
                throw Error(`must be an integer number of quarter-turns: ${clockwiseQuarterTurns}`);
        }
    }

    equals(other: FancyVector | Vector) {
        other = FancyVector.from(other);

        return this.x === other.x && this.y === other.y;
    }
}
