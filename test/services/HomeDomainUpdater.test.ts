import {HomeDomainUpdater} from "../../src/services/HomeDomainUpdater";
import {HorizonService} from "../../src";
import {Node} from "@stellarbeat/js-stellar-domain";
import {ok} from "neverthrow";

it('should update homeDomains once in a cache period', async function () {
    process.env.HORIZON_URL = "lol";
    let horizonService = new HorizonService();
    jest.spyOn(horizonService, 'fetchAccount').mockResolvedValue(ok({home_domain: "myDomain.be"}));

    let domainUpdater = new HomeDomainUpdater(horizonService);
    let node = new Node("A");
    node.active = true;
    await domainUpdater.updateHomeDomains([node]);
    expect(node.homeDomain).toEqual("myDomain.be");
    jest.spyOn(horizonService, 'fetchAccount').mockResolvedValue(ok({home_domain: "myOtherDomain.be"}));
    await domainUpdater.updateHomeDomains([node]);
    expect(node.homeDomain).toEqual("myDomain.be");
});