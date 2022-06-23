use ckb_fixed_hash_core::H256;
use ckb_types::h256;

/// "TYPE_ID" in hex (copied from ckb-chain-spec)
pub const TYPE_ID_CODE_HASH: H256 = h256!("0x545950455f4944");

pub const SIGHASH_TYPE_HASH: H256 =
    h256!("0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8");
// pub const MULTISIG_TYPE_HASH: H256 =
//     h256!("
// 0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8");
// pub const DAO_TYPE_HASH: H256 =
//     h256!("
// 0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e");

// testnet
pub const SIGHASH_TX_HASH: H256 =
    h256!("0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37");

pub const CROSSCHAIN_METADATA_TX_HASH: H256 =
    h256!("0xbb08fe0727449919a5d9f7d8d3333d57d56730dcab9ccfd1ba6ca47c7c0ae9bf");
pub const CROSSCHAIN_METADATA_CODE_HASH: H256 =
    h256!("0x4f0eac26544fe1ed861711ba7cb9379c47b792c08a7ed1e22875e4d5a2a0fdc2");

pub const CROSSCHAIN_REQUEST_TX_HASH: H256 =
    h256!("0x654a8fa8f5cb500de807e83ae6dabdec6474f738299e28e1470c142f97d56b47");
pub const CROSSCHAIN_REQUEST_CODE_HASH: H256 =
    h256!("0xd8f9afaad8eb3e26a1ef2538bac91d68635502508358ae901941513bfe2edb1d");

// pub const CROSSCHAIN_LOCK_CODE_HASH: H256 =
//     h256!("
// 0x33823dfb574bbfe453dde89eda4832c49abfb649be639c3c629c0657c7da77fb");

// it's empty check, just for test
pub const CROSSCHAIN_LOCK_CODE_HASH_TEST: H256 =
    h256!("0x97e6179be134d47ca10322a1534d8dcb65052de7e099b5556bea924137839bab");

// A `Byte` contains how many `Shannons`.
pub const BYTE_SHANNONS: u64 = 100_000_000;
