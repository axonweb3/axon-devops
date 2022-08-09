extern crate derive_more;
use async_trait::async_trait;
use derive_more::Display;

mod constants;
mod crosschain;
mod helper;

use ckb_crypto::secp::Privkey;
use ckb_fixed_hash_core::H256;
use ckb_hash::{blake2b_256, new_blake2b};
use ckb_sdk::{
    traits::{CellCollector, CellQueryOptions, DefaultCellCollector, ValueRangeOption},
    CkbRpcClient, SECP256K1,
};
use ckb_types::{
    bytes::Bytes,
    core::{Capacity, DepType, ScriptHashType, TransactionBuilder, TransactionView},
    packed::{
        Byte32, Bytes as PackedBytes, CellDep, CellInput, CellOutput, OutPoint, Script, ScriptOpt,
        WitnessArgs,
    },
    prelude::*,
};
use clap::{Arg, ArgMatches, Command, Parser};
use std::{error::Error as StdErr, ops::Mul, str::FromStr, sync::mpsc::channel};

use crate::{
    crosschain_tx::{constants::*, helper::*},
    sub_command::SubCommand,
};
use ckb_jsonrpc_types as json_types;
use crossbeam_utils::thread;

#[derive(Parser, Debug, Default)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// deploy crosschain metadata or ckb->axon crosschain tx
    tx_type:     u16,
    /// The sender private key (hex string)
    sender_key:  H256,
    /// The receiver address
    // #[clap(long, value_name = "ADDRESS")]
    // receiver: Address,

    /// The capacity to transfer (unit: CKB, example: 102.43)
    capacity:    u64,
    /// CKB rpc url
    ckb_rpc:     String,
    /// CKB indexer rpc url
    ckb_indexer: String,
    sudt_amount: f64,
}

/// Send crosschain error.
#[derive(Debug, Display)]
pub enum SendTxError {
    ///
    LackBalance,
    NoLiveCell,
    CollectorErr(String),
    ExecErr(String),
}
impl StdErr for SendTxError {}

#[derive(Debug, Default)]
pub struct CrossChain {}

