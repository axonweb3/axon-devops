const { ethers } = require("ethers");
const {
    Pool,
    Position,
    nearestUsableTick,
    NonfungiblePositionManager,
    encodeSqrtRatioX96,
} = require("@uniswap/v3-sdk");
const { Token, Percent } = require("@uniswap/sdk-core");

const { abi: IUniswapV3PoolInitializerABI } = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IPoolInitializer.sol/IPoolInitializer.json");
const { abi: IUniswapV3PoolABI } = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const { abi: SwapRouterABI } = require("@uniswap/swap-router-contracts/artifacts/contracts/interfaces/IV3SwapRouter.sol/IV3SwapRouter.json");

const logger = require("./logger");

async function getPoolImmutables(contract) {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
        contract.factory(),
        contract.token0(),
        contract.token1(),
        contract.fee(),
        contract.tickSpacing(),
        contract.maxLiquidityPerTick(),
    ]);

    return {
        factory,
        token0,
        token1,
        fee,
        tickSpacing,
        maxLiquidityPerTick,
    };
}

async function getPoolState(contract) {
    const [liquidity, slot] = await Promise.all([
        contract.liquidity(),
        contract.slot0(),
    ]);

    return {
        liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
    };
}

class Benchmark {
    constructor(info) {
        this.config = info.config;

        this.provider = new ethers.providers.JsonRpcProvider(info.config.http_endpoint);

        this.contract = new ethers.Contract(
            info.contracts["UniswapV3Pool"],
            IUniswapV3PoolABI,
            this.provider,
        );
        this.swapRouterContract = new ethers.Contract(
            this.config.uniswapSwapRouterAddress,
            SwapRouterABI,
            this.provider,
        );

        this.accounts = info.accounts;
        this.index = 0;
    }

    async gen_tx() {
        const index = this.index;
        this.index += 1;

        const account = this.accounts[index % this.accounts.length];

        const immutables = await getPoolImmutables(this.contract);

        const callTx = await this.swapRouterContract
            .connect(account.signer)
            .populateTransaction
            .exactInputSingle({
                tokenIn: immutables.token0,
                tokenOut: immutables.token1,
                fee: immutables.fee,
                recipient: account.address,
                amountIn: 1,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0,
            }, { nonce: account.getNonce() });

        const tx = await account.signer.populateTransaction(callTx);
        logger.debug(tx);

        return account.signer.signTransaction(tx);
    }

    static async createPool({
        token0,
        token1,
        uniswapNonfungiblePositionManagerAddress,
        nonceSigner,
        chainId,
    }) {
        const { signer } = nonceSigner;

        const initializer = new ethers.Contract(
            uniswapNonfungiblePositionManagerAddress,
            IUniswapV3PoolInitializerABI,
            signer,
        );

        const creation = await (await initializer.createAndInitializePoolIfNecessary(
            token0 < token1 ? token0 : token1,
            token0 < token1 ? token1 : token0,
            500,
            encodeSqrtRatioX96(1, 1).toString(),
            { gasLimit: "0x1000000", nonce: nonceSigner.getNonce() },
        )).wait();

        let eventInterface = new ethers.utils.Interface(
            ["event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"],
        );
        const poolAddress = eventInterface.parseLog(creation.logs[0]).args.pool;

        console.log(`\npool ${poolAddress} deployed for ${token0} and ${token1}`);

        const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, signer);

        const [immutables, state] = await Promise.all([
            getPoolImmutables(poolContract),
            getPoolState(poolContract),
        ]);

        const tokenA = new Token(chainId, immutables.token0, 18, "TK0", "Token 0");

        const tokenB = new Token(chainId, immutables.token1, 18, "TK1", "Token 1");

        const pool = new Pool(
            tokenA,
            tokenB,
            immutables.fee,
            state.sqrtPriceX96.toString(),
            state.liquidity.toString(),
            state.tick,
        );

        const position = new Position({
            pool,
            liquidity: 0xfffffff,
            tickLower: nearestUsableTick(state.tick, immutables.tickSpacing) - immutables.tickSpacing * 2,
            tickUpper: nearestUsableTick(state.tick, immutables.tickSpacing) + immutables.tickSpacing * 2,
        });

        const deadline = (await signer.provider.getBlock("latest")).timestamp + 0xfffffff;

        const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, {
            slippageTolerance: new Percent(1, 1),
            recipient: signer.address,
            deadline,
        });

        const tx = {
            data: calldata,
            to: uniswapNonfungiblePositionManagerAddress,
            value: value,
            nonce: nonceSigner.getNonce(),
        };

        await (await signer.sendTransaction(
            tx,
        )).wait();

        console.log(`\nposition minted for ${poolAddress}`);

        return poolAddress;
    }
}

module.exports = Benchmark;
