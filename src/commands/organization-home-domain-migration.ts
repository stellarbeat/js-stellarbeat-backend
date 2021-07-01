import Kernel from "../Kernel";
import {Connection} from "typeorm";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import {OrganizationIdStorageRepository} from "../entities/OrganizationIdStorage";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {

    let kernel = new Kernel();
    await kernel.initializeContainer();
    let organizationSnapShotRepository = kernel.container.get(OrganizationSnapShotRepository);
    let nodeSnapShotRepository = kernel.container.get(NodeSnapShotRepository);
    let organizationIdStorageRepository:OrganizationIdStorageRepository = kernel.container.get('OrganizationIdStorageRepository');
    let organizationSnapShots = await organizationSnapShotRepository.findActive();
    if (organizationSnapShots.length === 0)
        return;
    for(let organizationSnapShot of organizationSnapShots){
        console.log("Organization: " + organizationSnapShot.name);
        let nodeSnapShots = await nodeSnapShotRepository.findActiveByPublicKeyStorageId(organizationSnapShot.validators.map(validator => validator.id));
        if(nodeSnapShots.length === 0)
            break;
        let domain = nodeSnapShots[0].nodeDetails!.homeDomain;
        console.log("New domain property: " + domain);
        if(!domain)
            break;

        console.log("Saving");
        organizationSnapShot.organizationIdStorage.homeDomain = domain;
        await organizationIdStorageRepository.save(organizationSnapShot.organizationIdStorage);
    }

    await kernel.container.get(Connection).close();
}