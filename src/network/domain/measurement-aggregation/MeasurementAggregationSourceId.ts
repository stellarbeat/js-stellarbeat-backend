import PublicKey from '../PublicKey';
import { NetworkId } from '../NetworkId';
import { OrganizationId } from '../OrganizationId';

export type MeasurementAggregationSourceId =
	| PublicKey
	| NetworkId
	| OrganizationId;
