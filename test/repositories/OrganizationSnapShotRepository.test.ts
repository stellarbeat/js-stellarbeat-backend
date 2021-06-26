import {Container} from "inversify";
import Kernel from "../../src/Kernel";
import {Connection} from "typeorm";
import OrganizationSnapShotRepository from "../../src/repositories/OrganizationSnapShotRepository";
import {Organization} from "@stellarbeat/js-stellar-domain";
import OrganizationSnapShotFactory from "../../src/factory/OrganizationSnapShotFactory";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";

describe('test queries', () => {
    let container: Container;
    let kernel = new Kernel();
    let organizationSnapShotRepository: OrganizationSnapShotRepository;
    jest.setTimeout(60000); //slow integration tests

    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        organizationSnapShotRepository = container.get(OrganizationSnapShotRepository);
    })

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('findLatest', async () => {
        let organization = new Organization('1', 'myOrg');
        organization.description = 'hi there';
        let organizationSnapShotFactory = container.get(OrganizationSnapShotFactory);
        let organizationIdStorage = new OrganizationIdStorage(organization.id, new Date());
        let initialDate = new Date();
        let snapshot1 = organizationSnapShotFactory.create(organizationIdStorage, organization, initialDate, []);
        let otherOrganization = new Organization('2', 'other');
        let irrelevantSnapshot = organizationSnapShotFactory.create(
            new OrganizationIdStorage(otherOrganization.id, new Date()),
            otherOrganization,
            initialDate, []);
        await organizationSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
        snapshot1.id = 1; //typeorm bug: doesn't update id...
        organization.description = 'I changed';
        let updatedDate = new Date();
        let snapShot2 = organizationSnapShotFactory.createUpdatedSnapShot(snapshot1, organization, updatedDate, []);
        await organizationSnapShotRepository.save([snapshot1, snapShot2]);
        let snapShots = await organizationSnapShotRepository.findLatestByOrganization(organizationIdStorage);
        expect(snapShots.length).toEqual(2);
        expect(snapShots[0]!.description).toEqual('I changed');
        expect(snapShots[1]!.description).toEqual('hi there');

        snapShots = await organizationSnapShotRepository.findLatestByOrganization(organizationIdStorage, initialDate);
        expect(snapShots.length).toEqual(1);
        expect(snapShots[0]!.description).toEqual('hi there');

        snapShots = await organizationSnapShotRepository.findLatest(initialDate);
        expect(snapShots.length).toEqual(2);
    });
})