#[async_trait]
impl SubCommand for CrossChain {
    fn get_command(&self) -> Command<'static> {
        Command::new("cs")
            .about("CKB AXON Crosschain")
            .arg(
                Arg::new("tx-type")
                    .short('t')
                    .long("tx-type")
                    .help("deploy crosschain metadata or ckb->axon crosschain tx")
                    .required(false)
                    .default_value("0")
                    .takes_value(true),
            )
            .arg(
                Arg::new("sender-key")
                    .short('s')
                    .long("sender-key")
                    .help("The sender private key (hex string)")
                    .required(true)
                    .takes_value(true),
            )
            .arg(
                Arg::new("capacity")
                    .short('c')
                    .long("capacity")
                    .help("The capacity to transfer (unit: CKB, example: 102.43)")
                    .required(true)
                    .takes_value(true),
            )
            .arg(
                Arg::new("ckb-rpc")
                    .short('r')
                    .long("ckb-rpc")
                    .help("CKB rpc url")
                    .required(false)
                    .default_value("http://3.235.223.161:18114")
                    .takes_value(true),
            )
            .arg(
                Arg::new("ckb-indexer")
                    .short('i')
                    .long("ckb-indexer")
                    .help("CKB indexer rpc url")
                    .required(false)
                    .default_value("http://3.235.223.161:18116")
                    .takes_value(true),
            )
            .arg(
                Arg::new("sudt-amount")
                    .short('u')
                    .long("sudt-amount")
                    .help("transfer sudt from ckb to axon")
                    .required(false)
                    .default_value("0")
                    .takes_value(true),
            )
    }

    async fn exec_command(&self, cs_matches: &ArgMatches) -> Result<(), Box<dyn StdErr>> {
        // Parse arguments
        let args = Args {
            tx_type:     cs_matches
                .value_of("tx-type")
                .unwrap()
                .parse::<u16>()
                .unwrap(),
            sender_key:  H256::from_str(cs_matches.value_of("sender-key").unwrap()).unwrap(),
            capacity:    cs_matches
                .value_of("capacity")
                .unwrap()
                .parse::<u64>()
                .unwrap(),
            ckb_rpc:     cs_matches.value_of("ckb-rpc").unwrap().to_string(),
            ckb_indexer: cs_matches.value_of("ckb-indexer").unwrap().to_string(),
            sudt_amount: cs_matches
                .value_of("sudt-amount")
                .unwrap()
                .parse::<f64>()
                .unwrap(),
        };
        // println!("args {:?}", args);

        // sender key is the lock_arg of wallet 1 from https://zero2ckb.ckbapp.dev/learn
        let sender_key = secp256k1::SecretKey::from_slice(args.sender_key.as_bytes())
            .map_err(|err| format!("invalid sender secret key: {}", err))?;
        let sender = {
            let pubkey = secp256k1::PublicKey::from_secret_key(&SECP256K1, &sender_key);
            let hash160 = blake2b_256(&pubkey.serialize()[..])[0..20].to_vec();
            Script::new_builder()
                .code_hash(SECP256K1_BLAKE160_CODE_HASH.pack())
                .hash_type(ScriptHashType::Type.into())
                .args(Bytes::from(hash160).pack())
                .build()
        };

        // get tx hash, code hash from https://pudge.explorer.nervos.org/scripts#secp256k1_blake160
        let secp256k1_out_point = OutPoint::new(SECP256K1_BLAKE160_TX_HASH.pack(), 0);
        let secp256k1_data_dep = CellDep::new_builder()
            .out_point(secp256k1_out_point)
            .dep_type(DepType::DepGroup.into())
            .build();

        let create_tx = || {
            if args.tx_type == 0 {
                println!("deploy crosschain metadata");
                CrossChain::build_deploy_crosschain_metadata_tx(&args, sender, secp256k1_data_dep)
            } else if args.tx_type == 1 {
                println!("create crosschain tx, from ckb to axon");
                CrossChain::build_ckb_axon_tx(&args, sender, secp256k1_data_dep)
            } else {
                println!("update crosschain metadata");
                CrossChain::build_update_crosschain_metadata_tx(&args, sender, secp256k1_data_dep)
            }
        };

        let tx = create_tx()?;
        // Send transaction
        let json_tx = json_types::TransactionView::from(tx);
        println!("tx: {}", serde_json::to_string_pretty(&json_tx).unwrap());
        let outputs_validator = Some(json_types::OutputsValidator::Passthrough);
        let result = thread::scope(|s| {
            s.spawn(|_| {
                let _tx_hash = CkbRpcClient::new(args.ckb_rpc.as_str())
                    .send_transaction(json_tx.inner, outputs_validator)
                    .expect("send transaction");
            });
        });

        match result {
            Ok(_) => {}
            Err(err) => {
                return Err(Box::new(SendTxError::ExecErr(format!("{:?}", err))));
            }
        }

        println!(">>> tx sent! <<<");

        Ok(())
    }
}

impl CrossChain {
    fn update_input_cells(
        args: &Args,
        base_query: CellQueryOptions,
    ) -> Result<(CellInput, ScriptOpt, u64), Box<dyn StdErr>> {
        let query = {
            let mut query = base_query;
            // query will stop if collected celles contain more capacity than this
            query.min_total_capacity = 20000 * BYTE_SHANNONS;
            query
        };

        let (tx, rx) = channel();

        thread::scope(|s| {
            s.spawn(move |_| {
                let mut cell_collector =
                    DefaultCellCollector::new(args.ckb_indexer.as_str(), args.ckb_rpc.as_str());
                let result = cell_collector.collect_live_cells(&query, false);
                match result {
                    Ok(ok) => {
                        let more_cells = ok.0;
                        println!("live cell size: {}", more_cells.len());
                        if more_cells.is_empty() {
                            tx.send(Err(
                                Box::new(SendTxError::NoLiveCell) as Box<dyn StdErr + Send + Sync>
                            ))
                            .unwrap();
                        } else {
                            let mut max_cap: u64 = more_cells[0].output.capacity().unpack();
                            let mut max_cell = more_cells[0].clone();
                            // println!("{:?}", max_cell);
                            let mut i = 1;
                            while i < more_cells.len() {
                                let cell_cap: u64 = more_cells[i].output.capacity().unpack();
                                // println!("{:?}", more_cells[i]);
                                // println!("{}, {}", cell_cap, max_cap);
                                if cell_cap > max_cap {
                                    max_cap = cell_cap;
                                    max_cell = more_cells[i].clone();
                                }
                                i += 1;
                            }
                            println!("capacity: {:.4E}", max_cap);
                            let input = CellInput::new(max_cell.out_point, 0);
                            let type_script = max_cell.output.type_();
                            tx.send(Ok((input, type_script, max_cap))).unwrap();
                        }
                    }
                    Err(err) => {
                        let err_msg = err.to_string();
                        tx.send(Err(Box::new(SendTxError::CollectorErr(err_msg))
                            as Box<dyn StdErr + Send + Sync>))
                            .unwrap();
                    }
                }
            });
        })
        .unwrap();

        match rx.recv().unwrap() {
            Ok(ok) => Ok(ok),
            Err(err) => Err(err as Box<dyn StdErr>),
        }
    }

