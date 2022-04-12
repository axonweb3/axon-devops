use rustyline::error::ReadlineError;
use rustyline::Editor;
use std::process::Command;

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
                let path = "/home/wenyuan/git/axon-devops/axon-cli";
                rl.add_history_entry(line.as_str());
                println!("Line: {}", line);
                if line == "start" {
                    let s1 = String::from("--file=");
                    let compose_file_path = s1 + path + "/docker-compose.yml";
                    print!("docker compose file: {}", compose_file_path);
                    let output = Command::new("docker-compose")
                        .arg("--file=/home/wenyuan/git/axon-devops/axon-cli/docker-compose.yml")
                        .arg("up")
                        .arg("-d")
                        .output()
                        .expect("start local docker nodes exception!!!");
                    let ls_list = String::from_utf8(output.stdout);
                    println!("{}", ls_list.unwrap());
                    // break;
                } else if line == "stop" {
                    let _output = Command::new("docker")
                        .arg("stop")
                        .arg("axon1")
                        .arg("axon2")
                        .arg("axon3")
                        .arg("axon4")
                        .output()
                        .expect("stop containers exception!!!");
                    // break;
                } else if line == "rm" {
                    let _output = Command::new("docker")
                        .arg("rm")
                        .arg("axon1")
                        .arg("axon2")
                        .arg("axon3")
                        .arg("axon4")
                        .output()
                        .expect("rm containers exception!!!");
                    // break;
                } else if line == "delete" {
                    let data_path = format!("{}/devtools/chain", path);
                    println!("chain data path: {}", data_path);
                    let _output = Command::new("rm")
                        .arg("-rf")
                        .arg(data_path)
                        .output()
                        .expect("delete chain data exception!!!");
                    // break;
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
