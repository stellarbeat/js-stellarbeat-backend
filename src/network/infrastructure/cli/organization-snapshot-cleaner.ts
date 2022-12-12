import Kernel from '../../../shared/core/Kernel';
import { Connection } from 'typeorm';
import OrganizationSnapShotRepository from '../database/repositories/OrganizationSnapShotRepository';
import OrganizationSnapShot from '../database/entities/OrganizationSnapShot';
import { getConfigFromEnv } from '../../../shared/config/Config';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	if (process.argv.length <= 2) {
		console.log('Add organization storage ID');

		process.exit(-1);
	}
	const orgId = process.argv[2];

	const kernel = await Kernel.getInstance();
	const organizationSnapShotRepository = kernel.container.get(
		OrganizationSnapShotRepository
	);
	const snapshots = await organizationSnapShotRepository.find({
		where: {
			_organizationIdStorage: orgId
		},
		order: {
			startDate: 'ASC'
		}
	});

	if (snapshots.length === 0) return;

	let baseSnapshot = snapshots[0];
	const snapShotsToSave = [baseSnapshot];
	const snapShotsToDelete: OrganizationSnapShot[] = [];
	//let currentEndDate = new Date(snapshotObjects[0].endDate);
	//let currentStartDate = new Date(snapshotObjects[0].startDate);

	for (let i = 1; i < snapshots.length; i++) {
		const changedFields: string[] = [];

		Object.keys(snapshots[i]).forEach((key) => {
			if (
				key === 'startDate' ||
				key === 'endDate' ||
				key === 'id' ||
				key === '_organizationIdStorage'
			)
				return;
			if (key === '_validators') {
				if (
					JSON.stringify(
						snapshots[i].validators.map((validator) => validator.id).sort()
					) !==
					JSON.stringify(
						snapshots[i - 1].validators.map((validator) => validator.id).sort()
					)
				) {
					changedFields.push('validators');
				}
			} else {
				//@ts-ignore
				if (snapshots[i][key] !== snapshots[i - 1][key]) {
					changedFields.push(key);
				}
			}
		});
		console.log(changedFields);

		if (
			changedFields.length === 1 &&
			changedFields[0] === 'officialEmail' &&
			snapshots[i].startDate.toISOString() ===
				snapshots[i - 1].endDate.toISOString()
		) {
			//uninterrupted change
			console.log('UPDATE ENDDATE of base snapshot: ' + baseSnapshot.id);
			baseSnapshot.endDate = snapshots[i].endDate;
			console.log('DELETE: ' + snapshots[i].id);
			snapShotsToDelete.push(snapshots[i]);
		} else {
			console.log('valid change: ' + snapshots[i].id);
			baseSnapshot = snapshots[i];
			snapShotsToSave.push(baseSnapshot);
		}
	}

	await Promise.all(
		snapShotsToDelete.map(
			async (snapshot) => await organizationSnapShotRepository.remove(snapshot)
		)
	);
	await Promise.all(
		snapShotsToSave.map(
			async (snapshot) => await organizationSnapShotRepository.save(snapshot)
		)
	);

	await kernel.container.get(Connection).close();
}
