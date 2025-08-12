use anyhow::Result;
use chrono::Local;
use clap::Parser;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
	#[arg(short, long, default_value_t = 8080)]
	port: u16,
}

#[derive(Debug)]
struct ServerStats {
	connections: u32,
	messages_received: u32,
}

impl ServerStats {
	fn new() -> Self {
		Self {
			connections: 0,
			messages_received: 0,
		}
	}
}

#[tokio::main]
async fn main() -> Result<()> {
	let args = Args::parse();
	let addr = format!("127.0.0.1:{}", args.port);
	
	println!("TCP Server starting on {}", addr);
	println!("Press Ctrl+C to stop");
	println!("{}", "=".repeat(50));

	let listener = TcpListener::bind(&addr).await?;
	let stats = Arc::new(Mutex::new(ServerStats::new()));

	// Ctrl+C ハンドリング
	let stats_for_signal = Arc::clone(&stats);
	tokio::spawn(async move {
		tokio::signal::ctrl_c().await.unwrap();
		let stats = stats_for_signal.lock().await;
		println!("\n{}", "=".repeat(50));
		println!("Server shutting down...");
		println!("Total connections: {}", stats.connections);
		println!("Total messages received: {}", stats.messages_received);
		std::process::exit(0);
	});

	loop {
		match listener.accept().await {
			Ok((stream, addr)) => {
				let stats = Arc::clone(&stats);
				tokio::spawn(handle_client(stream, addr.to_string(), stats));
			}
			Err(e) => {
				eprintln!("Failed to accept connection: {}", e);
			}
		}
	}
}

async fn handle_client(
	stream: TcpStream,
	client_addr: String,
	stats: Arc<Mutex<ServerStats>>,
) -> Result<()> {
	{
		let mut stats = stats.lock().await;
		stats.connections += 1;
		println!(
			"[{}] Connection #{} established from {}",
			Local::now().format("%H:%M:%S"),
			stats.connections,
			client_addr
		);
	}

	let mut reader = BufReader::new(stream);
	let mut line = String::new();

	loop {
		line.clear();
		match reader.read_line(&mut line).await {
			Ok(0) => {
				println!(
					"[{}] Client {} disconnected",
					Local::now().format("%H:%M:%S"),
					client_addr
				);
				break;
			}
			Ok(_) => {
				let message = line.trim_end_matches('\r').trim_end_matches('\n');
				if !message.is_empty() {
					let mut stats = stats.lock().await;
					stats.messages_received += 1;
					println!(
						"[{}] Message #{} from {}: \"{}\"",
						Local::now().format("%H:%M:%S"),
						stats.messages_received,
						client_addr,
						message
					);
				}
			}
			Err(e) => {
				eprintln!(
					"[{}] Error reading from {}: {}",
					Local::now().format("%H:%M:%S"),
					client_addr,
					e
				);
				break;
			}
		}
	}

	Ok(())
}