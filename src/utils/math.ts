import { TupleVector } from "../types";

export class Vec {
    constructor(public x: number, public y: number) {}

    static from(vec: Vec | TupleVector) {
        return vec instanceof Vec ? vec : new Vec(vec[0], vec[1]);
    }

    get xy() {
        return [this.x, this.y] as TupleVector;
    }

    get size() {
        return euclidean(0, 0, this.x, this.y);
    }

    plus(other: Vec | TupleVector) {
        if (other instanceof Vec) {
            other = other.xy;
        }

        return new Vec(this.x + other[0], this.y + other[1]);
    }

    minus(other: Vec | TupleVector) {
        return this.scale(-1).plus(other).scale(-1); // TODO: Too lazy right now...
    }

    unit() {
        const size = this.size;
        return new Vec(this.x / size, this.y / size); // TODO: division by zero
    }

    scale(by: number) {
        return new Vec(by * this.x, by * this.y);
    }

    dotProduct(other: Vec | TupleVector) {
        other = Vec.from(other);
        return this.x * other.x + this.y * other.y;
    }

    scalarProjectionOnto(other: Vec | TupleVector) {
        other = Vec.from(other);
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
                return new Vec(this.y, -this.x);
            case 2:
                return new Vec(-this.x, -this.y);
            case 3:
                return new Vec(-this.y, this.x);
            default:
                throw Error(`must be an integer number of quarter-turns: ${clockwiseQuarterTurns}`);
        }
    }

    equals(other: Vec | TupleVector) {
        other = Vec.from(other);

        return this.x === other.x && this.y === other.y;
    }

    originAngle() {
        return Math.atan2(this.y, this.x);
    }

    positiveAngleTo(vec: Vec | TupleVector) {
        vec = Vec.from(vec);
        const angle = Math.abs(this.originAngle() - vec.originAngle());
        return angle <= Math.PI ? angle : 2 * Math.PI - angle;
    }
}

export const euclidean = (x1: number, y1: number, x2: number, y2: number) => {
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5;
};
