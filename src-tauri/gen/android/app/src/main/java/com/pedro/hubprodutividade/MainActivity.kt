package com.pedro.hubprodutividade

import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // O Android desenha o app atrás da status bar e da barra de gestos (edge-to-edge é obrigatório
    // a partir do Android 15). Em vez de depender do WebView expor safe-area, o conteúdo é afastado
    // das barras aqui, e o fundo da janela (visível atrás delas) acompanha a superfície do app.
    applySystemBars((resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES)

    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      // ime(): com o teclado aberto, o app encolhe em vez de ficar por baixo dele.
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
  }

  // O tema pode ser escolhido no app (Configurações › Aparência), diferente do sistema: o front
  // avisa por `window.JupiterAndroid.setDarkTheme(...)` para as barras acompanharem.
  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(SystemBarsBridge(), "JupiterAndroid")
  }

  private inner class SystemBarsBridge {
    @JavascriptInterface
    fun setDarkTheme(dark: Boolean) {
      runOnUiThread { applySystemBars(dark) }
    }
  }

  /** Cores iguais a --color-surface do index.css (claro e escuro). */
  private fun applySystemBars(dark: Boolean) {
    window.decorView.setBackgroundColor(if (dark) 0xFF0E1216.toInt() else 0xFFF7F8FA.toInt())
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !dark
      isAppearanceLightNavigationBars = !dark
    }
  }
}
