import {CheckPointFrequency} from "./CheckPointFrequency";

export type CheckPoint = number;

export class CheckPointGenerator {
    constructor(private checkPointFrequency: CheckPointFrequency) {
    }

    getNextCheckPoint(ledger: number): CheckPoint {
        return Math.floor((ledger + this.checkPointFrequency.get()) / this.checkPointFrequency.get()) * this.checkPointFrequency.get() - 1;
    }
}
