import { createConnection } from 'typeorm';
import NodeMeasurementRollup from '../entities/NodeMeasurementRollup';
// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const connection = await createConnection();
	const rollup = new NodeMeasurementRollup(
		'node_measurement_day',
		'node_measurement_day'
	);
	await connection.manager.save(rollup);
	await connection.close();
}
