import {address, toNano} from "@ton/core";
import {MainContract} from "../wrappers/MainContract";
import {compile, NetworkProvider} from "@ton/blueprint";
import {TokenStarterContract} from "../wrappers/TokenStarterContract";

export async function run(provider: NetworkProvider) {
    //TestNet
    const masterAddress = address("0QDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kQ_q");
    const receiverAddress = address("0QDxBjoe9xWLsv6vRIp9R9cySoSNSHwmn7ujNx5rMw_4kQ_q");
    const myContract = TokenStarterContract.createFromConfig(
        {
            masterAddress: masterAddress,
        },
        await compile("TokenStarterContract")
    );

    const openedContract = provider.open(myContract);
    console.log(`contractAddress:${openedContract.address}`);


    const jettonWalletCode = await compile("JettonWallet");
    const createTokenRequest = await openedContract.sendCreateToken(
        provider.sender(),
        receiverAddress,
        toNano("12.31"),
        toNano("0.05"),
        toNano("0.10"),
        jettonWalletCode,
        toNano("0.2")
    );


    // await provider.waitForDeploy(createTokenRequest, 100);
}