    fn build_signed_tx(
        input: CellInput,
        outputs: Vec<CellOutput>,
        outputs_data: Vec<PackedBytes>,
        cell_deps: Vec<CellDep>,
        args: &Args,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let tx = TransactionBuilder::default()
            .input(input)
            .outputs(outputs)
            .outputs_data(outputs_data)
            .cell_deps(cell_deps.clone())
            .build();

        tx.as_advanced_builder()
            .set_cell_deps(Vec::new())
            .cell_deps(cell_deps.into_iter().collect::<Vec<_>>().pack())
            .build();

        let key = Privkey::from_slice(args.sender_key.as_bytes());
        let tx = CrossChain::sign_tx(tx, &key);

        Ok(tx)
    }

    fn build_crosschain_metadata_lock_script(args: PackedBytes) -> Script {
        // crosschain-metadata lock script
        let code_hash = Byte32::from_slice(CROSSCHAIN_METADATA_CODE_HASH.as_bytes()).unwrap();
        Script::new_builder()
            .code_hash(code_hash)
            .hash_type(ScriptHashType::Data.into())
            .args(args)
            .build()
    }

    // crosschain-metadata dep cell
    fn build_crosschain_metadata_dep() -> CellDep {
        let crosschain_metadata_out_point = OutPoint::new(CROSSCHAIN_METADATA_TX_HASH.pack(), 0);
        CellDep::new_builder()
            .out_point(crosschain_metadata_out_point)
            .dep_type(DepType::Code.into())
            .build()
    }

    fn build_update_crosschain_metadata_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let deploy_type = CrossChain::build_script(
            TYPE_ID_CODE_HASH,
            ScriptHashType::Type,
            CROSSCHAIN_DEPLOY_METADATA_TYPE_SCRIPT_ARGS
                .as_bytes()
                .pack(),
        );
        let mut base_query = CellQueryOptions::new_type(deploy_type);
        base_query.data_len_range = Some(ValueRangeOption::new_min(0));
        let (input, type_script, input_cap) = CrossChain::update_input_cells(args, base_query)?;
        // let type_id_script = type_script.to_opt().unwrap();
        // println!("type id {}", type_id_script.calc_script_hash());

        let meta_script = CrossChain::build_crosschain_metadata_lock_script(sender.args());
        // output cell
        let output = CellOutput::new_builder()
            .lock(meta_script)
            .type_(type_script)
            .capacity((input_cap - TX_FEE).pack())
            .build();
        let out_cap: u64 = output.capacity().unpack();
        println!("out cap {}", out_cap);
        let outputs = vec![output];

        let metadata = CrossChain::build_crosschain_metadata();
        let outputs_data = vec![metadata.as_bytes().pack()];

        let cell_deps = vec![
            CrossChain::build_crosschain_metadata_dep(),
            secp256k1_data_dep,
        ];

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_deploy_crosschain_metadata_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let mut base_query = CellQueryOptions::new_lock(sender.clone());
        base_query.data_len_range = Some(ValueRangeOption::new_exact(0));
        let (input, _, input_cap) = CrossChain::update_input_cells(args, base_query)?;

        let meta_script = CrossChain::build_crosschain_metadata_lock_script(sender.args());
        // crosschain-metadata type script
        let type_script = CrossChain::build_type_id_script(&input, 0);
        // output cell
        let output = CellOutput::new_builder()
            .lock(meta_script)
            .type_(type_script)
            .capacity((args.capacity * BYTE_SHANNONS).pack())
            .build();
        let out_cap: u64 = output.capacity().unpack();
        println!("out cap {}", out_cap);

        let remain_cap = input_cap - out_cap - TX_FEE;
        let output1 = CellOutput::new_builder()
            .lock(sender)
            .capacity(remain_cap.pack())
            .build();
        let outputs = vec![output, output1];

