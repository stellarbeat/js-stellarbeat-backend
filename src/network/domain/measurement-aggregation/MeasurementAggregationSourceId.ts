import PublicKey from '../PublicKey';
import { NetworkId } from '../network/NetworkId';
import { OrganizationId } from '../OrganizationId';

export type MeasurementAggregationSourceId =
	| PublicKey
	| NetworkId
	| OrganizationId;
