import Node from '../Node';
import NodeMeasurement from '../NodeMeasurement';
import { mock } from 'jest-mock-extended';

describe('NodeMeasurement', () => {
	it('should cap maximum lag', () => {
		const node = mock<Node>();
		const nodeMeasurement = new NodeMeasurement(new Date(), node);
		nodeMeasurement.lag = 32768;
		expect(nodeMeasurement.lag).toBe(32767);
	});

	it('should cap minimum lag', () => {
		const node = mock<Node>();
		const nodeMeasurement = new NodeMeasurement(new Date(), node);
		nodeMeasurement.lag = -1;
		expect(nodeMeasurement.lag).toBe(0);
	});

	it('should return string representation', () => {
		const node = mock<Node>();
		const nodeMeasurement = new NodeMeasurement(new Date(), node);
		expect(nodeMeasurement.toString()).toBe(
			'NodeMeasurement (time: ' +
				new Date() +
				', isActive: false, isValidating: false, isFullValidator: false, isOverLoaded: false, index: 0)'
		);
	});

	it('should set and get lag', () => {
		const node = mock<Node>();
		const nodeMeasurement = new NodeMeasurement(new Date(), node);
		nodeMeasurement.lag = 10;
		expect(nodeMeasurement.lag).toBe(10);
	});
});
