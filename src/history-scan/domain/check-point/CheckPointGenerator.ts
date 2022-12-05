import { CheckPointFrequency } from './CheckPointFrequency';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';

export type CheckPoint = number;

@injectable()
export class CheckPointGenerator {
	constructor(
		@inject(TYPES.CheckPointFrequency)
		public checkPointFrequency: CheckPointFrequency
	) {}

	*generate(
		fromLedger: number,
		toLedger: number
	): IterableIterator<CheckPoint> {
		let checkPoint = this.getClosestHigherCheckPoint(fromLedger);
		while (checkPoint <= toLedger) {
			yield checkPoint;
			checkPoint += 64;
		}
	}

	getClosestHigherCheckPoint(ledger: number): CheckPoint {
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
