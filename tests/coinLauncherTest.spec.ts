import {Address, Cell, toNano} from "@ton/core";
import {Blockchain, SandboxContract} from "@ton/sandbox";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";
import {jettonContentToCell, JettonMinterBC} from "../wrappers/JettonMinterBC";
import {CoinLauncher} from "../wrappers/CoinLauncher";

describe("coin-launcher.fc contract tests", () => {
    let blockchain: Blockchain;
    let coinLauncherContract: SandboxContract<CoinLauncher>;
    let minter_code: Cell;
    let wallet_code: Cell;
    let coin_launcher_code: Cell;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        minter_code = await compile('JettonMinterBC');
        wallet_code = await compile('JettonWallet');
        coin_launcher_code = await compile('CoinLauncher');

        coinLauncherContract = blockchain.openContract(CoinLauncher.createFromConfig({
                minter_code,
                wallet_code,
            },
            coin_launcher_code));

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
            content,
            toNano(0.2)
        );


        const minterContract = blockchain.openContract(JettonMinterBC.createFromConfig({
                admin: senderWallet.address,
                wallet_code: wallet_code,
                content: content,
            },
            minter_code))

        minterContract.sendDeploy(senderWallet.getSender(), toNano(1));

        console.log(`walletAddress:${senderWallet.address}`);
        console.log(`coinLauncherContractAddress:${coinLauncherContract.address}`);
        console.log(`minterContractAddress:${minterContract.address}`);


        expect(results.transactions).toHaveTransaction({
            from: coinLauncherContract.address,
            to: minterContract.address,
            success: true,
        });


        // results.transactions.forEach((t) => {
        //     console.log(t);
        // });


    });


});