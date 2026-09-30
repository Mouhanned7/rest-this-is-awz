import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daily_desktop/main.dart';
import 'package:daily_desktop/order.dart';
import 'package:daily_desktop/design.dart';

void main() {
  test('Only a confirmed payment produces the paid badge', () {
    expect(
      DailyOrder('1', {
        'paymentState': 'paid',
        'paymentStatus': 'pending',
      }).paid,
      false,
    );
    expect(DailyOrder('1', {'paymentStatus': 'paid'}).paid, true);
  });
  test('Maps prefers coordinates and otherwise uses the complete address', () {
    final gps = DailyOrder('1', {
      'customer': {
        'address': 'Auxerre',
        'location': {'latitude': 47.8, 'longitude': 3.57},
      },
    });
    expect(gps.mapsUri!.queryParameters['destination'], '47.8,3.57');
    final address = DailyOrder('2', {
      'customer': {'address': '40 rue Bourneil, Auxerre'},
    });
    expect(
      address.mapsUri!.queryParameters['query'],
      '40 rue Bourneil, Auxerre',
    );
    expect(DailyOrder('3', {}).mapsUri, isNull);
  });
  testWidgets(
    'Unconfigured app is explicit and demo filters show correct statuses',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const DailyApp());
      expect(find.text('Voir la démonstration'), findsOneWidget);
      await tester.tap(find.text('Voir la démonstration'));
      await tester.pumpAndSettle();
      expect(find.text('DÉMONSTRATION · données fictives'), findsOneWidget);
      for (final label in ['Toutes', 'À régler', 'Payées']) {
        final chip = tester.widget<ChoiceChip>(
          find.widgetWithText(ChoiceChip, label),
        );
        expect(
          (chip.label as Text).style!.color,
          label == 'Toutes' ? Colors.white : forest,
        );
      }
      await tester.tap(find.widgetWithText(ChoiceChip, 'Payées'));
      await tester.pumpAndSettle();
      expect(
        (tester
                    .widget<ChoiceChip>(
                      find.widgetWithText(ChoiceChip, 'Toutes'),
                    )
                    .label
                as Text)
            .style!
            .color,
        forest,
      );
      expect(
        (tester
                    .widget<ChoiceChip>(
                      find.widgetWithText(ChoiceChip, 'Payées'),
                    )
                    .label
                as Text)
            .style!
            .color,
        Colors.white,
      );
      expect(find.text('Client de démonstration'), findsOneWidget);
      expect(find.text('Autre client fictif'), findsNothing);
      await tester.tap(find.text('Client de démonstration'));
      await tester.pumpAndSettle();
      expect(find.text('Paiement Stripe confirmé'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('Login requires email and password without contacting Firebase', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
    await tester.tap(find.text('Se connecter'));
    await tester.pump();
    expect(find.text('Saisissez votre e-mail.'), findsOneWidget);
    expect(find.text('Saisissez votre mot de passe.'), findsOneWidget);
  });

  testWidgets(
    'small screens and enlarged text keep orders and actions reachable',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Widget shell(Widget home) => MaterialApp(
        theme: dailyTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: home,
      );
      await tester.pumpWidget(shell(const OrdersScreen(demo: true)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('Client de démonstration'),
        220,
      );
      await Scrollable.ensureVisible(
        tester.element(find.text('Client de démonstration')),
        alignment: 0.3,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Client de démonstration'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('Confirmer la commande payée'),
        220,
        scrollable: find
            .descendant(
              of: find.byType(ListView),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(tester.takeException(), isNull);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Confirmer la commande payée'),
            )
            .onPressed,
        isNull,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(shell(const LoginScreen()));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Se connecter'),
        200,
        scrollable: find
            .descendant(
              of: find.byType(SingleChildScrollView),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
