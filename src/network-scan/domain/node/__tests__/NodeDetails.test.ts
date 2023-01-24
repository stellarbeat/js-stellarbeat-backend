import NodeDetails, { NodeDetailsProps } from '../NodeDetails';

describe('NodeDetailsStorage', () => {
	test('equal', async () => {
		const details = NodeDetails.create(getProps());
		const otherDetails = NodeDetails.create(getProps());
		expect(details.equals(otherDetails)).toBe(true);
	});

	test('not equal', async () => {
		const details = NodeDetails.create(getProps());
		let otherProps = getProps();
		otherProps.host = 'other';
		let otherDetails = NodeDetails.create(otherProps);
		expect(details.equals(otherDetails)).toBe(false);

		otherProps = getProps();
		otherProps.name = 'other';
		otherDetails = NodeDetails.create(otherProps);
		expect(details.equals(otherDetails)).toBe(false);

		otherProps = getProps();
		otherProps.historyUrl = 'other';
		otherDetails = NodeDetails.create(otherProps);
		expect(details.equals(otherDetails)).toBe(false);

		otherProps = getProps();
		otherProps.alias = 'other';
		otherDetails = NodeDetails.create(otherProps);
		expect(details.equals(otherDetails)).toBe(false);
	});
});

function getProps(): NodeDetailsProps {
	return {
		host: 'host',
		name: 'name',
		historyUrl: 'historyUrl',
		alias: 'alias'
	};
}
