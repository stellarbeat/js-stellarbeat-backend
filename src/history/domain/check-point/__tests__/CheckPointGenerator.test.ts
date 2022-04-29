import {CheckPointGenerator} from '../CheckPointGenerator';
import {StandardCheckPointFrequency} from "../StandardCheckPointFrequency";

it('should generate checkpoints at the correct ledgers', function () {
	const generator = new CheckPointGenerator(new StandardCheckPointFrequency());
	expect(
		generator.getNextCheckPoint(32)
	).toEqual(63);
	expect(
		generator.getNextCheckPoint(63)).toEqual(63);
	expect(
		generator.getNextCheckPoint(64)
	).toEqual(127);
});