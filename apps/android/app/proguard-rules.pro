# Proguard rules for AccidentAlarm
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Retrofit & Gson rules
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep,allowobfuscation,allowshrinking class com.accidentalarm.app.data.model.** { *; }
