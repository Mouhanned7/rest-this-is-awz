import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'firebase_config.dart';
import 'order.dart';
import 'order_archive.dart';
import 'history_screen.dart';
import 'payment_email.dart';
import 'design.dart';

const cherry = danger;
//ffd

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  String? startupError;
  var ready = false;
  if (FirebaseConfig.isConfigured) {
    try {
      await Firebase.initializeApp(options: FirebaseConfig.options);
      FirebaseFirestore.instance.settings = const Settings(
        persistenceEnabled: false,
      );
      ready = true;
    } catch (_) {
      startupError =
          'Connexion Firebase indisponible. Vérifiez la configuration et le réseau.';
    }
  }
  runApp(DailyApp(ready: ready, startupError: startupError));
}

class DailyApp extends StatelessWidget {
  const DailyApp({super.key, this.ready = false, this.startupError});
  final bool ready;
  final String? startupError;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Daily Orders',
    debugShowCheckedModeBanner: false,
    theme: dailyTheme(),
    home: ready ? const AuthGate() : SetupScreen(error: startupError),
  );
}

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key, this.error});
  final String? error;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Brand(),
                const SizedBox(height: 40),
                const Text(
                  'Votre cuisine.\nEn temps réel.',
                  style: TextStyle(
                    fontSize: 42,
                    height: 1.08,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  error ??
                      'L’application est prête à être reliée à votre restaurant. Complétez la configuration Firebase, puis générez la version connectée.',
                ),
                const SizedBox(height: 28),
                FilledButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const OrdersScreen(demo: true),
                    ),
                  ),
                  icon: const Icon(Icons.preview_outlined),
                  label: const Text('Voir la démonstration'),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Démonstration avec des commandes fictives. Aucun paiement ni donnée client réelle.',
                  style: TextStyle(color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 54,
        height: 54,
        decoration: BoxDecoration(
          color: forest,
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Icon(
          Icons.local_pizza_rounded,
          color: Color(0xFFD8EAA1),
          size: 28,
        ),
      ),
      const SizedBox(width: 14),
      const Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'daily.',
              style: TextStyle(
                fontSize: 29,
                height: 1.1,
                fontWeight: FontWeight.w900,
                letterSpacing: -1,
                color: forest,
              ),
            ),
            SizedBox(height: 3),
            Text(
              'ESPACE RESTAURANT',
              style: TextStyle(
                fontSize: 10,
                letterSpacing: 1.8,
                fontWeight: FontWeight.w700,
                color: muted,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) => StreamBuilder<User?>(
    stream: FirebaseAuth.instance.authStateChanges(),
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting) {
        return const LoadingScreen();
      }
      if (snapshot.data == null) return const LoginScreen();
      return AdminGate(key: ValueKey(snapshot.data!.uid), user: snapshot.data!);
    },
  );
}

class AdminGate extends StatefulWidget {
  const AdminGate({super.key, required this.user});
  final User user;
  @override
  State<AdminGate> createState() => _AdminGateState();
}

