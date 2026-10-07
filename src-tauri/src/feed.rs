//! Baixa uma assinatura de calendário (.ics). Fica no Rust porque os servidores de calendário
//! (Outlook, por exemplo) não mandam cabeçalhos CORS, então o WebView não consegue ler a resposta.

use std::time::Duration;

const MAX_FEED_BYTES: usize = 20 * 1024 * 1024;

/// Devolve o texto do arquivo. Erros: "invalid_url", "network", "http_<status>" ou "too_large".
#[tauri::command]
pub async fn fetch_calendar_feed(url: String) -> Result<String, String> {
    if !url.starts_with("https://") {
        return Err("invalid_url".into());
    }
    // O reqwest vem sem provedor de criptografia embutido (rustls-no-provider): sem instalar um antes,
    // montar o cliente entra em pânico e o comando nunca responde. Mesmo cuidado do tauri-plugin-updater.
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "network".to_string())?;
    let response = client
        .get(&url)
        .header("Accept", "text/calendar, text/plain, */*")
        .send()
        .await
        .map_err(|_| "network".to_string())?;
    if !response.status().is_success() {
        return Err(format!("http_{}", response.status().as_u16()));
    }
    let bytes = response.bytes().await.map_err(|_| "network".to_string())?;
    if bytes.len() > MAX_FEED_BYTES {
        return Err("too_large".into());
    }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[cfg(test)]
mod tests {
    use super::fetch_calendar_feed;

    /// Precisa de rede: `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn downloads_a_public_feed() {
        let url = "https://calendar.google.com/calendar/ical/pt.brazilian%23holiday%40group.v.calendar.google.com/public/basic.ics";
        let text = tauri::async_runtime::block_on(fetch_calendar_feed(url.into())).unwrap();
        assert!(text.contains("BEGIN:VCALENDAR"));
    }

    #[test]
    fn rejects_non_https() {
        let result = tauri::async_runtime::block_on(fetch_calendar_feed("http://example.com/a.ics".into()));
        assert_eq!(result, Err("invalid_url".into()));
    }
}
