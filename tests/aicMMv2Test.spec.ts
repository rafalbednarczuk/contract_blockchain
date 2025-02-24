import { fromNano, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { flattenTransaction } from '@ton/test-utils';
import { AicMmV2 } from '../wrappers/AicMmV2';
import assert from 'node:assert';


describe('aic-mm-v2.fc contract tests', () => {
    let blockchain: Blockchain;
    let adminAddress: SandboxContract<TreasuryContract>;
    let aicMmV2Contract: SandboxContract<AicMmV2>;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
    });

    beforeEach(async () => {
        adminAddress = await blockchain.treasury(Math.random().toString());
        const aicMmV2Code = await compile('AicMmV2');

        aicMmV2Contract = blockchain.openContract(
            AicMmV2.createFromConfig({},
                aicMmV2Code
            )
        );
        await aicMmV2Contract.sendDeploy(adminAddress.getSender(), toNano(0.1));
    });

    it('should successfully buy tokens', async () => {
        // Create a buyer wallet
        const buyer = await blockchain.treasury(`buyer`);

        // Send buy transaction with 1 TON
        const result = await aicMmV2Contract.sendBuy(
            buyer.getSender(),
            toNano('1.01'), // value to send
            0n,            // query_id
            toNano(1988),
            toNano('1.01')  // 1.01 TON, 1.0 should cover 1988 coins, 1.01 is 1% slippage
        );


        // result.transactions.forEach((tx) => {
        //     console.log(flattenTransaction(tx));
        // });


        // Verify transaction success
        result.transactions.forEach((tx) => {
            const flatten = flattenTransaction(tx);
            assert(flatten.success);
        });

        // Calculate and log fees
        const feesCombined = result.transactions
            .map(t => BigInt(t.totalFees.coins))
            .reduce((a, b) => a + b, 0n);

        console.log(
            `total:${Number(feesCombined) / 10 ** 9}\n${
                result.transactions
                    .map(tx => `fees:${Number(tx.totalFees.coins) / 10 ** 9}`)
                    .join('\n')
            }`
        );

    });

    it('should successfully sell tokens', async () => {
        // Create a user wallet
        const user = await blockchain.treasury(`user`, { balance: toNano(10) });

        const userInitialBalance = await user.getBalance();
        const aicMmV2InitialBalance = await aicMmV2Contract.getTonBalance();


        // Send buy transaction with 1 TON
        const buyResult = await aicMmV2Contract.sendBuy(
            user.getSender(),
            toNano('1.01'), // value to send
            0n,            // query_id
            toNano(1988),
            toNano('1.01')  // 1.01 TON, 1.0 should cover 1988 coins, 1.01 is 1% slippage
        );

        const sellResult = await aicMmV2Contract.sendSell(
            user.getSender(),
            toNano('0.1'), // value to send
            0n,            // query_id
            toNano(1987),
            toNano('0.99')  // 0.99 TON, 1.0 should cover 1988 coins, 0.99 is 1% slippage
        );


        // sellResult.transactions.forEach((tx) => {
        //     console.log(flattenTransaction(tx));
        // });


        // Verify transaction success
        sellResult.transactions.forEach((tx) => {
            const flatten = flattenTransaction(tx);
            assert(flatten.success);
        });

        // Calculate and log fees
        const feesCombined = sellResult.transactions
            .map(t => BigInt(t.totalFees.coins))
            .reduce((a, b) => a + b, 0n);

        const userBalanceAfterBuyAndSale = await user.getBalance();
        const aicMmV2BalanceAfterBuyAndSale = await aicMmV2Contract.getTonBalance();

        console.log(`UserBalanceChange:${fromNano(userInitialBalance - userBalanceAfterBuyAndSale)}
        ContractBalanceChange:${fromNano(aicMmV2BalanceAfterBuyAndSale - aicMmV2InitialBalance)}
        Fees:${fromNano((userInitialBalance - userBalanceAfterBuyAndSale) - (aicMmV2BalanceAfterBuyAndSale - aicMmV2InitialBalance))}
        `);


        console.log(
            `total:${Number(feesCombined) / 10 ** 9}\n${
                sellResult.transactions
                    .map(tx => `fees:${Number(tx.totalFees.coins) / 10 ** 9}`)
                    .join('\n')
            }`
        );


    });

    it('should successfully buy tokens x1000', async () => {
        // Create a buyer wallet
        for (let i = 0; i < 1000; i++) {
            const buyer = await blockchain.treasury(`buyer${i + 1}`);

            // Send buy transaction with 1 TON
            const result = await aicMmV2Contract.sendBuy(
                buyer.getSender(),
                toNano('1.01') + toNano(i), // value to send
                0n,            // query_id
                toNano(1988),
                toNano('1.01') + toNano(i) // 1.01 TON, 1.0 should cover 1988 coins, 1.01 is 1% slippage
            );


            // result.transactions.forEach((tx) => {
            //     console.log(flattenTransaction(tx));
            // });


            // Verify transaction success
            result.transactions.forEach((tx) => {
                const flatten = flattenTransaction(tx);
                assert(flatten.success);
            });

            // Calculate and log fees
            const feesCombined = result.transactions
                .map(t => BigInt(t.totalFees.coins))
                .reduce((a, b) => a + b, 0n);

            console.log(
                `Transaction nr:${i}\ntotal:${Number(feesCombined) / 10 ** 9}\n${
                    result.transactions
                        .map(tx => `fees:${Number(tx.totalFees.coins) / 10 ** 9}`)
                        .join('\n')
                }`
            );
        }

    });


});