class _AdminGateState extends State<AdminGate> {
  late Future<IdTokenResult> role;
  @override
  void initState() {
    super.initState();
    role = widget.user.getIdTokenResult(true);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<IdTokenResult>(
    future: role,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const LoadingScreen();
      }
      if (!snapshot.hasError && snapshot.data?.claims?['dailyAdmin'] == true) {
        return const OrdersScreen();
      }
      return Scaffold(
        appBar: AppBar(title: const Text('Accès responsable')),
        body: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.lock_outline, size: 52, color: cherry),
              const SizedBox(height: 24),
              Text(
                snapshot.hasError
                    ? 'Impossible de vérifier votre accès. Vérifiez votre connexion.'
                    : 'Ce compte n’a pas encore l’accès au restaurant.',
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => setState(() {
                  role = widget.user.getIdTokenResult(true);
                }),
                child: const Text('Réessayer'),
              ),
              TextButton(
                onPressed: () => FirebaseAuth.instance.signOut(),
                child: const Text('Changer de compte'),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(), password = TextEditingController();
  bool busy = false, obscured = true;
  String? error;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> login() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.text.trim(),
        password: password.text,
      );
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        setState(
          () => error = e.code == 'network-request-failed'
              ? 'Vérifiez votre connexion Internet.'
              : e.code == 'too-many-requests'
              ? 'Trop de tentatives. Réessayez plus tard.'
              : 'Connexion impossible. Vérifiez votre e-mail et votre mot de passe.',
        );
      }
    } catch (_) {
      if (mounted) setState(() => error = 'Connexion indisponible. Réessayez.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Form(
              key: form,
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Brand(),
                    const SizedBox(height: 44),
                    const Text(
                      'Bonjour,\nl’équipe Daily.',
                      style: TextStyle(
                        fontSize: 42,
                        height: 1.1,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text('Connectez-vous pour gérer le service.'),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.username],
                      decoration: const InputDecoration(
                        labelText: 'E-mail responsable',
                        prefixIcon: Icon(Icons.alternate_email_rounded),
                      ),
                      validator: (value) => value != null && value.contains('@')
                          ? null
                          : 'Saisissez votre e-mail.',
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: password,
                      obscureText: obscured,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) => login(),
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          tooltip: obscured
                              ? 'Afficher le mot de passe'
                              : 'Masquer le mot de passe',
                          onPressed: () => setState(() => obscured = !obscured),
                          icon: Icon(
                            obscured
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: (value) => value != null && value.isNotEmpty
                          ? null
                          : 'Saisissez votre mot de passe.',
                    ),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          error!,
                          style: const TextStyle(color: cherry),
                        ),
                      ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: busy ? null : login,
                      child: Text(busy ? 'Connexion…' : 'Se connecter'),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Daily Chicken Pizza · Auxerre\nAccès réservé à l’équipe du restaurant.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, this.demo = false});
  final bool demo;
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  int filter = 0, limit = 100;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? receiptSubscription;
  Timer? receiptTimer;
  List<DailyOrder> receiptOrders = [];
  final Set<String> receiptsSent = {};
  bool sendingReceipts = false;
  String? receiptError;
  Stream<QuerySnapshot<Map<String, dynamic>>>? stream;
  @override
  void initState() {
    super.initState();
    connect();
    if (!widget.demo) {
      receiptTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => sendReceipts(),
      );
    }
  }

  @override
  void dispose() {
    receiptSubscription?.cancel();
    receiptTimer?.cancel();
    super.dispose();
  }

  Future<void> sendReceipts() async {
    if (sendingReceipts || !mounted) return;
    sendingReceipts = true;
    String? error;
    for (final order
        in receiptOrders
            .where(
              (o) =>
                  o.paid &&
                  o.data['paymentEmailStatus'] != 'accepted' &&
                  !receiptsSent.contains(o.id),
            )
            .take(10)
            .toList()) {
      if (!mounted) break;
      try {
        await PaymentEmails.send(order);
        receiptsSent.add(order.id);
      } catch (e) {
        error = e.toString().replaceFirst('Exception: ', '');
      }
    }
    sendingReceipts = false;
    if (mounted) setState(() => receiptError = error);
  }

  void connect() {
    if (!widget.demo) {
      receiptSubscription?.cancel();
      stream = FirebaseFirestore.instance
          .collection('dailyOrders')
          .orderBy('orderDate', descending: true)
          .limit(limit)
          .snapshots(includeMetadataChanges: true)
          .asBroadcastStream(onCancel: (subscription) => subscription.cancel());
      receiptSubscription = stream!.listen((snapshot) {
        if (snapshot.metadata.isFromCache) return;
        receiptOrders = snapshot.docs
            .map((d) => DailyOrder(d.id, d.data()))
            .toList();
        sendReceipts();
      }, onError: (Object error) {});
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text(
        'daily. / commandes',
        style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.7),
      ),
      actions: [
        if (!widget.demo)
          IconButton(
            tooltip: 'Historique',
            icon: const Icon(Icons.history),
            onPressed: () {
              final user = FirebaseAuth.instance.currentUser;
              if (user == null) return;
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => HistoryScreen(
                    archive: OrderArchive.forOwner(
                      FirebaseConfig.projectId,
                      user.uid,
                    ),
                    openOrder: (entry) =>
                        OrderDetail(order: entry.order, localEntry: entry),
                  ),
                ),
              );
            },
          ),
        if (!widget.demo)
          IconButton(
            tooltip: 'Se déconnecter',
            onPressed: () async {
              await FirebaseAuth.instance.signOut();
            },
            icon: const Icon(Icons.logout),
          ),
      ],
    ),
    body: widget.demo
        ? content(demoOrders, false)
        : StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: stream,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Les commandes ne sont pas accessibles. Vérifiez la connexion et votre accès Firebase.',
                        ),
                        const SizedBox(height: 18),
                        FilledButton(
                          onPressed: () => setState(connect),
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
                  ),
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              return content(
                snapshot.data!.docs
                    .map((d) => DailyOrder(d.id, d.data()))
                    .toList(),
                snapshot.data!.metadata.isFromCache,
              );
            },
          ),
  );
  Widget content(List<DailyOrder> orders, bool offline) {
    final visible = orders
        .where((o) => filter == 0 || (filter == 1 ? !o.paid : o.paid))
        .toList();
    final paid = orders.where((o) => o.paid).length;
    return SafeArea(
      top: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: forest,
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  widget.demo
                                      ? Icons.science_outlined
                                      : offline
                                      ? Icons.cloud_off_outlined
                                      : Icons.sensors_rounded,
                                  color: const Color(0xFFD8EAA1),
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    widget.demo
                                        ? 'DÉMONSTRATION · données fictives'
                                        : offline
                                        ? 'Hors ligne · données non actualisées'
                                        : 'EN DIRECT · AUXERRE',
                                    style: const TextStyle(
                                      color: Color(0xFFD8EAA1),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'À vous de jouer.',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 30,
                                height: 1.1,
                                letterSpacing: -0.8,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Chaque commande, au bon moment.',
                              style: TextStyle(
                                color: Color(0xFFDCE6DA),
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: metric(
                                    '$paid',
                                    'Payées',
                                    Icons.check_circle_outline,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: metric(
                                    '${orders.length - paid}',
                                    'À régler',
                                    Icons.schedule_rounded,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (receiptError != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: StatusPill(
                            label: 'Reçu en attente : $receiptError',
                            icon: Icons.mail_outline,
                            error: true,
                          ),
                        ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Le service',
                              style: TextStyle(
                                fontSize: 23,
                                fontWeight: FontWeight.w800,
                                color: forest,
                              ),
                            ),
                          ),
                          Text(
                            '${orders.length} chargées',
                            style: const TextStyle(fontSize: 13, color: muted),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: ['Toutes', 'À régler', 'Payées']
                            .asMap()
                            .entries
                            .map(
                              (e) => ChoiceChip(
                                label: Text(
                                  e.value,
                                  style: TextStyle(
                                    color: filter == e.key
                                        ? Colors.white
                                        : forest,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                labelStyle: TextStyle(
                                  color: filter == e.key
                                      ? Colors.white
                                      : forest,
                                ),
                                selected: filter == e.key,
                                onSelected: (_) =>
                                    setState(() => filter = e.key),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ),
              if (visible.isEmpty)
                const SliverToBoxAdapter(
                  child: EmptyOrders(
                    title: 'Tout est à jour.',
                    message:
                        'Les commandes de cette catégorie apparaîtront ici.',
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, index) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final order = visible[index];
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(24),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                OrderDetail(order: order, demo: widget.demo),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 10,
                                runSpacing: 8,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  StatusBadge(paid: order.paid),
                                  Text(
                                    order.reference,
                                    style: const TextStyle(
                                      color: muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      order.name,
                                      style: const TextStyle(
                                        fontSize: 23,
                                        fontWeight: FontWeight.w800,
                                        color: ink,
                                      ),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.arrow_forward_rounded,
                                    color: forest,
                                    size: 22,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                order.items
                                    .map(
                                      (i) => '${i['quantity']} × ${i['name']}',
                                    )
                                    .join(' · '),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: muted),
                              ),
                              const Divider(height: 30),
                              SizedBox(
                                width: double.infinity,
                                child: Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  spacing: 20,
                                  runSpacing: 12,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          order.delivery
                                              ? Icons.delivery_dining_rounded
                                              : Icons.shopping_bag_outlined,
                                          color: forest,
                                          size: 22,
                                        ),
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            order.delivery
                                                ? 'Livraison'
                                                : 'À emporter',
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      euro(order.total),
                                      style: const TextStyle(
                                        fontSize: 23,
                                        fontWeight: FontWeight.w800,
                                        color: forest,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                order.formattedDate,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (!widget.demo && orders.length >= limit)
                SliverPadding(
                  padding: const EdgeInsets.all(20),
                  sliver: SliverToBoxAdapter(
                    child: OutlinedButton(
                      onPressed: () => setState(() {
                        limit += 100;
                        connect();
                      }),
                      child: const Text('Charger les commandes précédentes'),
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
            ],
          ),
        ),
      ),
    );
  }

  Widget metric(String value, String label, IconData icon) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFF3B5142),
      borderRadius: BorderRadius.circular(18),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFFD8EAA1), size: 20),
        const SizedBox(height: 10),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 32,
            height: 1.1,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(color: Color(0xFFDCE6DA), fontSize: 13),
        ),
      ],
    ),
  );
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.paid});
  final bool paid;
  @override
  Widget build(BuildContext context) => StatusPill(
    label: paid ? 'Payée' : 'Juste commandée',
    icon: paid ? Icons.check_circle_outline : Icons.schedule_rounded,
    warning: !paid,
  );
}

