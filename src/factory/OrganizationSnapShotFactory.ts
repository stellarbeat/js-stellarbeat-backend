import {Organization} from "@stellarbeat/js-stellar-domain";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import {injectable} from "inversify";

@injectable()
export default class OrganizationSnapShotFactory {
    create(organizationId:OrganizationIdStorage, organization: Organization, time: Date, validators: NodePublicKeyStorage[]){
        return this.fromOrganization(organizationId, organization, time, validators);
    }

    createUpdatedSnapShot(snapShot: OrganizationSnapShot, organization: Organization, time: Date, validators: NodePublicKeyStorage[]){
        return this.fromOrganization(snapShot.organizationIdStorage, organization, time, validators);
    }

    protected fromOrganization(organizationId:OrganizationIdStorage, organization: Organization, time: Date, validators: NodePublicKeyStorage[]) {
        let organizationSnapShot = new OrganizationSnapShot(organizationId, time);
        organizationSnapShot.name = organization.name;
        organization.dba ? organizationSnapShot.dba = organization.dba : organizationSnapShot.dba = null;
        organization.url ? organizationSnapShot.url = organization.url : organizationSnapShot.url = null;
        organization.officialEmail ? organizationSnapShot.officialEmail = organization.officialEmail : organizationSnapShot.officialEmail = null;
        organization.phoneNumber ? organizationSnapShot.phoneNumber = organization.phoneNumber : organizationSnapShot.phoneNumber = null;
        organization.physicalAddress ? organizationSnapShot.physicalAddress = organization.physicalAddress : organizationSnapShot.physicalAddress = null;
        organization.twitter ? organizationSnapShot.twitter = organization.twitter : organizationSnapShot.twitter = null;
        organization.github ? organizationSnapShot.github = organization.github : organizationSnapShot.github = null;
        organization.description ? organizationSnapShot.description = organization.description : organizationSnapShot.description = null;
        organization.keybase ? organizationSnapShot.keybase = organization.keybase : organizationSnapShot.keybase = null;
        organization.horizonUrl ? organizationSnapShot.horizonUrl = organization.horizonUrl : organizationSnapShot.horizonUrl = null;
        organizationSnapShot.validators = validators;

        return organizationSnapShot;
    }
}