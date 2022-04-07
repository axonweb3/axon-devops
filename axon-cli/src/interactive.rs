use rustyline::error::ReadlineError;
use rustyline::Editor;
use std::process::Command;  // 引入命令模块

pub fn interactive() {
    // `()` can be used when no completer is required
    let mut rl = Editor::<()>::new();
    if rl.load_history("history.txt").is_err() {
        println!("No previous history.");
    }
    loop {
        let readline = rl.readline(">> ");
        match readline {
            Ok(line) => {
                rl.add_history_entry(line.as_str());
                println!("Line: {}", line);
                if line == "start" {
                    let output = Command::new("/home/wenyuan/git/axon/target/debug/axon")
                    .arg("--config=/home/wenyuan/git/axon/devtools/chain/config.toml")
                    .arg("--genesis=/home/wenyuan/git/axon/devtools/chain/genesis_single_node.json")
                    .output().expect("执行异常，提示");
                    // let output = Command::new("ls").arg("-l").output().expect("执行异常，提示");
                    let ls_list = String::from_utf8(output.stdout);
                    println!("{}", ls_list.unwrap());
                    break;
                } else {
                    println!("please input the right command!");
                }

            }
            Err(ReadlineError::Interrupted) => {
                println!("CTRL-C");
                break;
            }
            Err(ReadlineError::Eof) => {
                println!("CTRL-D");
                break;
            }
            Err(err) => {
                println!("Error: {:?}", err);
                break;
            }
        }
    }
    rl.save_history("history.txt").unwrap();
}
