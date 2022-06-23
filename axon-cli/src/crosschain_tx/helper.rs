use crate::crosschain_tx::crosschain;
use ckb_types::{
    packed::Byte32,
    // H256,
    // bytes::Bytes,
    // core::{ScriptHashType, TransactionView},
    // packed::{self, *},
    prelude::{Builder, Entity},
};

pub fn cs_hash(hash: &Byte32) -> crosschain::Hash {
    let hash = hash.as_bytes();
    crosschain::Hash::new_unchecked(hash)
}

pub fn cs_uint32(value: u32) -> crosschain::Uint32 {
    crosschain::Uint32::new_unchecked(value.to_le_bytes().to_vec().into())
}

pub fn cs_uint64(value: u64) -> crosschain::Uint64 {
    crosschain::Uint64::new_unchecked(value.to_le_bytes().to_vec().into())
}

// pub fn cs_uint128(value: u128) -> crosschain::Uint128 {
//     crosschain::Uint128::new_unchecked(value.to_le_bytes().to_vec().into())
// }

pub fn cs_address(value: &[u8; 20]) -> crosschain::Address {
    crosschain::Address::new_unchecked(value.to_vec().into())
}

pub fn cs_token_config(tokens: &[([u8; 20], Byte32, u32)]) -> crosschain::TokenConfig {
    let mut token_config = crosschain::TokenConfigBuilder::default();
    for val in tokens {
        let token = crosschain::Token::new_builder()
            .erc20_address(cs_address(&val.0))
            .sudt_typehash(cs_hash(&val.1))
            .fee_ratio(cs_uint32(val.2))
            .build();
        token_config = token_config.push(token);
    }
    token_config.build()
}
