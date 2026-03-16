import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Set transparent status bar
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  runApp(const GoksoMobileApp());
}

class GoksoMobileApp extends StatelessWidget {
  const GoksoMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const ProviderScope(
      child: GoksoMobileAppContent(),
    );
  }
}

class GoksoMobileAppContent extends StatelessWidget {
  const GoksoMobileAppContent({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GOKSO Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
