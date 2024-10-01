import {Cell, contractAddress, toNano} from "@ton/core";
import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import {TokenStarterContract} from "../wrappers/TokenStarterContract";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {JettonWallet} from "@ton/ton";

describe("token-starter.fc contract tests", () => {
    let blockchain: Blockchain;
    let masterAddress: SandboxContract<TreasuryContract>;
    let tokenStarterContract: SandboxContract<TokenStarterContract>;
    let codeCell: Cell

    beforeAll(async () => {
        codeCell = await compile("TokenStarterContract")
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        masterAddress = await blockchain.treasury("masterAddress");

        tokenStarterContract = blockchain.openContract(
            TokenStarterContract.createFromConfig({
                    masterAddress: masterAddress.address,
                },
                codeCell,
            )
        );
        await tokenStarterContract.sendDeploy(masterAddress.getSender(), toNano(10));

    });

    it("create token test", async () => {
        const senderWallet = await blockchain.treasury("sender");
        const jettonWalletCode = await compile("JettonWalletContract");

        console.log(`contractBalance:${(await tokenStarterContract.getBalance()).balance}`)

        const sentMessageResult = await tokenStarterContract.sendCreateToken(
            senderWallet.getSender(),
            toNano("0.05"),
            jettonWalletCode,
        );


        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: tokenStarterContract.address,
            success: true,
        });


        // expect(sentMessageResult.transactions).toHaveTransaction({
        //     from: senderWallet.address,
        //     to: tokenStarterContract.address,
        //     success: true,
        // });


    });


});