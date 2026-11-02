# Expo's JNI code reads mHybridData, but only Serializable marks it DoNotStrip. Without this, R8 crashes Worklet.execute.
-keep class expo.modules.kotlin.jni.worklets.WorkletNativeRuntime { *; }
