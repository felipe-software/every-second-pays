const { withMainActivity } = require("expo/config-plugins");

const CALLBACK_IMPORT = "import androidx.activity.OnBackPressedCallback";
const CALLBACK_CALL = "    enableNativePredictiveBackToHome()";
const CALLBACK_HELPER = `

  /**
   * React Native 0.86 installs an always-enabled OnBackPressedCallback on
   * Android 16, which prevents Android's native predictive back-to-home
   * animation. This app has no Android back stack or BackHandler listeners,
   * so the system can own the root back gesture.
   */
  private fun enableNativePredictiveBackToHome() {
    if (Build.VERSION.SDK_INT < 36) return

    runCatching {
      val callbackField = ReactActivity::class.java.getDeclaredField("mBackPressedCallback")
      callbackField.isAccessible = true
      (callbackField.get(this) as OnBackPressedCallback).remove()
    }.onFailure { error ->
      android.util.Log.w(
        "MainActivity",
        "Could not enable the native predictive back-to-home animation",
        error,
      )
    }
  }
`;

function addImport(source) {
  if (source.includes(CALLBACK_IMPORT)) return source;

  const reactActivityImport = "import com.facebook.react.ReactActivity";
  if (!source.includes(reactActivityImport)) {
    throw new Error("Could not find the ReactActivity import in MainActivity.kt");
  }

  return source.replace(
    reactActivityImport,
    `${CALLBACK_IMPORT}\n${reactActivityImport}`,
  );
}

function addOnCreateCall(source) {
  if (source.includes(CALLBACK_CALL.trim())) return source;

  const superOnCreate = "    super.onCreate(null)";
  if (!source.includes(superOnCreate)) {
    throw new Error("Could not find super.onCreate(null) in MainActivity.kt");
  }

  return source.replace(superOnCreate, `${superOnCreate}\n${CALLBACK_CALL}`);
}

function addHelper(source) {
  if (source.includes("private fun enableNativePredictiveBackToHome()")) {
    return source;
  }

  const classEnd = source.lastIndexOf("}");
  if (classEnd === -1) {
    throw new Error("Could not find the MainActivity class closing brace");
  }

  return `${source.slice(0, classEnd).trimEnd()}${CALLBACK_HELPER}\n}`;
}

const withNativePredictiveBack = (config) =>
  withMainActivity(config, (mainActivityConfig) => {
    if (mainActivityConfig.modResults.language !== "kt") {
      throw new Error("with-native-predictive-back requires a Kotlin MainActivity");
    }

    let source = mainActivityConfig.modResults.contents;
    source = addImport(source);
    source = addOnCreateCall(source);
    source = addHelper(source);
    mainActivityConfig.modResults.contents = `${source.trimEnd()}\n`;

    return mainActivityConfig;
  });

module.exports = withNativePredictiveBack;

