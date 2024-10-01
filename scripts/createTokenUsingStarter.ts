import {address, toNano} from "@ton/core";
import {MainContract} from "../wrappers/MainContract";
import {compile, NetworkProvider} from "@ton/blueprint";
import {TokenStarterContract} from "../wrappers/TokenStarterContract";

export async function run(provider: NetworkProvider) {
    //TestNet
    const masterAddress = address("0QDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kQ_q");
    const myContract = TokenStarterContract.createFromConfig(
        {
            masterAddress: masterAddress,
        },
        await compile("MainContract")
    );

    const openedContract = provider.open(myContract);

    const jettonWalletCode = await compile("JettonWalletContract");
    const createTokenRequest = await openedContract.sendCreateToken(provider.sender(), toNano("0.01"), jettonWalletCode);


    // await provider.waitForDeploy(createTokenRequest, 100);
}