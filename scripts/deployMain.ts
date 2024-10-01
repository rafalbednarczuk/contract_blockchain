import { address, toNano } from "@ton/core";
import { MainContract } from "../wrappers/MainContract";
import { compile, NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
    const ownerAddress = address("0QDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kQ_q");
    const myContract = MainContract.createFromConfig(
        {
            number: 0, //initial value of the counter
            address: ownerAddress,
            ownerAddress: ownerAddress,
        },
        await compile("MainContract")
    );

    const openedContract = provider.open(myContract);

    openedContract.sendDeploy(provider.sender(), toNano("0.01"));

    await provider.waitForDeploy(myContract.address, 100);
}
