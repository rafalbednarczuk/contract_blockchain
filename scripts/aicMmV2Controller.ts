import { Address, OpenedContract, toNano } from '@ton/core';
import { compile, NetworkProvider, UIProvider } from '@ton/blueprint';
import { AicMmV2 } from '../wrappers/AicMmV2';
import { promptBool, promptAmount, promptAddress, waitForTransaction } from '../wrappers/ui-utils';
import { TonClient } from '@ton/ton';

let aicMmV2Contract: OpenedContract<AicMmV2>;

const actions = ['Buy Tokens', 'Sell Tokens', 'Get Balance'];

const buyTokens = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let jettonAmount: string;
    let tonAmount: string;

    do {
        retry = false;
        jettonAmount = await promptAmount('Please provide jetton amount to buy:', ui);
        tonAmount = await promptAmount('Please provide TON amount (including 1% slippage):', ui);
        ui.write(`Buy ${jettonAmount} tokens for ${tonAmount} TON\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Buying ${jettonAmount} tokens for ${tonAmount} TON\n`);
    const curState = await (provider.api() as TonClient).getContractState(aicMmV2Contract.address);

    if (curState.lastTransaction === null)
        throw ('Last transaction can\'t be null on deployed contract');

    const res = await aicMmV2Contract.sendBuy(
        sender,
        toNano(tonAmount),
        0n,
        toNano(jettonAmount),
        toNano(tonAmount)
    );

    const gotTrans = await waitForTransaction(
        provider,
        aicMmV2Contract.address,
        curState.lastTransaction.lt,
        10
    );
};

const sellTokens = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;
    let jettonAmount: string;
    let tonAmount: string;

    do {
        retry = false;
        jettonAmount = await promptAmount('Please provide jetton amount to sell:', ui);
        tonAmount = await promptAmount('Please provide minimum TON amount to receive (with 1% slippage):', ui);
        ui.write(`Sell ${jettonAmount} tokens for minimum ${tonAmount} TON\n`);
        retry = !(await promptBool('Is it ok?(yes/no)', ['yes', 'no'], ui));
    } while (retry);

    ui.write(`Selling ${jettonAmount} tokens for minimum ${tonAmount} TON\n`);
    const curState = await (provider.api() as TonClient).getContractState(aicMmV2Contract.address);

    if (curState.lastTransaction === null)
        throw ('Last transaction can\'t be null on deployed contract');

    const res = await aicMmV2Contract.sendSell(
        sender,
        toNano('0.1'), // Service fee
        0n,
        toNano(jettonAmount),
        toNano(tonAmount)
    );

    const gotTrans = await waitForTransaction(
        provider,
        aicMmV2Contract.address,
        curState.lastTransaction.lt,
        10
    );
};

const getBalance = async (provider: NetworkProvider, ui: UIProvider) => {
    const sender = provider.sender();
    let retry: boolean;

    try {
        const balance = await aicMmV2Contract.getMemecoinsBalance(provider.sender().address!);
        ui.write(`MemecoinsBalance: ${balance}\n`);
    } catch (error) {
        ui.write(`Error getting balance: ${error}\n`);
    }
};

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const api = provider.api();
    const aicMmV2Code = await compile('AicMmV2');
    let done = false;
    let retry: boolean;
    let contractAddress: Address;

    do {
        retry = false;
        contractAddress = await promptAddress('Please enter the AicMmV2 contract address:', ui);
        const contractState = await (provider.api() as TonClient).getContractState(contractAddress);
        if (contractState.state !== 'active' || contractState.code == null) {
            retry = true;
            ui.write('This contract is not active!\nPlease use another address, or deploy it first');
        }
    } while (retry);

    aicMmV2Contract = provider.open(AicMmV2.createFromAddress(contractAddress));

    do {
        const action = await ui.choose('Pick action:', actions, (c) => c);
        switch (action) {
            case 'Buy Tokens':
                await buyTokens(provider, ui);
                break;
            case 'Sell Tokens':
                await sellTokens(provider, ui);
                break;
            case 'Get Balance':
                await getBalance(provider, ui);
                break;
        }
    } while (!done);
}