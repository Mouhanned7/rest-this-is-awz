import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class FirebaseConfig {
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const defaultApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const androidApiKey = String.fromEnvironment(
    'FIREBASE_ANDROID_API_KEY',
  );
  static String get apiKey =>
      !kIsWeb &&
          defaultTargetPlatform == TargetPlatform.android &&
          androidApiKey.isNotEmpty
      ? androidApiKey
      : defaultApiKey;
  static const senderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
  );
  static String get appId => kIsWeb
      ? const String.fromEnvironment('FIREBASE_WEB_APP_ID')
      : defaultTargetPlatform == TargetPlatform.iOS
      ? const String.fromEnvironment('FIREBASE_IOS_APP_ID')
      : const String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static bool get isConfigured =>
      [projectId, apiKey, senderId, appId].every((v) => v.isNotEmpty);
  static FirebaseOptions get options => FirebaseOptions(
    apiKey: apiKey,
    appId: appId,
    messagingSenderId: senderId,
    projectId: projectId,
    storageBucket: const String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
    authDomain: const String.fromEnvironment('FIREBASE_AUTH_DOMAIN'),
    iosBundleId: const String.fromEnvironment(
      'FIREBASE_IOS_BUNDLE_ID',
      defaultValue: 'fr.dailychicken.dailyOrders',
    ),
  );
}
