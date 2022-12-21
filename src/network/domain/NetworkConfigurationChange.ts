import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';

@ChildEntity()
export class NetworkConfigurationChange extends NetworkChange {}
