use crate::crosschain_tx::crosschain;
use ckb_types::{
    packed::Byte32,
    prelude::{Builder, Entity},
};

impl From<&Byte32> for crosschain::Hash {
    fn from(hash: &Byte32) -> Self {
        let hash = hash.as_bytes();
        crosschain::Hash::new_unchecked(hash)
    }
}

impl From<u16> for crosschain::Uint16 {
    fn from(value: u16) -> Self {
        crosschain::Uint16::new_unchecked(value.to_le_bytes().to_vec().into())
    }
}

impl From<u32> for crosschain::Uint32 {
    fn from(value: u32) -> Self {
        crosschain::Uint32::new_unchecked(value.to_le_bytes().to_vec().into())
    }
}

impl From<u64> for crosschain::Uint64 {
    fn from(value: u64) -> Self {
        crosschain::Uint64::new_unchecked(value.to_le_bytes().to_vec().into())
    }
}

impl From<&[u8; 20]> for crosschain::Address {
    fn from(value: &[u8; 20]) -> Self {
        crosschain::Address::new_unchecked(value.to_vec().into())
    }
}

pub fn cs_token_config(tokens: &[([u8; 20], Byte32, u32)]) -> crosschain::TokenConfig {
    let mut token_config = crosschain::TokenConfigBuilder::default();
    for val in tokens {
        let token = crosschain::Token::new_builder()
            .erc20_address((&val.0).into())
            .sudt_typehash((&val.1).into())
            .fee_ratio(val.2.into())
            .build();
        token_config = token_config.push(token);
    }
    token_config.build()
}
