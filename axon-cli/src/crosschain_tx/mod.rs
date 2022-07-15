mod constants;
mod crosschain;
mod helper;

use ckb_crypto::secp::Privkey;
use ckb_fixed_hash_core::H256;
use ckb_hash::{blake2b_256, new_blake2b};
use ckb_sdk::{
    traits::{CellCollector, CellQueryOptions, DefaultCellCollector, ValueRangeOption},
    CkbRpcClient, HumanCapacity, SECP256K1,
};
use ckb_types::{
    bytes::Bytes,
    core::{Capacity, DepType, ScriptHashType, TransactionBuilder, TransactionView},
    h256,
    packed::{
        Byte32, Bytes as OtherBytes, CellDep, CellInput, CellOutput, OutPoint, Script, ScriptOpt,
        WitnessArgs,
    },
    prelude::*,
};
use clap::{Arg, ArgMatches, Command, Parser};
use std::{
    error::Error as StdErr,
    fmt::{self},
    ops::Mul,
    str::FromStr,
    sync::mpsc::channel,
};

use crate::crosschain_tx::{constants::*, helper::*};
use ckb_jsonrpc_types as json_types;
use crossbeam_utils::thread;

#[derive(Parser, Debug, Default)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// deploy crosschain metadata or ckb->axon crosschain tx
    tx_type: u16,

    /// The sender private key (hex string)
    sender_key: H256,

    /// The receiver address
    // #[clap(long, value_name = "ADDRESS")]
    // receiver: Address,

    /// The capacity to transfer (unit: CKB, example: 102.43)
    capacity: HumanCapacity,

    /// CKB rpc url
    ckb_rpc: String,

    /// CKB indexer rpc url
    ckb_indexer: String,

    sudt_amount: f64,
}

/// Send crosschain error.
#[derive(Debug)]
pub enum SendTxError {
    ///
    LackBalance,
    NoLiveCell,
    CollectorErr(String),
}

impl StdErr for SendTxError {}

impl fmt::Display for SendTxError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            SendTxError::LackBalance => return write!(f, "Not Enough balance"),
            SendTxError::NoLiveCell => return write!(f, "No live cell"),
            SendTxError::CollectorErr(e) => return write!(f, "{}", e),
        }
    }
}

pub struct CrossChain {}

impl CrossChain {
    pub fn get_cs_command() -> Command<'static> {
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

    pub fn exec_cs_tx(cs_matches: &ArgMatches) -> Result<(), Box<dyn StdErr>> {
        // Parse arguments
        let args = Args {
            tx_type:     cs_matches
                .value_of("tx-type")
                .unwrap()
                .parse::<u16>()
                .unwrap(),
            sender_key:  H256::from_str(cs_matches.value_of("sender-key").unwrap()).unwrap(),
            capacity:    HumanCapacity(
                cs_matches
                    .value_of("capacity")
                    .unwrap()
                    .parse::<u64>()
                    .unwrap()
                    * BYTE_SHANNONS,
            ),
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
                .code_hash(SIGHASH_TYPE_HASH.pack())
                .hash_type(ScriptHashType::Type.into())
                .args(Bytes::from(hash160).pack())
                .build()
        };

        // get tx hash, code hash from https://pudge.explorer.nervos.org/scripts#secp256k1_blake160
        let lock_secp_tx_hash = Byte32::from_slice(SIGHASH_TX_HASH.as_bytes()).unwrap();
        let secp256k1_out_point = OutPoint::new(lock_secp_tx_hash, 0);
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
        thread::scope(|s| {
            s.spawn(|_| {
                let _tx_hash = CkbRpcClient::new(args.ckb_rpc.as_str())
                    .send_transaction(json_tx.inner, outputs_validator)
                    .expect("send transaction");
            });
        })
        .unwrap();
        println!(">>> tx sent! <<<");

        Ok(())
    }

