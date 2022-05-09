import { CheckPointGenerator } from '../CheckPointGenerator';
import { StandardCheckPointFrequency } from '../StandardCheckPointFrequency';

it('should generate correct checkpoints in the supplied range', function () {
	const generatorClass = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const generator = generatorClass.generate(0, 128);
	expect(generator.next().value).toEqual(63);
	expect(generator.next().value).toEqual(127);
	expect(generator.next().done).toEqual(true);
});