        let metadata = CrossChain::build_crosschain_metadata();
        let outputs_data = vec![metadata.as_bytes().pack(), Bytes::new().pack()];

        let cell_deps = vec![
            CrossChain::build_crosschain_metadata_dep(),
            secp256k1_data_dep,
        ];

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_ckb_axon_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let is_sudt = args.sudt_amount > 0.0;
        let mut base_query = CellQueryOptions::new_lock(sender.clone());
        base_query.data_len_range = Some(ValueRangeOption::new_exact(0));
        let (input, _, input_cap) = CrossChain::update_input_cells(args, base_query)?;

        // crosschain-lock lock script
        let lock_args = CROSSCHAIN_DEPLOY_METADATA_TYPEID.as_bytes().pack();
        let lock_script =
            CrossChain::build_script(CROSSCHAIN_LOCK_TYPE_ID, ScriptHashType::Type, lock_args);

        // crosschain-lock cell
        let mut output0 = if is_sudt {
            println!("sudt-amount {}", args.sudt_amount);
            let type_code_hash = SUDT_WAT_CODE_HASH;
            // lock hash to unlock the sudt owner
            let type_args = SUDT_OWNER_LOCK_HASH.pack().as_bytes().pack();
            let type_script =
                CrossChain::build_script(type_code_hash, ScriptHashType::Type, type_args);
            let type_script = ScriptOpt::new_builder().set(Some(type_script)).build();
            CellOutput::new_builder()
                .lock(lock_script)
                .type_(type_script)
                .build_exact_capacity(Capacity::bytes(SUDT_CS_SIZE).unwrap())
                .unwrap()
        } else {
            CellOutput::new_builder()
                .lock(lock_script)
                .build_exact_capacity(Capacity::bytes(0).unwrap())
                .unwrap()
        };

        let output_capacity: Capacity = output0.capacity().unpack();
        let user_input_ckb = Capacity::bytes(args.capacity.try_into().unwrap()).unwrap();
        if output_capacity.as_u64() < user_input_ckb.as_u64() {
            output0 = output0.as_builder().capacity(user_input_ckb.pack()).build();
        }

        let request_code_hash =
            Byte32::from_slice(CROSSCHAIN_REQUEST_CODE_HASH.as_bytes()).unwrap();
        // prepare corsschain request script
        let axon_addr: &[u8; 20] = AXON_ADDR
            .as_bytes()
            .try_into()
            .expect("H160 to [u8; 20] error");

        let cs_real_amount = args.capacity * 9 / 10; // 10% is fee
        println!(
            "original {:.4E}, real {:.4E}",
            args.capacity, cs_real_amount
        );
        let transfer_args = crosschain::Transfer::new_builder()
            .axon_address(axon_addr.into())
            .ckb_amount(cs_real_amount.into())
            .erc20_address((&[1u8; 20]).into())
            .build();

        let request_script = Script::new_builder()
            .code_hash(request_code_hash)
            .hash_type(ScriptHashType::Data1.into())
            .args(transfer_args.as_bytes().pack())
            .build();
        // corsschain-request cell
        let output1 = CellOutput::new_builder()
            .capacity(20_000_000_000.pack())
            .lock(sender.clone())
            .type_(Some(request_script).pack())
            .build();

        let mut outputs = vec![output0.clone(), output1.clone()];
        let lock_data: PackedBytes = if is_sudt {
            let sudt_amount = args.sudt_amount.mul(ETHER as f64) as u128;
            println!("U128: {:10.3e}", sudt_amount);
            sudt_amount.to_le_bytes().pack()
        } else {
            Bytes::new().pack()
        };
        let mut outputs_data: Vec<PackedBytes> = vec![lock_data, Bytes::new().pack()];
        let output0_cap: u64 = output0.capacity().unpack();
        let output1_cap: u64 = output1.capacity().unpack();

        if input_cap < output0_cap + output1_cap + TX_FEE {
            println!(
                "unenough balance input {}, out0 {}, out1 cap {} fee {}",
                input_cap / BYTE_SHANNONS,
                output0_cap / BYTE_SHANNONS,
                output1_cap / BYTE_SHANNONS,
                TX_FEE / BYTE_SHANNONS
            );
            return Err(Box::new(SendTxError::LackBalance));
        }
        let remain_cap: u64 = input_cap - output0_cap - output1_cap - TX_FEE;
        if remain_cap > CELL_MIN_CKB {
            let output2 = CellOutput::new_builder()
                .lock(sender)
                .capacity(remain_cap.pack())
                .build();
            outputs.push(output2);
            outputs_data.push(Bytes::new().pack());
        }

