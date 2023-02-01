import { ValueObject } from '../../../core/domain/ValueObject';
import PublicKey from '../node/PublicKey';
import { Column } from 'typeorm';
import { plainToInstance } from 'class-transformer';

export class OrganizationValidators extends ValueObject {
	@Column({
		type: 'json',
		nullable: true, //after migration set to true
		name: 'validators',
		transformer: {
			to: (value) => value,
			from: (publicKeys) => {
				//@ts-ignore
				return publicKeys.map((publicKey) =>
					//@ts-ignore
					plainToInstance(PublicKey, publicKey)
				);
			}
		}
	})
	value: PublicKey[];

	constructor(validators: PublicKey[]) {
		super();
		this.value = validators;
	}

	equals(validators: OrganizationValidators): boolean {
		if (this.value.length !== validators.value.length) return false;
		return this.value.every((publicKey) =>
			validators.value
				.map((publicKey) => publicKey.value)
				.includes(publicKey.value)
		);
	}

	contains(publicKey: PublicKey): boolean {
		return this.value.some((validator) => validator.equals(publicKey));
	}
}
