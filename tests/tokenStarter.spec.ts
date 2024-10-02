import {Address, Cell, contractAddress, toNano} from "@ton/core";
import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import {TokenStarterContract} from "../wrappers/TokenStarterContract";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {JettonWallet} from "@ton/ton";
import {JettonWalletContract} from "../wrappers/JettonWalletContract";

describe("token-starter.fc contract tests", () => {
    let blockchain: Blockchain;
    let masterAddress: SandboxContract<TreasuryContract>;
    let tokenStarterContract: SandboxContract<TokenStarterContract>;
    let codeCell: Cell
    let jettonContractGetter: any;
    let jettonWalletCode: Cell

    beforeAll(async () => {
        codeCell = await compile("TokenStarterContract")
        blockchain = await Blockchain.create();
        masterAddress = await blockchain.treasury("masterAddress");
        jettonWalletCode = await compile("JettonWalletContract");

        tokenStarterContract = blockchain.openContract(
            TokenStarterContract.createFromConfig({
                    masterAddress: masterAddress.address,
                },
                codeCell,
            )
        );
        await tokenStarterContract.sendDeploy(masterAddress.getSender(), toNano(10));

        jettonContractGetter = async (address: Address) => blockchain.openContract(
            JettonWalletContract.createFromAddress(
                await tokenStarterContract.getWalletAddress(address, jettonWalletCode)
            )
        );
    });

    beforeEach(async () => {
//
    });

    it("create token test", async () => {
        const senderWallet = await blockchain.treasury("minterAndReceiver");
        const senderJettonWallet = await jettonContractGetter(senderWallet.address);

        // console.log(`masterContractAddress:${masterAddress.address}`)
        // console.log(`starterContractAddress:${tokenStarterContract.address}`)
        // console.log(`senderWalletAddress:${senderWallet.address}`)
        // console.log(`senderJettonWalletAddress:${senderJettonWallet.address}`)

        const sentMessageResult = await tokenStarterContract.sendCreateToken(
            masterAddress.getSender(),
            senderWallet.address,
            toNano("12.31"),
            toNano("0.05"),
            toNano("0.10"),
            jettonWalletCode,
            toNano("0.2")
        );


        // expect(sentMessageResult.transactions).toHaveTransaction({
        //     from: masterAddress.address,
        //     to: tokenStarterContract.address,
        //     success: true,
        // });

        // const jettonContract = await jettonContractGetter(senderWallet.address);
        //
        // expect(sentMessageResult.transactions).toHaveTransaction({
        //     from: tokenStarterContract.address,
        //     to: jettonContract.address,
        //     success: true,
        // });


    });


});