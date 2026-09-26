# Flutter Wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Keep Flutter generated plugin registrant
-keep class io.flutter.plugins.GeneratedPluginRegistrant { *; }

# In-App Purchase (Google Play Billing)
-keep class com.android.billingclient.** { *; }

# Stripe Android SDK
-keep class com.stripe.android.** { *; }

# Firebase & Push Notifications
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keep class com.google.firebase.** { *; }

# General Networking & Reflection Safety
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes Signature

# Flutter Play Core Deferred Components
-dontwarn com.google.android.play.core.**

# Stripe Optional Push Provisioning
-dontwarn com.stripe.android.pushProvisioning.**

