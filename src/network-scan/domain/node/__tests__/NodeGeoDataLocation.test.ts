import NodeGeoDataLocation, {
	NodeGeoDataLocationProps
} from '../NodeGeoDataLocation';

describe('NodeGeoDataLocation', () => {
	it('should equal', function () {
		const props = createNodeGeoDataLocationProps();
		const nodeGeoDataLocation = NodeGeoDataLocation.create(props);
		const otherNodeGeoDataLocation = NodeGeoDataLocation.create(
			createNodeGeoDataLocationProps()
		);
		expect(nodeGeoDataLocation.equals(otherNodeGeoDataLocation)).toBe(true);
	});

	it('should not equal', function () {
		const props = createNodeGeoDataLocationProps();
		const nodeGeoDataLocation = NodeGeoDataLocation.create(props);
		let otherProps = createNodeGeoDataLocationProps();
		otherProps.countryName = 'other';
		let otherNodeGeoDataLocation = NodeGeoDataLocation.create(otherProps);
		expect(nodeGeoDataLocation.equals(otherNodeGeoDataLocation)).toBe(false);

		otherProps = createNodeGeoDataLocationProps();
		otherProps.countryCode = 'other';
		otherNodeGeoDataLocation = NodeGeoDataLocation.create(otherProps);
		expect(nodeGeoDataLocation.equals(otherNodeGeoDataLocation)).toBe(false);

		otherProps = createNodeGeoDataLocationProps();
		otherProps.latitude = 100;
		otherNodeGeoDataLocation = NodeGeoDataLocation.create(otherProps);
		expect(nodeGeoDataLocation.equals(otherNodeGeoDataLocation)).toBe(false);

		otherProps = createNodeGeoDataLocationProps();
		otherProps.longitude = 100;
		otherNodeGeoDataLocation = NodeGeoDataLocation.create(otherProps);
		expect(nodeGeoDataLocation.equals(otherNodeGeoDataLocation)).toBe(false);
	});
});

function createNodeGeoDataLocationProps(): NodeGeoDataLocationProps {
	return {
		countryCode: 'countryCode',
		countryName: 'countryName',
		latitude: 1,
		longitude: 2
	};
}
