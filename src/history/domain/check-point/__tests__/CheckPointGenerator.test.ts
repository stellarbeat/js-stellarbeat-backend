import {CheckPointGenerator} from '../CheckPointGenerator';
import {StandardCheckPointFrequency} from "../StandardCheckPointFrequency";

it('should generate correct checkpoints in the supplied range', function () {
	const generator = new CheckPointGenerator(new StandardCheckPointFrequency());
	expect(generator.getCheckPoints(0, 128)).toEqual([63,127]);
});