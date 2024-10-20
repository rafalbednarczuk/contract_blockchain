import {Address, Cell, toNano} from "@ton/core";
import {Blockchain, SandboxContract} from "@ton/sandbox";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {BondingCurveTest} from "../wrappers/BondingCurveTest";

describe("bonding-curve-test.fc contract tests", () => {
    let blockchain: Blockchain;
    let bondingCurveTestContract: SandboxContract<BondingCurveTest>;
    let bondingCurveTestCode: Cell;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        bondingCurveTestCode = await compile('BondingCurveTest');

        bondingCurveTestContract = blockchain.openContract(BondingCurveTest.createFromConfig(
                {},
                bondingCurveTestCode,
            )
        );

        const contractLauncherTreasury = await blockchain.treasury("contractLauncherTreasury");
        await bondingCurveTestContract.sendDeploy(contractLauncherTreasury.getSender(), toNano(10));


    });

    beforeEach(async () => {
//
    });

    it("create token test", async () => {
        // const senderWallet = await blockchain.treasury("sender");
        //
        // const contentUrl = "https://gist.githubusercontent.com/rafalbednarczuk/c53ca2a105ba3cbb34e75b308cd5b632/raw/26f6b0402ef34872feb0723b60e300bbfc4dd36d/gistfile1.txt";
        //
        // const content = jettonContentToCell({type: 1, uri: contentUrl});
        //
        // const results = await bondingCurveTestContract.sendLaunchJetton(
        //     senderWallet.getSender(),
        //     content,
        //     toNano(0.2)
        // );
        //
        //
        // const minterContract = blockchain.openContract(JettonMinterBC.createFromConfig({
        //         admin: senderWallet.address,
        //         wallet_code: wallet_code,
        //         content: content,
        //     },
        //     minter_code))
        //
        // minterContract.sendDeploy(senderWallet.getSender(), toNano(1));
        //
        // console.log(`walletAddress:${senderWallet.address}`);
        // console.log(`coinLauncherContractAddress:${bondingCurveTestContract.address}`);
        // console.log(`minterContractAddress:${minterContract.address}`);
        //
        //
        // expect(results.transactions).toHaveTransaction({
        //     from: bondingCurveTestContract.address,
        //     to: minterContract.address,
        //     success: true,
        // });


        // results.transactions.forEach((t) => {
        //     console.log(t);
        // });


    });


});