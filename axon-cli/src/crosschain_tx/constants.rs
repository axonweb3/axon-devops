use ckb_fixed_hash_core::{H160, H256};
use ckb_types::{h160, h256};

// A `Byte` contains how many `Shannons`.
pub const BYTE_SHANNONS: u64 = 100_000_000;
pub const ETHER: u64 = 1_000_000_000_000_000_000; // 10^18
pub const TX_FEE: u64 = BYTE_SHANNONS; // tx fee fixed to be 1ckb
pub const CELL_MIN_CKB: u64 = 61 * BYTE_SHANNONS;

// crosschain token config
pub const CHAIN_ID: u16 = 5;
pub const CKB_FEE_RATIO: u32 = 100; // ( 100/10,000 ) %
pub const SUDT_CS_SIZE: usize = 16;

/// "TYPE_ID" in hex (copied from ckb-chain-spec)
pub const TYPE_ID_CODE_HASH: H256 = h256!("0x545950455f4944");

// testnet, secp256k1
pub const SECP256K1_BLAKE160_CODE_HASH: H256 =
    h256!("0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8");
pub const SECP256K1_BLAKE160_TX_HASH: H256 =
    h256!("0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37");

// pub const MULTISIG_TYPE_HASH: H256 =
//     h256!("
// 0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8");
// pub const DAO_TYPE_HASH: H256 =
//     h256!("
// 0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e");

pub const CROSSCHAIN_METADATA_TX_HASH: H256 =
    h256!("0xbb08fe0727449919a5d9f7d8d3333d57d56730dcab9ccfd1ba6ca47c7c0ae9bf");
pub const CROSSCHAIN_METADATA_CODE_HASH: H256 =
    h256!("0x4f0eac26544fe1ed861711ba7cb9379c47b792c08a7ed1e22875e4d5a2a0fdc2");

pub const CROSSCHAIN_REQUEST_TX_HASH: H256 =
    h256!("0x272168c3d7c4576398f6cb82a15490ad07b11602c0af8810f7dc0fd4252717fb");
pub const CROSSCHAIN_REQUEST_CODE_HASH: H256 =
    h256!("0xb14817a81bea1231a787122943a487884b193bcf90db94a7afe9ef1ac8c5deb5");

// pub const CROSSCHAIN_LOCK_CODE_HASH: H256 =
//     h256!("
// 0x33823dfb574bbfe453dde89eda4832c49abfb649be639c3c629c0657c7da77fb");

// it's empty check, just for test
pub const CROSSCHAIN_LOCK_TYPE_ID: H256 =
    h256!("0xe6716305da395dbd3dc094695b2a6dc9160e186e41102cceac377d78a350c962");

pub const AXON_ADDR: H160 = h160!("0x421871e656E04c9A106A55CEd53Fc9A49560a424");

// sudt owner lock hash
pub const SUDT_OWNER_LOCK_HASH: H256 =
    h256!("0xc2ca3b067635ecf9a5b17a398a2509a2bd93ed172bfb6699c7b046704ded529a");
// this tx hash and code hash are fixed provided in rfcs25
pub const SUDT_WAT_TX_HASH: H256 =
    h256!("0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769");
pub const SUDT_WAT_CODE_HASH: H256 =
    h256!("0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4");

// args of type script from deploy crosschain metadata tx, needs to keep
// unchanged  this is needed to search for the correct deploy cell
pub const CROSSCHAIN_DEPLOY_METADATA_TYPE_SCRIPT_ARGS: H256 =
    h256!("0x490d951fe6d4d34d0c4f238b50b8b1d524ddf737275b1a1f1e3216f0af5c522e");
// type id of cross-chain metadata, the typeid of
// build_deploy_crosschain_metadata_tx calculated in build_type_id_script
pub const CROSSCHAIN_DEPLOY_METADATA_TYPEID: H256 =
    h256!("0xedc5d491da94ef638eefec43372a293879c518dbb4af3be0766ce6806befa3ec");
// tx hash created by build_deploy_crosschain_metadata_tx
pub const CROSSCHAIN_DEPLOY_METADATA_TX_HASH: H256 =
    h256!("0xa59fd4394821ab90558f9c33f64847cd9209283418dd548a34c366ac012addc7");
