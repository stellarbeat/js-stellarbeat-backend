import Kernel from "../Kernel";
import {Connection} from "typeorm";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {

    let kernel = new Kernel();
    await kernel.initializeContainer();
    let organizationSnapShotRepository = kernel.container.get(OrganizationSnapShotRepository);
    let nodeSnapShotRepository = kernel.container.get(NodeSnapShotRepository);
    let organizationSnapShots = await organizationSnapShotRepository.findActive();
    if (organizationSnapShots.length === 0)
        return;
    for(let organizationSnapShot of organizationSnapShots){
        let nodeSnapShots = await nodeSnapShotRepository.findActiveByPublicKeyStorageId(organizationSnapShot.validators.map(validator => validator.id));
        if(nodeSnapShots.length === 0)
            break;
        let domain = nodeSnapShots[0].nodeDetails!.homeDomain;
        if(!domain)
            break;

        //organizationSnapShot.organizationIdStorage.homeDomain = domain;
        await organizationSnapShotRepository.save(organizationSnapShot);
    }

    await kernel.container.get(Connection).close();
}