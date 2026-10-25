/** Rodando no app Android/iOS (WebView do Tauri mobile), e não no desktop. */
export const isMobilePlatform = /android|iphone|ipad/i.test(navigator.userAgent);
