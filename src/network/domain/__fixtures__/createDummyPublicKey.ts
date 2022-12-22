import PublicKey from '../PublicKey';

export function createDummyPublicKey() {
	const publicKeyOrError = PublicKey.create(createDummyPublicKeyString());
	if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
	return publicKeyOrError.value;
}

export function createDummyPublicKeyString() {
	let publicKeyString = 'G';
	const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	for (let i = 0; i < 55; i++) {
		publicKeyString += allowedChars.charAt(
			Math.floor(Math.random() * allowedChars.length)
		);
	}

	return publicKeyString;
}
