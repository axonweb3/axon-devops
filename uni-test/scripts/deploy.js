// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
;
async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const { expect } = require("chai")

    const account_a = await hre.ethers.getSigner("0x35E70C3F5A794A77Efc2Ec5bA964BFfcC7Fd2C0a");
    console.log("signer address is :", account_a.address);

    //get  facatory constract objcet 
    const Facatory = await hre.ethers.getContractFactory("UniswapV2Factory");
    //get  weth constract objcet 
    const WETH = await hre.ethers.getContractFactory("WETH9");
    //get  UniswapV2Router02 constract objcet
    const Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    //get  multicall constract objcet
    const Multicall = await hre.ethers.getContractFactory("Multicall");
    //get one Token ERC20  that name is TT
    const ERC20_1 = await hre.ethers.getContractFactory("TRAMS");
    //get one Token ERC20  tha name is  TS
    const ERC20_2 = await hre.ethers.getContractFactory("TRAMS");
    //get one Token ERC20  tha name is  TSY
    const ERC20_3 = await hre.ethers.getContractFactory("TRAMS");

    //publish the factory constract 
    const Facatory_de = await Facatory.deploy(account_a.address);
    Facatory_de.deployed();
    console.log("facatory address is ", Facatory_de.address)

    // //publish the weth constract 
    // const Weth_de = await WETH.deploy();
    // Weth_de.deployed();
    // console.log("weth address is ", Weth_de.address)


    // //publish UniswapV2Router02 constract 
    // const Router02_de = await Router02.deploy(Facatory_de.address, Weth_de.address);
    // Router02_de.deployed();
    // console.log("UniswapV2Router02 address is ", Router02_de.address)

    // //publish UniswapV2Router02 constract 
    // const Multicall_de = await Router02.deploy(Facatory_de.address, Weth_de.address);
    // Multicall_de.deployed();
    // console.log("Multicall address is ", Multicall_de.address)

    // //deploy TT,TS,TSY Tokens
    // const ERC20_1_de = await ERC20_1.deploy("TT", "TT1", account_a.address);
    // const ERC20_2_de = await ERC20_2.deploy("TS", "TS1", account_a.address);
    // const ERC20_3_de = await ERC20_3.deploy("TSY", "TSY", account_a.address);

    // ERC20_1_de.deployed();
    // ERC20_2_de.deployed();
    // ERC20_3_de.deployed();


    // //checked the  status of ERC20 is deployed 
    // console.log("ERC20_1_de address is ", ERC20_1_de.address);
    // console.log("ERC20_1_de name is ", await ERC20_1_de.name());
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