class OrderDetail extends StatefulWidget {
  const OrderDetail({
    super.key,
    required this.order,
    this.demo = false,
    this.localEntry,
  });
  final DailyOrder order;
  final bool demo;
  final ArchivedOrder? localEntry;
  @override
  State<OrderDetail> createState() => _OrderDetailState();
}

class _OrderDetailState extends State<OrderDetail> {
  bool busy = false;
  String? actionError;
  Future<void> process(DailyOrder order) async {
    if (busy || widget.demo || widget.localEntry?.completed == true) return;
    const base = String.fromEnvironment('DAILY_API_BASE_URL');
    if (base.isEmpty) {
      setState(
        () => actionError =
            'L’adresse du serveur doit être configurée dans l’application.',
      );
      return;
    }
    final action = order.paid ? 'confirm' : 'cancel';
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          order.paid
              ? 'Confirmer cette commande ?'
              : 'Annuler cette commande ?',
        ),
        content: Text(
          order.paid
              ? 'Le client recevra un e-mail de confirmation. La commande restera dans l’historique de ce téléphone.'
              : 'Le paiement sera fermé et le client recevra un e-mail d’annulation. La commande restera dans l’historique de ce téléphone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Retour'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: order.paid
                ? null
                : FilledButton.styleFrom(backgroundColor: danger),
            child: Text(order.paid ? 'Confirmer' : 'Annuler la commande'),
          ),
        ],
      ),
    );
    if (approved != true || !mounted) return;
    setState(() {
      busy = true;
      actionError = null;
    });
    try {
      final user = FirebaseAuth.instance.currentUser;
      final token = await user?.getIdToken(true);
      if (token == null) {
        throw Exception('Reconnectez-vous au compte responsable.');
      }
      final archive = OrderArchive.forOwner(
        FirebaseConfig.projectId,
        user!.uid,
      );
      await archive.process(order, action, () async {
        if (order.paid) await PaymentEmails.send(order);
        final response = await http
            .post(
              Uri.parse(
                '${base.replaceAll(RegExp(r'/+$'), '')}/api/admin/orders/${order.id}/action',
              ),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({'action': action}),
            )
            .timeout(const Duration(seconds: 85));
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (response.statusCode != 200) {
          throw Exception(data['error'] ?? 'Traitement interrompu. Réessayez.');
        }
        return data['lifecycle'] as String;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              order.paid
                  ? 'Commande confirmée · e-mail transmis'
                  : 'Commande annulée · e-mail transmis',
            ),
          ),
        );
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => actionError = error is FormatException
              ? 'Réponse du serveur indisponible. Réessayez.'
              : error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>>? stream;
  @override
  void initState() {
    super.initState();
    if (!widget.demo && widget.localEntry == null) {
      stream = FirebaseFirestore.instance
          .collection('dailyOrders')
          .doc(widget.order.id)
          .snapshots(includeMetadataChanges: true);
    }
  }

  Future<void> open(Uri uri) async {
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Impossible d’ouvrir ce lien sur cet appareil.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.order.reference)),
    body: widget.demo || widget.localEntry != null
        ? content(widget.order, false)
        : StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
            stream: stream,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Accès interrompu. Revenez à la liste et reconnectez-vous.',
                    ),
                  ),
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.data!.exists) {
                return content(widget.order, false, removed: true);
              }
              return content(
                DailyOrder(snapshot.data!.id, snapshot.data!.data()!),
                snapshot.data!.metadata.isFromCache,
              );
            },
          ),
  );
  Widget content(DailyOrder order, bool offline, {bool removed = false}) {
    final location = asMap(order.customer['location']);
    return SafeArea(
      top: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: ListView(
            padding: const EdgeInsets.all(22),
            children: [
              if (widget.localEntry != null || removed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Text(
                    widget.localEntry != null
                        ? '${widget.localEntry!.label} · historique de cet appareil'
                        : 'Cette commande a quitté la liste active. Son traitement peut être repris sans créer de doublon.',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              if (widget.demo)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Text(
                    'DÉMONSTRATION · aucune commande réelle',
                    style: TextStyle(
                      color: cherry,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              if (offline)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Text(
                    'Hors ligne : le statut peut avoir changé.',
                    style: TextStyle(color: cherry),
                  ),
                ),
              Align(
                alignment: Alignment.centerLeft,
                child: StatusBadge(paid: order.paid),
              ),
              const SizedBox(height: 12),
              Text(order.paymentDetail),
              Text(
                order.formattedDate,
                style: const TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 28),
              Text(
                order.delivery ? 'Livraison' : 'À emporter',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: forest,
                ),
              ),
              const SizedBox(height: 16),
              if (order.data['outsideOpeningHours'] == true)
                const Padding(
                  padding: EdgeInsets.only(bottom: 20),
                  child: StatusPill(
                    label: 'Passée hors ouverture · service de 11 h à 1 h',
                    icon: Icons.schedule,
                    warning: true,
                  ),
                ),
              section('Le client', [
                SelectableText(
                  order.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (order.customer['phone']?.toString().isNotEmpty == true)
                  TextButton.icon(
                    onPressed: () => open(
                      Uri(
                        scheme: 'tel',
                        path: order.customer['phone'].toString(),
                      ),
                    ),
                    icon: const Icon(Icons.call_outlined),
                    label: Text(order.customer['phone'].toString()),
                  ),
                SelectableText(order.customer['email']?.toString() ?? ''),
                if (order.address.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: SelectableText(order.address),
                  ),
                if (location['latitude'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: SelectableText(
                      'GPS : ${location['latitude']}, ${location['longitude']}\nPrécision : environ ${location['accuracy']} m',
                      style: const TextStyle(color: Colors.black54),
                    ),
                  ),
                if (order.mapsUri != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: FilledButton.icon(
                      onPressed: () => open(order.mapsUri!),
                      icon: const Icon(Icons.map_outlined),
                      label: const Text('Ouvrir Google Maps'),
                    ),
                  ),
              ]),
              if (order.note.isNotEmpty)
                section('Consigne du client', [
                  SelectableText(
                    order.note,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ]),
              section(
                'Dans la commande',
                order.items
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    '${item['quantity']} × ${item['name']}',
                                    style: const TextStyle(
                                      fontSize: 21,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  euro(item['lineTotal']),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${euro(item['price'])} / unité',
                              style: const TextStyle(color: Colors.black54),
                            ),
                            if (item['options']?.toString().isNotEmpty == true)
                              SelectableText(item['options'].toString()),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
              section('Le règlement', [
                amount('Sous-total', order.data['subtotal']),
                if ((order.data['pizzaDiscount'] as num? ?? 0) > 0)
                  amount(
                    order.data['promotion']?.toString() ?? 'Remise',
                    -(order.data['pizzaDiscount'] as num),
                  ),
                amount('Livraison', order.data['deliveryFee']),
                const Divider(height: 28),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  spacing: 24,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Text(
                      'Total',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: forest,
                      ),
                    ),
                    Text(
                      euro(order.total),
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: forest,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(order.paymentDetail),
              ]),
              section('Les e-mails', [
                Text('Destinataire : ${order.customer['email'] ?? ''}'),
                const SizedBox(height: 8),
                Text(
                  order.data['paymentEmailStatus'] == 'accepted'
                      ? 'Reçu de paiement transmis au service mail.'
                      : order.paid
                      ? 'Le reçu est envoyé depuis l’application avant la confirmation.'
                      : 'Le reçu sera envoyé après confirmation du paiement Stripe.',
                ),
                if (widget.localEntry?.completed == true)
                  const Text(
                    'E-mail de traitement transmis. Vérifiez aussi les courriers indésirables du destinataire.',
                  ),
              ]),
              if (actionError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    actionError!,
                    style: const TextStyle(color: cherry),
                  ),
                ),
              if (widget.localEntry?.completed != true)
                FilledButton.icon(
                  style: order.paid
                      ? null
                      : FilledButton.styleFrom(backgroundColor: danger),
                  onPressed: busy || offline || widget.demo
                      ? null
                      : () => process(order),
                  icon: Icon(
                    order.paid
                        ? Icons.check_circle_outline
                        : Icons.cancel_outlined,
                  ),
                  label: Text(
                    busy
                        ? 'Traitement en cours…'
                        : removed ||
                              widget.localEntry != null ||
                              order.data['lifecycle'] == 'processing'
                        ? 'Reprendre le traitement'
                        : order.paid
                        ? 'Confirmer la commande payée'
                        : 'Annuler la commande non payée',
                  ),
                ),
              const SizedBox(height: 16),
              Text(
                widget.demo
                    ? 'Action désactivée en démonstration.'
                    : widget.localEntry?.completed == true
                    ? 'Copie conservée sur cet appareil. Les détails restent consultables hors ligne.'
                    : 'Les détails sont sauvegardés sur cet appareil avant le traitement. Après l’e-mail, la commande quitte la liste active et reste dans l’historique.',
                style: const TextStyle(color: Colors.black54),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget amount(String label, Object? value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Expanded(child: Text(label)),
        Text(euro(value)),
      ],
    ),
  );
  Widget section(String title, List<Widget> children) => Container(
    margin: const EdgeInsets.only(bottom: 20),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            color: forest,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    ),
  );
}
