import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'order_archive.dart';
import 'order.dart';
import 'design.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({
    super.key,
    required this.archive,
    required this.openOrder,
  });
  final OrderArchive archive;
  final Widget Function(ArchivedOrder) openOrder;
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late Future<List<ArchivedOrder>> orders;
  String search = '';
  int filter = 0;
  @override
  void initState() {
    super.initState();
    orders = widget.archive.load();
  }

  void reload() => setState(() => orders = widget.archive.load());
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Historique'),
      actions: [
        IconButton(
          onPressed: reload,
          tooltip: 'Actualiser',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SafeArea(
      top: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Le service, en mémoire.',
                        style: TextStyle(
                          fontSize: 30,
                          height: 1.15,
                          fontWeight: FontWeight.w800,
                          color: forest,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Retrouvez les commandes traitées ici, même hors ligne une fois connecté.',
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Nom ou référence',
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: (value) =>
                            setState(() => search = value.trim().toLowerCase()),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children:
                            ['Toutes', 'Confirmées', 'Annulées', 'À vérifier']
                                .asMap()
                                .entries
                                .map(
                                  (entry) => ChoiceChip(
                                    label: Text(
                                      entry.value,
                                      style: TextStyle(
                                        color: filter == entry.key
                                            ? Colors.white
                                            : forest,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    labelStyle: TextStyle(
                                      color: filter == entry.key
                                          ? Colors.white
                                          : forest,
                                    ),
                                    selected: filter == entry.key,
                                    onSelected: (_) =>
                                        setState(() => filter = entry.key),
                                  ),
                                )
                                .toList(),
                      ),
                    ],
                  ),
                ),
              ),
              FutureBuilder<List<ArchivedOrder>>(
                future: orders,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                'Historique indisponible. Le fichier existant a été conservé. Vérifiez le stockage de cet appareil.',
                              ),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: reload,
                                child: const Text('Réessayer'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }
                  if (!snapshot.hasData) {
                    return const SliverToBoxAdapter(
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final visible = snapshot.data!.where((entry) {
                    final matches =
                        '${entry.order.name} ${entry.order.reference}'
                            .toLowerCase()
                            .contains(search);
                    return matches &&
                        (filter == 0 ||
                            filter == 1 &&
                                entry.completed &&
                                entry.action == 'confirm' ||
                            filter == 2 &&
                                entry.completed &&
                                entry.action == 'cancel' ||
                            filter == 3 && !entry.completed);
                  }).toList();
                  if (visible.isEmpty) {
                    return const SliverToBoxAdapter(
                      child: EmptyOrders(
                        title: 'Une page encore blanche.',
                        message:
                            'Les commandes traitées sur cet appareil apparaîtront ici.',
                        icon: Icons.history_rounded,
                      ),
                    );
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    sliver: SliverList.separated(
                      itemCount: visible.length,
                      separatorBuilder: (_, index) =>
                          const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final entry = visible[index], order = entry.order;
                        return Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(24),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => widget.openOrder(entry),
                                ),
                              );
                              if (mounted) reload();
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  StatusPill(
                                    label: entry.label,
                                    icon: !entry.completed
                                        ? Icons.sync_rounded
                                        : entry.action == 'confirm'
                                        ? Icons.check_circle_outline
                                        : Icons.close_rounded,
                                    warning: !entry.completed,
                                    error:
                                        entry.completed &&
                                        entry.action == 'cancel',
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    order.name,
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: ink,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    order.items
                                        .map(
                                          (i) =>
                                              '${i['quantity']} × ${i['name']}',
                                        )
                                        .join(' · '),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: muted),
                                  ),
                                  const Divider(height: 28),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${order.reference}\n${DateFormat('dd/MM/yyyy · HH:mm').format((entry.completedAt ?? entry.savedAt).toLocal())}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: muted,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        euro(order.total),
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                          color: forest,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