        // crosschain-metadata dep cell
        let contract_out_point = OutPoint::new(CROSSCHAIN_DEPLOY_METADATA_TX_HASH.pack(), 0);
        let contract_dep = CellDep::new_builder()
            .out_point(contract_out_point)
            .dep_type(DepType::Code.into())
            .build();

        // crosschain-request dep cell
        let cs_req_out_point = OutPoint::new(CROSSCHAIN_REQUEST_TX_HASH.pack(), 0);
        let cs_req_dep = CellDep::new_builder()
            .out_point(cs_req_out_point)
            .dep_type(DepType::Code.into())
            .build();

        let mut cell_deps = vec![contract_dep, secp256k1_data_dep, cs_req_dep];
        if is_sudt {
            let sudt_wat_out_point = OutPoint::new(SUDT_WAT_TX_HASH.pack(), 0);
            let sudt_wat_dep = CellDep::new_builder()
                .out_point(sudt_wat_out_point)
                .dep_type(DepType::Code.into())
                .build();
            cell_deps.push(sudt_wat_dep);
        }

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_crosschain_metadata() -> crosschain::Metadata {
        // table Token {
        // ERC20_address: Address,
        // sUDT_typehash: Hash,
        // fee_ratio:     Uint32,
        // }
        let token_config = cs_token_config(&[([0u8; 20], SUDT_OWNER_LOCK_HASH.pack(), 0)]);

        // prepare metadata cell data
        crosschain::Metadata::new_builder()
            .chain_id(CHAIN_ID.into())
            .ckb_fee_ratio(CKB_FEE_RATIO.into())
            .stake_typehash((&Byte32::default()).into())
            .token_config(token_config)
            .build()
    }

    fn build_script(code_hash: H256, hash_type: ScriptHashType, args: PackedBytes) -> Script {
        Script::new_builder()
            .code_hash(code_hash.pack())
            .hash_type(hash_type.into())
            .args(args)
            .build()
    }

    fn build_type_id_script(input: &CellInput, output_index: u64) -> ScriptOpt {
        let mut blake2b = new_blake2b();
        blake2b.update(input.as_slice());
        blake2b.update(&output_index.to_le_bytes());
        let mut ret = [0; 32];
        blake2b.finalize(&mut ret);
        // print and save this for reuse?
        let script_arg = Bytes::from(ret.to_vec()).pack();
        let script = CrossChain::build_script(TYPE_ID_CODE_HASH, ScriptHashType::Type, script_arg);
        println!("type id {}", script.calc_script_hash());

        ScriptOpt::new_builder().set(Some(script)).build()
    }

    fn sign_tx(tx: TransactionView, key: &Privkey) -> TransactionView {
        let mut signed_witnesses: Vec<PackedBytes> = Vec::new();
        let mut blake2b = new_blake2b();
        blake2b.update(&tx.hash().raw_data());
        // digest the first witness
        let witness = WitnessArgs::new_builder()
            .lock(Some(Bytes::from(vec![0u8; 65])).pack())
            .build();
        let witness_size = witness.as_bytes().len() as u64;
        let mut message = [0u8; 32];
        blake2b.update(&witness_size.to_le_bytes());
        blake2b.update(&witness.as_bytes());
        blake2b.finalize(&mut message);
        let message = H256::from(message);
        let sig = key.sign_recoverable(&message).expect("sign");
        signed_witnesses.push(
            witness
                .as_builder()
                .lock(Some(Bytes::from(sig.serialize())).pack())
                .build()
                .as_bytes()
                .pack(),
        );
        tx.as_advanced_builder()
            .set_witnesses(signed_witnesses)
            .build()
    }
}

#[test]
fn get_raw_bytes_from_hex() {
    let hash = Byte32::from_slice(SUDT_OWNER_LOCK_HASH.as_bytes()).unwrap();
    println!("{:?}", hash.as_slice());
}
#[test]
fn sendtx_err() {
    let err = SendTxError::LackBalance;
    println!("{}", err);

    let err = SendTxError::NoLiveCell;
    println!("{}", err);

    let err = SendTxError::CollectorErr("test collector err".to_string());
    println!("{}", err);

    let err = SendTxError::ExecErr("test exec err".to_string());
    println!("{}", err);
}
