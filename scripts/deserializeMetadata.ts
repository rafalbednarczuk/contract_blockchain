import {Cell, Builder, Dictionary, DictionaryValue, Slice} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {sha256} from '@ton/crypto';

// Complete set of known metadata keys based on documentation
const KNOWN_KEYS = {
    uri: 'uri',
    name: 'name',
    description: 'description',
    image: 'image',
    image_data: 'image_data',
    symbol: 'symbol',
    decimals: 'decimals',
    amount_style: 'amount_style',
    render_type: 'render_type'
} as const;

// Additional validation constants
const AMOUNT_STYLE_VALUES = ['n', 'n-of-total', '%'] as const;
const RENDER_TYPE_VALUES = ['currency', 'game'] as const;
const DEFAULT_DECIMALS = '9';
const DEFAULT_AMOUNT_STYLE = 'n' as const;
const DEFAULT_RENDER_TYPE = 'currency' as const;

type AmountStyle = typeof AMOUNT_STYLE_VALUES[number];
type RenderType = typeof RENDER_TYPE_VALUES[number];

type MetadataKey = keyof typeof KNOWN_KEYS;

interface OnChainJettonMetadata {
    uri?: string;
    name?: string;
    description?: string;
    image?: string;
    image_data?: string;
    symbol?: string;
    decimals?: string;
    amount_style?: AmountStyle;
    render_type?: RenderType;
}

interface OffChainJettonMetadata {
    uri: string;
}

type JettonMetadata = OnChainJettonMetadata | OffChainJettonMetadata;

const ContentValue: DictionaryValue<Cell> = {
    serialize(src: Cell, builder: Builder) {
        builder.storeRef(src);
    },
    parse(slice: Slice): Cell {
        return slice.loadRef();
    }
};

function readSnakeString(cell: Cell): string {
    let result = '';
    let currentCell: Cell | null = cell;

    while (currentCell) {
        const slice = currentCell.beginParse();
        if (slice.remainingBits === 0) break;

        const bytes = Math.floor(slice.remainingBits / 8);
        const buffer = slice.loadBuffer(bytes);
        result += buffer.toString('utf8');

        currentCell = currentCell.refs.length > 0 ? currentCell.refs[0] : null;
    }

    return result.replace(/\0/g, '');
}

async function deserializeOnChainMetadata(dict: Dictionary<bigint, Cell>): Promise<OnChainJettonMetadata> {
    const metadata: OnChainJettonMetadata = {};

    Object.entries(dict).forEach(
        ([key, value]) => console.log("key/value:", key, value)
    );

    async function getDictValue(key: string): Promise<string | null> {
        try {
            const keyBuffer = Buffer.from(key);
            const keyHash = await sha256(keyBuffer);
            const keyBigInt = BigInt('0x' + keyHash.toString('hex'));
            const value = dict.get(keyBigInt);
            return value ? readSnakeString(value) : null;
        } catch (e) {
            console.warn(`Failed to get value for key ${key}:`, e);
            return null;
        }
    }

    // Extract and validate all fields
    for (const [key, fieldName] of Object.entries(KNOWN_KEYS)) {
        try {
            const value = await getDictValue(fieldName);
            if (value) {
                switch (key) {
                    case 'decimals': {
                        const decimalValue = parseInt(value);
                        if (isNaN(decimalValue) || decimalValue < 0 || decimalValue > 255) {
                            console.warn(`Invalid decimals value: ${value}, using default: ${DEFAULT_DECIMALS}`);
                            metadata[key] = DEFAULT_DECIMALS;
                        } else {
                            metadata[key] = value;
                        }
                        break;
                    }
                    case 'amount_style': {
                        if (AMOUNT_STYLE_VALUES.includes(value as AmountStyle)) {
                            metadata[key] = value as AmountStyle;
                        } else {
                            console.warn(`Invalid amount_style value: ${value}, using default: ${DEFAULT_AMOUNT_STYLE}`);
                            metadata[key] = DEFAULT_AMOUNT_STYLE;
                        }
                        break;
                    }
                    case 'render_type': {
                        if (RENDER_TYPE_VALUES.includes(value as RenderType)) {
                            metadata[key] = value as RenderType;
                        } else {
                            console.warn(`Invalid render_type value: ${value}, using default: ${DEFAULT_RENDER_TYPE}`);
                            metadata[key] = DEFAULT_RENDER_TYPE;
                        }
                        break;
                    }
                    default: {
                        if (key in KNOWN_KEYS) {
                            (metadata as any)[key] = value;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to extract ${key}:`, e);
        }
    }

    return metadata;
}

async function deserializeMetadata(provider: NetworkProvider, cell: Cell): Promise<JettonMetadata> {
    const slice = cell.beginParse();
    const prefix = slice.loadUint(8);

    if (prefix === 1) {
        // Off-chain metadata - return the URI
        return {uri: readSnakeString(cell)};
    } else if (prefix === 0) {
        // On-chain metadata
        const dict = slice.loadDict(
            Dictionary.Keys.BigUint(256),
            ContentValue
        );
        return await deserializeOnChainMetadata(dict);
    } else {
        throw new Error(`Invalid metadata prefix: ${prefix}`);
    }
}

export async function run(provider: NetworkProvider) {
    const hexOffChain = "b5ee9c720101020100940001fe0168747470733a2f2f676973742e67697468756275736572636f6e74656e742e636f6d2f726166616c6265646e6172637a756b2f34636632343536646236343239646362306262303938613264323439326538612f7261772f363937353832653664396231613766653532626139343430663665306164663239313635333101002062332f6769737466696c65312e747874";
    const hexOnChainPabloCoin = "b5ee9c7201020c0100012f00010300c00102012002030143bff082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f1ec0040201200506006e0068747470733a2f2f626974636f696e636173682d6578616d706c652e6769746875622e696f2f776562736974652f6c6f676f2e706e6702012007080142bf89046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd1040b0141bf4546a6ffe1b79cfdd86bad3db874313dcde2fb05e6a74aa7f3552d9617c79d13090141bf6ed4f942a7848ce2cb066b77a1128c6a1ff8c43f438a2dce24612ba9ffab8b030a0016005061626c6f636f696e200008005062630078004c6f772066656520706565722d746f2d7065657220656c656374726f6e6963206361736820616c7465726e617469766520746f20426974636f696e";
    const hexOnChainPabloCoMy = "b5ee9c7241020c0100012f00010300c00102012002040143bff082eb663b57a00192f4a6ac467288df2dfeddb9da1bee28f6521c8bebd21f1ec003006e0068747470733a2f2f626974636f696e636173682d6578616d706c652e6769746875622e696f2f776562736974652f6c6f676f2e706e67020120050a02012006080141bf4546a6ffe1b79cfdd86bad3db874313dcde2fb05e6a74aa7f3552d9617c79d13070016005061626c6f636f696e200141bf6ed4f942a7848ce2cb066b77a1128c6a1ff8c43f438a2dce24612ba9ffab8b03090008005062630142bf89046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd1040b0078004c6f772066656520706565722d746f2d7065657220656c656374726f6e6963206361736820616c7465726e617469766520746f20426974636f696ede0f1770";

    try {
        const cell = Cell.fromBoc(Buffer.from(hexOnChainPabloCoMy, 'hex'))[0];
        console.log('Cell loaded successfully');

        // Deserialize metadata
        const metadata = await deserializeMetadata(provider, cell);

        // Print all dictionary entries for debugging
        console.log('\nFinal metadata:');
        console.log(JSON.stringify(metadata, null, 2));

    } catch (error) {
        console.error('Deserialization failed:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }
}