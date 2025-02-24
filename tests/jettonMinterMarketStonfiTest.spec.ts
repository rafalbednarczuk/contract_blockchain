import { Address, beginCell, Cell, contractAddress, fromNano, toNano } from '@ton/core';
import { Blockchain, BlockchainTransaction, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinterMarketStonfi } from '../wrappers/JettonMinterMarketStonfi';
import { JettonWallet } from '../wrappers/JettonWallet';
import { flattenTransaction } from '@ton/test-utils';
import { Op, OpNames } from '../wrappers/JettonConstants';
import { verify } from 'node:crypto';


describe('jetton-minter-market-stonfi.fc contract tests', () => {
    let blockchain: Blockchain;
    let masterAddress: SandboxContract<TreasuryContract>;
    let minterContract: SandboxContract<JettonMinterMarketStonfi>;
    let trader: SandboxContract<TreasuryContract>;
    let traderJettonWallet: SandboxContract<JettonWallet>;
    let codeCell: Cell;
    let jettonContractGetter: (address: Address) => Promise<SandboxContract<JettonWallet>>;
    let jettonWalletCode: Cell;
    const initialMasterBalance = toNano(10);
    const routerAddress = Address.parse('EQByADL5Ra2dldrMSBctgfSm2X2W1P61NVW2RYDb8eJNJGx6');
    const routerPTonWalletAddress = Address.parse('EQBzIe_KYGrezmSS3ua9buM0P8vzEnMFDrsv1prFnwP43hFk');

    // Helper function to get friendly name for an address
    const
        getAddressName = (address: Address | undefined): string => {
            if (!address) return 'undefined';

            if (address.equals(masterAddress.address)) return 'admin';
            if (address.equals(minterContract.address)) return 'minter';
            if (address.equals(trader.address)) return 'trader';
            if (address.equals(traderJettonWallet.address)) return 'traderJettonWallet';

            return address.toString();
        };

    const getOpName = (op: number | undefined): string => {
        if (op === undefined) return 'undefined';
        return OpNames[op] || `0x${op.toString(16)}`;
    };

    beforeAll(async () => {
        codeCell = await compile('JettonMinterMarketStonfi');
        blockchain = await Blockchain.create();
        jettonWalletCode = await compile('JettonWallet');

        jettonContractGetter = async (address: Address) => blockchain.openContract<JettonWallet>(
            JettonWallet.createFromAddress(
                await minterContract.getWalletAddress(address)
            )
        );
    });

    beforeEach(async () => {
        masterAddress = await blockchain.treasury(Math.random().toString());

        /*
        https://api.ston.fi/swagger-ui/#/Dex/get_router_list
            {
      "address": "EQByADL5Ra2dldrMSBctgfSm2X2W1P61NVW2RYDb8eJNJGx6",
      "major_version": 2,
      "minor_version": 2,
      "pton_master_address": "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S",
      "pton_wallet_address": "EQBzIe_KYGrezmSS3ua9buM0P8vzEnMFDrsv1prFnwP43hFk",
      "pton_version": "2.1",
      "router_type": "ConstantProduct",
      "pool_creation_enabled": true
    },
         */
        minterContract = blockchain.openContract(
            JettonMinterMarketStonfi.createFromConfig({
                    admin: masterAddress.address,
                    content: beginCell().endCell(),
                    wallet_code: jettonWalletCode,
                    router_address: routerAddress,
                    router_pton_wallet_address: routerPTonWalletAddress
                },
                codeCell
            )
        );
        await minterContract.sendDeploy(masterAddress.getSender(), initialMasterBalance);

    });

    it('should successfully buy tokens', async () => {
        // Create a buyer wallet
        const buyer = await blockchain.treasury('buyer');

        // Initial balance check
        const buyerJettonWallet = await jettonContractGetter(buyer.address);
        const initialBalance = await buyerJettonWallet.getJettonBalance();
        expect(initialBalance).toBe(0n);

        // Send buy transaction with 1 TON
        const result = await minterContract.sendBuy(
            buyer.getSender(),
            toNano('1'), // value to send
            0n          // query_id
        );

        // Verify the transaction was successful
        expect(result.transactions).toHaveTransaction({
            from: buyer.address,
            to: minterContract.address,
            success: true
        });

        // Find the transaction that sends TON to the contract
        const buyTx = result.transactions.find(tx =>
            tx.inMessage?.info.type === 'internal' &&
            tx.inMessage.info.dest?.equals(minterContract.address) &&
            tx.inMessage.info.value.coins === toNano('1')
        );
        expect(buyTx).toBeTruthy();

        // Get the new balance and verify tokens were received
        const newBalance = await buyerJettonWallet.getJettonBalance();
        expect(newBalance).toBeGreaterThan(0n);

        // Verify total supply has increased
        const totalSupply = await minterContract.getTotalSupply();
        expect(totalSupply).toBeGreaterThan(0n);
    });

    it('should perform multiple buy/sell cycles and accumulate fees', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);


        for (let i = 0; i < 100; i++) {
            const buyResults = await minterContract.sendBuy(
                trader.getSender(),
                toNano('1'),
                BigInt(i)
            );

            buyResults.transactions.forEach((tx) => {
                const flatTx = flattenTransaction(tx);
                if (flatTx.op != Op.transfer_notification) {
                    expect(flatTx.success).toEqual(true);
                }
            });

            const balance = await traderJettonWallet.getJettonBalance();
            expect(balance).toBeGreaterThan(0n);

            const sellResults = await traderJettonWallet.sendSellJettons(
                trader.getSender(),
                toNano('0.1'),
                balance,
                minterContract.address
            );

            sellResults.transactions.forEach((tx) => {
                const flatTx = flattenTransaction(tx);
                expect(flatTx.success).toEqual(true);
                // console.log({
                //     lt: flatTx.lt,
                //     from: getAddressName(flatTx.from),
                //     to: getAddressName(flatTx.to),
                //     value: flatTx.value?.toString(),
                //     op: getOpName(flatTx.op),
                //     success: flatTx.success,
                //     exitCode: flatTx.exitCode,
                //     fees: flatTx.totalFees?.toString(),
                //     timestamp: new Date(flatTx.now * 1000).toISOString()
                // });
            });

            const balanceAfterSell = await traderJettonWallet.getJettonBalance();
            expect(balanceAfterSell).toBe(0n);
        }

        // Get balances before withdrawal
        const balanceBeforeWithdraw = await masterAddress.getBalance();

        // Withdraw fees to master address and capture result
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        // Get final balances
        const balanceAfterWithdraw = await masterAddress.getBalance();
        const withdrawnFees = balanceAfterWithdraw - balanceBeforeWithdraw - initialMasterBalance;
        const totalSupply = await minterContract.getTotalSupply();
        const minterBalance = await minterContract.getTonBalance();
        console.log(`withdrawFees:${fromNano(withdrawnFees)} TON`);
        console.log(`balanceAfterWithdraw:${fromNano(balanceAfterWithdraw)} TON`);
        console.log(`balanceBeforeWithdraw:${fromNano(balanceBeforeWithdraw)} TON`);
        console.log(`initialMasterBalance:${fromNano(initialMasterBalance)} TON`);
        console.log(`totalSupply:${fromNano(totalSupply)} Jettons`);
        console.log(`minterBalance:${fromNano(minterBalance)} TON`);

        // Verify fees were withdrawn
        expect(withdrawnFees).toBeGreaterThan(0n);
    });

    it('buy/sell fees check', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        const traderInitialBalance = await trader.getBalance();
        const minterInitialBalance = await minterContract.getTonBalance();

        const buyResults = await minterContract.sendBuy(
            trader.getSender(),
            toNano('1'),
            0n
        );

        buyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op != Op.transfer_notification) {
                expect(flatTx.success).toEqual(true);
            }
        });

        const balance = await traderJettonWallet.getJettonBalance();
        expect(balance).toBeGreaterThan(0n);

        const sellResults = await traderJettonWallet.sendSellJettons(
            trader.getSender(),
            toNano('0.1'),
            balance,
            minterContract.address
        );

        sellResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            expect(flatTx.success).toEqual(true);
        });

        const jettonBalanceAfterSell = await traderJettonWallet.getJettonBalance();
        expect(jettonBalanceAfterSell).toBe(0n);


        const traderBalanceAfterBuyAndSale = await trader.getBalance();
        const minterBalanceAfterBuyAndSale = await minterContract.getTonBalance();

        console.log(`UserBalanceChange:${fromNano(traderInitialBalance - traderBalanceAfterBuyAndSale)}
        ContractBalanceChange:${fromNano(minterBalanceAfterBuyAndSale - minterInitialBalance)}
        Fees:${fromNano((traderInitialBalance - traderBalanceAfterBuyAndSale) - (minterBalanceAfterBuyAndSale - minterInitialBalance))}
        `);

    });

    it('should perform multiple buys and sell all tokens in bulk', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        // Perform 100 buy operations
        for (let i = 0; i < 100; i++) {
            const buyResults = await minterContract.sendBuy(
                trader.getSender(),
                toNano('1'),
                BigInt(i)
            );

            buyResults.transactions.forEach((tx) => {
                const flatTx = flattenTransaction(tx);
                if (flatTx.op != Op.transfer_notification) {
                    expect(flatTx.success).toEqual(true);
                }
            });

            const balance = await traderJettonWallet.getJettonBalance();
            expect(balance).toBeGreaterThan(0n);
        }

        // Get total accumulated balance
        const totalBalance = await traderJettonWallet.getJettonBalance();
        expect(totalBalance).toBeGreaterThan(0n);
        console.log(`Total accumulated jettons: ${totalBalance.toString()}`);

        // Sell all tokens in one transaction
        const sellResults = await traderJettonWallet.sendSellJettons(
            trader.getSender(),
            toNano('0.1'),
            totalBalance,
            minterContract.address
        );

        sellResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            expect(flatTx.success).toEqual(true);
        });

        // Verify balance is zero after bulk sell
        const balanceAfterSell = await traderJettonWallet.getJettonBalance();
        expect(balanceAfterSell).toBe(0n);

        // Get balances before withdrawal
        const balanceBeforeWithdraw = await masterAddress.getBalance();

        // Withdraw fees to master address
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        // Get final balances and calculate withdrawn fees
        const balanceAfterWithdraw = await masterAddress.getBalance();
        const withdrawnFees = balanceAfterWithdraw - balanceBeforeWithdraw - initialMasterBalance;
        console.log(`Withdrawn fees: ${fromNano(withdrawnFees)} TON`);

        // Verify fees were withdrawn
        expect(withdrawnFees).toBeGreaterThan(0n);
    });

    it('should buy tokens in bulk and perform split selling', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        // Make one large purchase of 100 TON
        const buyResults = await minterContract.sendBuy(
            trader.getSender(),
            toNano('100'),
            0n
        );

        buyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op != Op.transfer_notification) {
                expect(flatTx.success).toEqual(true);
            }
        });

        // Get total balance after purchase
        const totalBalance = await traderJettonWallet.getJettonBalance();
        expect(totalBalance).toBeGreaterThan(0n);
        console.log(`Total jettons received: ${totalBalance.toString()}`);

        // Calculate amount for each sell transaction (1/100 of total)
        const sellAmount = totalBalance / 100n;
        expect(sellAmount).toBeGreaterThan(0n);
        console.log(`Amount per sell transaction: ${sellAmount.toString()}`);

        // Perform 100 sell operations
        for (let i = 0; i < 100; i++) {
            const sellResults = await traderJettonWallet.sendSellJettons(
                trader.getSender(),
                toNano('0.1'),
                sellAmount,
                minterContract.address
            );

            sellResults.transactions.forEach((tx) => {
                const flatTx = flattenTransaction(tx);
                expect(flatTx.success).toEqual(true);
            });

            // Verify remaining balance after each sell
            const remainingBalance = await traderJettonWallet.getJettonBalance();
            const expectedRemainingBalance = totalBalance - (sellAmount * BigInt(i + 1));
            expect(remainingBalance).toBe(expectedRemainingBalance);
        }

        // Verify final balance is zero or very close to zero (accounting for possible rounding)
        const finalBalance = await traderJettonWallet.getJettonBalance();
        expect(finalBalance).toBeLessThan(100n); // Allow for minor rounding differences

        // Get balances before withdrawal
        const balanceBeforeWithdraw = await masterAddress.getBalance();

        // Withdraw fees to master address
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        // Get final balances and calculate withdrawn fees
        const balanceAfterWithdraw = await masterAddress.getBalance();
        const withdrawnFees = balanceAfterWithdraw - balanceBeforeWithdraw - initialMasterBalance;
        console.log(`Withdrawn fees: ${fromNano(withdrawnFees)} TON`);

        // Verify fees were withdrawn
        expect(withdrawnFees).toBeGreaterThan(0n);
    });

    it('should handle large scale buy and sell operation', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        // Make one very large purchase of 1500 TON
        const buyAmount = toNano('1500');
        console.log(`Buying jettons for ${fromNano(buyAmount)} TON`);

        const buyResults = await minterContract.sendBuy(
            trader.getSender(),
            buyAmount,
            0n
        );

        var index = 0;
        buyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op != Op.transfer_notification) {
                if (!flatTx.success) {
                    console.log(`$index:${index}:${flatTx}`);
                }
                expect(flatTx.success).toEqual(true);
            }
            index++;
        });

        // Get total balance after purchase
        const totalBalance = await traderJettonWallet.getJettonBalance();
        expect(totalBalance).toBeGreaterThan(0n);
        console.log(`Total jettons received: ${totalBalance.toString()}`);

        // Record TON balance before selling
        const tonBalanceBeforeSell = await trader.getBalance();
        console.log(`TON balance before sell: ${fromNano(tonBalanceBeforeSell)} TON`);

        // Sell all tokens in one transaction
        const sellResults = await traderJettonWallet.sendSellJettons(
            trader.getSender(),
            toNano('0.1'),
            totalBalance,
            minterContract.address
        );

        sellResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            expect(flatTx.success).toEqual(true);
        });

        // Verify jetton balance is zero after sell
        const balanceAfterSell = await traderJettonWallet.getJettonBalance();
        expect(balanceAfterSell).toBe(0n);

        // Get TON balance after selling
        const tonBalanceAfterSell = await trader.getBalance();
        console.log(`TON balance after sell: ${fromNano(tonBalanceAfterSell)} TON`);

        // Calculate TON received from selling (excluding gas fees)
        const tonReceived = tonBalanceAfterSell - tonBalanceBeforeSell;
        console.log(`TON received from selling: ${fromNano(tonReceived)} TON`);

        // Get balances before withdrawal
        const balanceBeforeWithdraw = await masterAddress.getBalance();

        // Withdraw fees to master address
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        // Get final balances and calculate withdrawn fees
        const balanceAfterWithdraw = await masterAddress.getBalance();
        const withdrawnFees = balanceAfterWithdraw - balanceBeforeWithdraw - initialMasterBalance;
        console.log(`Withdrawn fees: ${fromNano(withdrawnFees)} TON`);

        // Verify fees were withdrawn
        expect(withdrawnFees).toBeGreaterThan(0n);

        // Additional verifications
        expect(tonReceived).toBeLessThan(buyAmount); // Should be less due to fees
        expect(tonReceived).toBeGreaterThan(0n); // Should receive some TON back
    });

    it('should not lock contract at 2000 TON', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        // Make one very large purchase of 1500 TON
        const buyAmount = toNano('2000');
        console.log(`Buying jettons for ${fromNano(buyAmount)} TON`);

        const buyResults = await minterContract.sendBuy(
            trader.getSender(),
            buyAmount,
            0n
        );

        var index = 0;
        buyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op != Op.transfer_notification) {
                if (!flatTx.success) {
                    console.log(`$index:${index}:${flatTx}`);
                }
                expect(flatTx.success).toEqual(true);
            }
            index++;
        });

        // Get total balance after purchase
        const totalBalance = await traderJettonWallet.getJettonBalance();
        expect(totalBalance).toBeGreaterThan(0n);
        console.log(`Total jettons received: ${totalBalance.toString()}`);

        // Record TON balance before selling
        const tonBalanceBeforeSell = await trader.getBalance();
        console.log(`TON balance before sell: ${fromNano(tonBalanceBeforeSell)} TON`);

        // Sell all tokens in one transaction
        const sellResults = await traderJettonWallet.sendSellJettons(
            trader.getSender(),
            toNano('0.1'),
            totalBalance,
            minterContract.address
        );

        sellResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            expect(flatTx.success).toEqual(true);
        });

        // Verify jetton balance is zero after sell
        const balanceAfterSell = await traderJettonWallet.getJettonBalance();
        expect(balanceAfterSell).toBe(0n);

        // Get TON balance after selling
        const tonBalanceAfterSell = await trader.getBalance();
        console.log(`TON balance after sell: ${fromNano(tonBalanceAfterSell)} TON`);

        // Calculate TON received from selling (excluding gas fees)
        const tonReceived = tonBalanceAfterSell - tonBalanceBeforeSell;
        console.log(`TON received from selling: ${fromNano(tonReceived)} TON`);

        // Get balances before withdrawal
        const balanceBeforeWithdraw = await masterAddress.getBalance();

        // Withdraw fees to master address
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        // Get final balances and calculate withdrawn fees
        const balanceAfterWithdraw = await masterAddress.getBalance();
        const withdrawnFees = balanceAfterWithdraw - balanceBeforeWithdraw - initialMasterBalance;
        console.log(`Withdrawn fees: ${fromNano(withdrawnFees)} TON`);

        // Verify fees were withdrawn
        expect(withdrawnFees).toBeGreaterThan(0n);

        // Additional verifications
        expect(tonReceived).toBeLessThan(buyAmount); // Should be less due to fees
        expect(tonReceived).toBeGreaterThan(0n); // Should receive some TON back
    });

    it('should lock contract at 2050 TON', async () => {
        trader = await blockchain.treasury('trader');
        traderJettonWallet = await jettonContractGetter(trader.address);

        // Make one very large purchase of 1500 TON
        const buyAmount = toNano('2050');
        console.log(`Buying jettons for ${fromNano(buyAmount)} TON`);

        const buyResults = await minterContract.sendBuy(
            trader.getSender(),
            buyAmount,
            0n
        );

        buyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op != Op.transfer_notification && (flatTx.from == trader.address || flatTx.to == trader.address)) {
                expect(flatTx.success).toEqual(true);
            }
        });
        console.log(`minterAddress:${minterContract.address}`);
        const opCodes = buyResults.transactions
            .filter((tx) => {
                const flatTx = flattenTransaction(tx);
                console.log(`from: ${flatTx.from}`);
                console.log(`op: ${flatTx.op}`);
                return flattenTransaction(tx).from?.toRawString() == minterContract.address?.toRawString();
            })
            .map((tx) => flattenTransaction(tx).op)
            .filter((tx) => tx != undefined) as number[];

        console.log(opCodes);
        expect(opCodes).toContain(Op.internal_transfer);
        expect(opCodes).toContain(Op.pton_transfer_ton);

        // Get total balance after purchase
        const totalBalance = await traderJettonWallet.getJettonBalance();
        expect(totalBalance).toBeGreaterThan(0n);
        console.log(`Total jettons received: ${totalBalance.toString()}`);

        // Record TON balance before selling
        const tonBalanceBeforeSell = await trader.getBalance();
        console.log(`TON balance before sell: ${fromNano(tonBalanceBeforeSell)} TON`);

        // Sell all tokens in one transaction
        const sellResults = await traderJettonWallet.sendSellJettons(
            trader.getSender(),
            toNano('0.1'),
            totalBalance,
            minterContract.address
        );

        // Contract locked
        sellResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op == Op.burn_notification) {
                expect(flatTx.success).toEqual(false);
            }
        });

        const secondBuyResults = await minterContract.sendBuy(
            trader.getSender(),
            buyAmount,
            0n
        );

        // Contract locked
        secondBuyResults.transactions.forEach((tx) => {
            const flatTx = flattenTransaction(tx);
            if (flatTx.op == Op.buy_coins) {
                expect(flatTx.success).toEqual(false);
            }
        });

        // Verify jettons aren't sold
        const balanceAfterSell = await traderJettonWallet.getJettonBalance();
        expect(balanceAfterSell).toBeGreaterThan(0n);

        // Get TON balance after selling
        const tonBalanceAfterSell = await trader.getBalance();
        console.log(`TON balance after sell: ${fromNano(tonBalanceAfterSell)} TON`);

        // Calculate TON received from selling (excluding gas fees)
        const tonReceived = tonBalanceAfterSell - tonBalanceBeforeSell;
        console.log(`TON received from selling: ${fromNano(tonReceived)} TON`);

        const minterBalance = await minterContract.getTonBalance();
        const minterTotalSupply = await minterContract.getTotalSupply();

        console.log(`minterBalance:${fromNano(minterBalance)}`);
        console.log(`totalSupply:${fromNano(minterTotalSupply)}`);
        // Withdraw fees to master address
        const withdrawResult = await minterContract.sendWithdrawFees(
            masterAddress.getSender(),
            masterAddress.address,
            toNano('0.1')
        );

        expect(tonReceived).toBeLessThan(0n); // Should be less than 0 due to fees
    });
});