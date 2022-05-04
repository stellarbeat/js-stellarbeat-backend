import { CheckPointFrequency } from './CheckPointFrequency';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/di-types';

export type CheckPoint = number;

@injectable()
export class CheckPointGenerator {
	constructor(
		@inject(TYPES.CheckPointFrequency)
		private checkPointFrequency: CheckPointFrequency
	) {}

	getCheckPoints(fromLedger: number, toLedger: number): CheckPoint[] {
		const checkPoints: CheckPoint[] = [];
		let checkPoint = this.getClosestCheckPoint(fromLedger);

		while (checkPoint <= toLedger) {
			checkPoints.push(checkPoint);
			checkPoint += 64;
		}

		return checkPoints;
	}

	private getClosestCheckPoint(ledger: number): CheckPoint {
		return (
			Math.floor(
				(ledger + this.checkPointFrequency.get()) /
					this.checkPointFrequency.get()
			) *
				this.checkPointFrequency.get() -
			1
		);
	}
}
