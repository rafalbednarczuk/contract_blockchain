import {toNano} from "@ton/core";
import {Blockchain, SandboxContract} from "@ton/sandbox";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {jettonContentToCell} from "../wrappers/JettonMinterBC";
import {CoinLauncher} from "../wrappers/CoinLauncher";

describe("coin-launcher.fc contract tests", () => {
    let blockchain: Blockchain;
    let coinLauncherContract: SandboxContract<CoinLauncher>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        const minter_code = await compile('JettonMinterBC');
        const wallet_code = await compile('JettonWallet');

        coinLauncherContract = blockchain.openContract(CoinLauncher.createFromConfig({
                minter_code,
                wallet_code,
            },
            await compile('CoinLauncher')));

        const contractLauncherTreasury = await blockchain.treasury("contractLauncherTreasury");
        await coinLauncherContract.sendDeploy(contractLauncherTreasury.getSender(), toNano(10));


    });

    beforeEach(async () => {
//
    });

    it("create token test", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const contentUrl = "https://gist.githubusercontent.com/rafalbednarczuk/c53ca2a105ba3cbb34e75b308cd5b632/raw/26f6b0402ef34872feb0723b60e300bbfc4dd36d/gistfile1.txt";

        const content = jettonContentToCell({type: 1, uri: contentUrl});

        const results = await coinLauncherContract.sendLaunchJetton(
            senderWallet.getSender(),
            content
        );

        expect(results.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: coinLauncherContract.address,
            success: true,
        });

        // results.transactions.forEach((t) => {
        //     console.log(t);
        // });


    });


});