    fn update_input_cells(
        args: &Args,
        base_query: CellQueryOptions,
    ) -> Result<(CellInput, ScriptOpt, u64), Box<dyn StdErr>> {
        let query = {
            let mut query = base_query;
            // query will stop if collected celles contain more capacity than this
            query.min_total_capacity = 10000 * BYTE_SHANNONS;
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
                            println!("capacity: {}", max_cap);
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
        outputs_data: Vec<OtherBytes>,
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

    fn build_update_crosschain_metadata_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        // args of type script from deploy crosschain metadata tx
        let hash256 = CROSSCHAIN_TYPE_SCRIPT_ARGS_DEBUG.as_bytes().to_vec();
        let deploy_type = Script::new_builder()
            .code_hash(TYPE_ID_CODE_HASH.pack())
            .hash_type(ScriptHashType::Type.into())
            .args(Bytes::from(hash256).pack())
            .build();
        let base_query = {
            let mut query = CellQueryOptions::new_type(deploy_type);
            query.data_len_range = Some(ValueRangeOption::new_min(0));
            query
        };
        let (input, type_script, input_cap) = CrossChain::update_input_cells(args, base_query)?;

        // let type_id_script = type_script.to_opt().unwrap();
        // println!("type id {}", type_id_script.calc_script_hash());

        // crosschain-metadata lock script
        let code_hash = Byte32::from_slice(CROSSCHAIN_METADATA_CODE_HASH.as_bytes()).unwrap();
        let meta_script = Script::new_builder()
            .code_hash(code_hash)
            .hash_type(ScriptHashType::Data.into())
            .args(sender.args())
            .build();
        // output cell
        let tx_fee = 100_000_000;
        let output = CellOutput::new_builder()
            .lock(meta_script)
            .type_(type_script)
            .capacity((input_cap - tx_fee).pack())
            .build();
        let out_cap: u64 = output.capacity().unpack();
        println!("out cap {}", out_cap);
        let outputs = vec![output];

        // prepare metadata cell data
        let metadata = crosschain::Metadata::new_builder()
            .chain_id(cs_uint16(5))
            .ckb_fee_ratio(cs_uint32(100))
            .stake_typehash(cs_hash(&Byte32::default()))
            .token_config(cs_token_config(&[(
                [0u8; 20],
                SUDT_OWNER_LOCK_HASH.pack(),
                0,
            )]))
            .build();
        let outputs_data = vec![metadata.as_bytes().pack()];

        // crosschain-metadata dep cell
        let crosschain_metadata_tx_hash =
            Byte32::from_slice(CROSSCHAIN_METADATA_TX_HASH.as_bytes()).unwrap();
        let crosschain_metadata_out_point = OutPoint::new(crosschain_metadata_tx_hash, 0);
        let crosschain_metadata_dep = CellDep::new_builder()
            .out_point(crosschain_metadata_out_point)
            .dep_type(DepType::Code.into())
            .build();
        let cell_deps = vec![crosschain_metadata_dep, secp256k1_data_dep];

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_deploy_crosschain_metadata_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let base_query = {
            let mut query = CellQueryOptions::new_lock(sender.clone());
            query.data_len_range = Some(ValueRangeOption::new_exact(0));
            query
        };
        let (input, _, input_cap) = CrossChain::update_input_cells(args, base_query)?;

        // crosschain-metadata lock script
        let code_hash = Byte32::from_slice(CROSSCHAIN_METADATA_CODE_HASH.as_bytes()).unwrap();
        let meta_script = Script::new_builder()
            .code_hash(code_hash)
            .hash_type(ScriptHashType::Data.into())
            .args(sender.args())
            .build();
        // crosschain-metadata type script
        let type_script = CrossChain::build_type_id_script(&input, 0);
        // output cell
        let output = CellOutput::new_builder()
            .lock(meta_script)
            .type_(type_script)
            .capacity(args.capacity.0.pack())
            .build();
        let out_cap: u64 = output.capacity().unpack();
        println!("out cap {}", out_cap);

        let remain_cap = input_cap - out_cap - 100_000_000;
        let output1 = CellOutput::new_builder()
            .lock(sender)
            .capacity(remain_cap.pack())
            .build();
        let outputs = vec![output, output1];

        // prepare metadata cell data
        let metadata = crosschain::Metadata::new_builder()
            .chain_id(cs_uint16(5))
            .ckb_fee_ratio(cs_uint32(100))
            .stake_typehash(cs_hash(&Byte32::default()))
            .token_config(cs_token_config(&[(
                [0u8; 20],
                SUDT_OWNER_LOCK_HASH.pack(),
                0,
            )]))
            .build();
        let outputs_data = vec![metadata.as_bytes().pack(), Bytes::new().pack()];

        // crosschain-metadata dep cell
        let crosschain_metadata_tx_hash =
            Byte32::from_slice(CROSSCHAIN_METADATA_TX_HASH.as_bytes()).unwrap();
        let crosschain_metadata_out_point = OutPoint::new(crosschain_metadata_tx_hash, 0);
        let crosschain_metadata_dep = CellDep::new_builder()
            .out_point(crosschain_metadata_out_point)
            .dep_type(DepType::Code.into())
            .build();
        let cell_deps = vec![crosschain_metadata_dep, secp256k1_data_dep];

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_ckb_axon_tx(
        args: &Args,
        sender: Script,
        secp256k1_data_dep: CellDep,
    ) -> Result<TransactionView, Box<dyn StdErr>> {
        let is_usdt = args.sudt_amount > 0.0;
        let base_query = {
            let mut query = CellQueryOptions::new_lock(sender.clone());
            query.data_len_range = Some(ValueRangeOption::new_exact(0));
            query
        };
        let (input, _, input_cap) = CrossChain::update_input_cells(args, base_query)?;

        // crosschain-lock lock script
        // code hash of crosschain-lock
        let lock_code_hash = Byte32::from_slice(CROSSCHAIN_LOCK_TYPE_ID_TEST.as_bytes()).unwrap();
        // type id of cross-chain metadata, the typeid of
        // build_deploy_crosschain_metadata_tx calculated in build_type_id_script
        let lock_args = CROSSCHAIN_DEPLOY_METADATA_TYPEID.as_bytes();
        let lock_script = Script::new_builder()
            .code_hash(lock_code_hash)
            .hash_type(ScriptHashType::Type.into())
            .args(lock_args.pack())
            .build();

        let option_user_input_ckb = Capacity::bytes(500).unwrap();
        // crosschain-lock cell
        let mut output0 = if is_usdt {
            println!("sudt-amount {}", args.sudt_amount);
            let type_code_hash = SUDT_WAT_CODE_HASH.pack();
            // type id of cross-chain metadata, the typeid of
            // build_deploy_crosschain_metadata_tx calculated in build_type_id_script
            let type_args = SUDT_OWNER_LOCK_HASH.pack().as_bytes();
            let type_script = Script::new_builder()
                .code_hash(type_code_hash)
                .hash_type(ScriptHashType::Type.into())
                .args(type_args.pack())
                .build();
            let type_script = ScriptOpt::new_builder().set(Some(type_script)).build();
            let sudt_cs_size = 16;
            CellOutput::new_builder()
                .lock(lock_script)
                .type_(type_script)
                .build_exact_capacity(Capacity::bytes(sudt_cs_size).unwrap())
                .unwrap()
        } else {
            CellOutput::new_builder()
                .lock(lock_script)
                .build_exact_capacity(Capacity::bytes(0).unwrap())
                .unwrap()
        };

        let output_capacity: Capacity = output0.capacity().unpack();
        if output_capacity.as_u64() < option_user_input_ckb.as_u64() {
            output0 = output0
                .as_builder()
                .capacity(option_user_input_ckb.pack())
                .build();
        }

        let request_code_hash =
            Byte32::from_slice(CROSSCHAIN_REQUEST_CODE_HASH.as_bytes()).unwrap();
        // prepare corsschain request script
        let axon_addr: &[u8; 20] = AXON_ADDR
            .as_bytes()
            .try_into()
            .expect("H160 to [u8; 20] error");
        let transfer_args = crosschain::Transfer::new_builder()
            .axon_address(cs_address(axon_addr))
            .ckb_amount(cs_uint64(450))
            .erc20_address(cs_address(&[1u8; 20]))
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
        let lock_data: OtherBytes = if is_usdt {
            let sudt_amount = args.sudt_amount.mul(ETHER as f64) as u128;
            println!("U128: {:10.3e}", sudt_amount);
            sudt_amount.to_le_bytes().pack()
        } else {
            Bytes::new().pack()
        };
        let mut outputs_data: Vec<OtherBytes> = vec![lock_data, Bytes::new().pack()];
        let output0_cap: u64 = output0.capacity().unpack();
        let output1_cap: u64 = output1.capacity().unpack();
        let fee = 100_000_000;

        if input_cap < output0_cap + output1_cap + fee {
            println!(
                "unenough balance input {}, out0 {}, out1 cap {} fee {}",
                input_cap / BYTE_SHANNONS,
                output0_cap / BYTE_SHANNONS,
                output1_cap / BYTE_SHANNONS,
                fee / BYTE_SHANNONS
            );
            return Err(Box::new(SendTxError::LackBalance));
        }
        let remain_cap: u64 = input_cap - output0_cap - output1_cap - fee;
        let min_cap: u64 = 6_100_000_000;
        if remain_cap > min_cap {
            let output2 = CellOutput::new_builder()
                .lock(sender)
                .capacity(remain_cap.pack())
                .build();
            outputs.push(output2);
            outputs_data.push(Bytes::new().pack());
        }

        // crosschain-metadata dep cell
        // get tx hash created by build_deploy_crosschain_metadata_tx
        let crosschain_metadata_tx_hash = CROSSCHAIN_DEPLOY_METADATA_TX_HASH.pack();
        let contract_out_point = OutPoint::new(crosschain_metadata_tx_hash, 0);
        let contract_dep = CellDep::new_builder()
            .out_point(contract_out_point)
            .dep_type(DepType::Code.into())
            .build();

        // crosschain-request dep cell
        let crosschain_request_tx_hash =
            Byte32::from_slice(CROSSCHAIN_REQUEST_TX_HASH.as_bytes()).unwrap();
        let cs_req_out_point = OutPoint::new(crosschain_request_tx_hash, 0);
        let cs_req_dep = CellDep::new_builder()
            .out_point(cs_req_out_point)
            .dep_type(DepType::Code.into())
            .build();

        let mut cell_deps = vec![contract_dep, secp256k1_data_dep, cs_req_dep];
        if is_usdt {
            // this tx hash is fixed provided in rfcs25
            let sudt_wat_tx_hash = Byte32::from_slice(
                h256!("0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769")
                    .as_bytes(),
            )
            .unwrap();
            let sudt_wat_out_point = OutPoint::new(sudt_wat_tx_hash, 0);
            let sudt_wat_dep = CellDep::new_builder()
                .out_point(sudt_wat_out_point)
                .dep_type(DepType::Code.into())
                .build();
            cell_deps.push(sudt_wat_dep);
        }

        CrossChain::build_signed_tx(input, outputs, outputs_data, cell_deps, args)
    }

    fn build_type_id_script(input: &CellInput, output_index: u64) -> ScriptOpt {
        let mut blake2b = new_blake2b();
        blake2b.update(input.as_slice());
        blake2b.update(&output_index.to_le_bytes());
        let mut ret = [0; 32];
        blake2b.finalize(&mut ret);
        // print and save this for reuse?
        let script_arg = Bytes::from(ret.to_vec());
        let code_hash = Byte32::from_slice(TYPE_ID_CODE_HASH.as_bytes()).unwrap();
        let script = Script::new_builder()
            .code_hash(code_hash)
            .hash_type(ScriptHashType::Type.into())
            .args(script_arg.pack())
            .build();

        println!("type id {}", script.calc_script_hash());

        ScriptOpt::new_builder().set(Some(script)).build()
    }

    fn sign_tx(tx: TransactionView, key: &Privkey) -> TransactionView {
        let mut signed_witnesses: Vec<OtherBytes> = Vec::new();
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
