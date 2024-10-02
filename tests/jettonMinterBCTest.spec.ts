import {Address, beginCell, Cell, contractAddress, toNano} from "@ton/core";
import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {JettonMinterBC} from "../wrappers/JettonMinterBC";
import {JettonWallet} from "../wrappers/JettonWallet";

describe("jetton-minter-bc.fc contract tests", () => {
    let blockchain: Blockchain;
    let masterAddress: SandboxContract<TreasuryContract>;
    let minterBCContract: SandboxContract<JettonMinterBC>;
    let codeCell: Cell
    let jettonContractGetter: any;
    let jettonWalletCode: Cell

    beforeAll(async () => {
        codeCell = await compile("JettonMinterBC")
        blockchain = await Blockchain.create();
        masterAddress = await blockchain.treasury("masterAddress");
        jettonWalletCode = await compile("JettonWallet");

        minterBCContract = blockchain.openContract(
            JettonMinterBC.createFromConfig({
                    admin: masterAddress.address,
                    content: beginCell().endCell(),
                    wallet_code: jettonWalletCode,
                },
                codeCell,
            )
        );
        await minterBCContract.sendDeploy(masterAddress.getSender(), toNano(10));

        jettonContractGetter = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await minterBCContract.getWalletAddress(address)
            )
        );
    });

    beforeEach(async () => {
//
    });

    it("create token test", async () => {
        const senderWallet = await blockchain.treasury("minterAndReceiver");
        const senderJettonWallet = await jettonContractGetter(senderWallet.address);

        console.log(`masterContractAddress:${masterAddress.address}`)
        console.log(`minterBCContract:${minterBCContract.address}`)
        console.log(`senderWalletAddress:${senderWallet.address}`)
        console.log(`senderJettonWalletAddress:${senderJettonWallet.address}`)

        const sentMessageResult = await minterBCContract.sendBuy(
            senderWallet.getSender(),
            toNano("0.17"),
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: minterBCContract.address,
            success: true,
        });

        // const jettonContract = await jettonContractGetter(senderWallet.address);
        //
        // expect(sentMessageResult.transactions).toHaveTransaction({
        //     from: minterBCContract.address,
        //     to: jettonContract.address,
        //     success: true,
        // });


    });


});