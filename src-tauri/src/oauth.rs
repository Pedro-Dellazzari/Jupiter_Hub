//! Redirect de loopback para OAuth de app desktop: o navegador do sistema termina a autorização
//! chamando http://127.0.0.1:<porta>/?code=..., e este servidor de uma requisição só entrega a
//! query string para o frontend (que valida o `state` e troca o código pelos tokens).

use std::io::{ErrorKind, Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const WAIT_TIMEOUT: Duration = Duration::from_secs(300);

const DONE_PAGE: &str = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">\
<title>Jupiter Hub</title></head>\
<body style=\"font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0\">\
<p>Tudo certo. Você já pode fechar esta aba e voltar para o Jupiter Hub.</p></body></html>";

#[derive(Default)]
pub struct OAuthLoopback {
    listener: Mutex<Option<TcpListener>>,
    /// Muda a cada início/cancelamento: uma espera antiga percebe e desiste.
    generation: Arc<AtomicU64>,
}

/// Abre o servidor numa porta livre e devolve a porta (para montar o redirect_uri).
#[tauri::command]
pub fn oauth_loopback_start(state: tauri::State<'_, OAuthLoopback>) -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    state.generation.fetch_add(1, Ordering::SeqCst);
    *state.listener.lock().unwrap() = Some(listener);
    Ok(port)
}

/// Espera o redirect e devolve a query string dele. Erros: "cancelled", "timeout" ou a falha de rede.
#[tauri::command]
pub async fn oauth_loopback_wait(state: tauri::State<'_, OAuthLoopback>) -> Result<String, String> {
    let listener = state
        .listener
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "cancelled".to_string())?;
    let generation = state.generation.clone();
    let mine = generation.load(Ordering::SeqCst);
    tauri::async_runtime::spawn_blocking(move || wait_for_redirect(listener, generation, mine))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn oauth_loopback_cancel(state: tauri::State<'_, OAuthLoopback>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
    state.listener.lock().unwrap().take();
}

fn wait_for_redirect(
    listener: TcpListener,
    generation: Arc<AtomicU64>,
    mine: u64,
) -> Result<String, String> {
    let deadline = Instant::now() + WAIT_TIMEOUT;
    loop {
        if generation.load(Ordering::SeqCst) != mine {
            return Err("cancelled".into());
        }
        if Instant::now() > deadline {
            return Err("timeout".into());
        }
        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_nonblocking(false);
                let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                let mut buffer = [0u8; 8192];
                let read = stream.read(&mut buffer).unwrap_or(0);
                let request = String::from_utf8_lossy(&buffer[..read]);
                // "GET /?code=...&state=... HTTP/1.1"
                let target = request.split_whitespace().nth(1).unwrap_or("");
                let query = target.split_once('?').map(|(_, q)| q).unwrap_or("");
                // O navegador também pede /favicon.ico e afins: só o redirect encerra a espera.
                let is_redirect = query
                    .split('&')
                    .any(|pair| pair.starts_with("code=") || pair.starts_with("error="));
                let (status, body) = if is_redirect {
                    ("200 OK", DONE_PAGE)
                } else {
                    ("404 Not Found", "")
                };
                let response = format!(
                    "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();
                if is_redirect {
                    return Ok(query.to_string());
                }
            }
            Err(err) if err.kind() == ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(err) => return Err(err.to_string()),
        }
    }
}
