import "reflect-metadata"; //todo: create container without loading the database
import OrganizationSnapShotter from "../../src/services/SnapShotting/OrganizationSnapShotter";
import OrganizationSnapShotRepository from "../../src/repositories/OrganizationSnapShotRepository";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShot from "../../src/entities/OrganizationSnapShot";
let organizationSnapShotRepository = new OrganizationSnapShotRepository();

describe("findLatestSnapShots", () => {
    test("unknownIdShouldReturnEmptyResult", async () => {
        let organizationIdStorageRepository = {findOne: () => undefined};
        let organizationSnapShotter = new OrganizationSnapShotter({} as any, organizationSnapShotRepository as any, organizationIdStorageRepository as any, {} as any);
        let snapShots = await organizationSnapShotter.findLatestSnapShotsByOrganization('a', new Date());
        expect(snapShots.length).toEqual(0);
    });

    test("itShouldReturnSnapShots", async () => {
        let organizationIdStorage = new OrganizationIdStorage('a', new Date());
        let organizationIdStorageRepository = {findOne: () => organizationIdStorage};
        let organizationSnapShotter = new OrganizationSnapShotter({} as any, organizationSnapShotRepository, organizationIdStorageRepository as any, {} as any);
        let date = new Date();
        let snapShot = new OrganizationSnapShot(organizationIdStorage, date);
        jest.spyOn(organizationSnapShotRepository, 'findLatestByOrganization').mockResolvedValue([snapShot]);
        let snapShots = await organizationSnapShotter.findLatestSnapShotsByOrganization('a', new Date());
        expect(snapShots.length).toEqual(1);
    });
});