import {Cell, toNano} from "@ton/core";
import {Blockchain, SandboxContract, TreasuryContract} from "@ton/sandbox";
import {MainContract} from "../wrappers/MainContract";
import "@ton/test-utils";
import {compile} from "@ton/blueprint";

describe("main.fc contract tests", () => {
    let blockchain: Blockchain;
    let initWallet: SandboxContract<TreasuryContract>;
    let ownerWallet: SandboxContract<TreasuryContract>;
    let myContract: SandboxContract<MainContract>;
    let codeCell: Cell

    beforeAll(async () => {
        codeCell = await compile("MainContract")
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        initWallet = await blockchain.treasury("initWallet");
        ownerWallet = await blockchain.treasury("ownerWallet", {balance: toNano(0.1)});

        myContract = blockchain.openContract(
            MainContract.createFromConfig({
                    number: 0,
                    address: initWallet.address,
                    ownerAddress: ownerWallet.address,
                },
                codeCell,
            )
        );


    });

    it("should increment the stored value and save the address of last message sender", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const sentMessageResult = await myContract.sendIncrement(
            senderWallet.getSender(),
            toNano("0.05"),
            5,
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: true,
        });

        const data = await myContract.getData();

        expect(data.recent_sender.toString()).toBe(senderWallet.address.toString());
        expect(data.number).toEqual(5);
    });

    it("successfully deposits funds", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const sentMessageResult = await myContract.sendDeposit(
            senderWallet.getSender(),
            toNano(1),
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: true,
        });

        const balanceResponse = await myContract.getBalance();

        expect(balanceResponse.balance).toBeGreaterThan(toNano(0.99));

    });

    it("no op code error check", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const sentMessageResult = await myContract.sendNoOpCodeDeposit(
            senderWallet.getSender(),
            toNano(1),
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: false,
        });

        const balanceResponse = await myContract.getBalance();

        expect(balanceResponse.balance).toEqual(0);

    });

    it("successfully withdraw funds to owner", async () => {
        const senderWallet = await blockchain.treasury("sender", {});

        const sentDepositMessageResult = await myContract.sendDeposit(
            senderWallet.getSender(),
            toNano(5),
        );

        const sentWithdrawalMessageResult = await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(),
            toNano(0.01),
            toNano(2.5),
        );

        expect(sentDepositMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: true,

        });

        expect(sentWithdrawalMessageResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: myContract.address,
            success: true,

        });

        expect(sentWithdrawalMessageResult.transactions).toHaveTransaction({
            from: myContract.address,
            to: ownerWallet.address,
            success: true,

        });

        const contractBalanceResponse = await myContract.getBalance();

        expect(contractBalanceResponse.balance).toBeLessThan(toNano(3.6));
        expect(contractBalanceResponse.balance).toBeGreaterThan(toNano(2.4));

        const ownerWalletBalance = await ownerWallet.getBalance();
        expect(ownerWalletBalance).toBeGreaterThan(toNano(2.5));
        expect(ownerWalletBalance).toBeLessThan(toNano(2.6));


    });

    it("withdrawal funds not by owner error check", async () => {
        const senderWallet = await blockchain.treasury("sender", {});
        const sentWithdrawalMessageResult = await myContract.sendWithdrawalRequest(
            senderWallet.getSender(),
            toNano(0.01),
            toNano(2.5),
        );

        expect(sentWithdrawalMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: false,
            exitCode: 103,
        });


    });

    it("withdrawal funds, not sufficient money on contract error check", async () => {
        const sentWithdrawalMessageResult = await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(),
            toNano(0.01),
            toNano(10),
        );

        expect(sentWithdrawalMessageResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: myContract.address,
            success: false,
            exitCode: 104,
        });


    });
});