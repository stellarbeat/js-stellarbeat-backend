import { CheckPointFrequency } from './CheckPointFrequency';
import { injectable } from 'inversify';
import 'reflect-metadata';

@injectable()
export class StandardCheckPointFrequency implements CheckPointFrequency {
	//in the future the frequency could change
	get(): number {
		return 64; //if needed this could come from configuration
	}
}
