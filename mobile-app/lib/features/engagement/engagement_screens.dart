import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../app/session_scope.dart';
import '../../core/api/api_client.dart';
import '../../shared/ui/loading_skeleton.dart';
import '../marketplace/marketplace_repository.dart';
import 'chat_presentation.dart';
import 'engagement_repository.dart';

/// Private feature state is bound to one verified account and cookie generation.
mixin _AccountBound<T extends StatefulWidget> on State<T> {
  MarketplaceRepository get marketplace;
  late final String? _actor;
  late final String? _role;
  late final int _generation;
  bool get current =>
      mounted &&
      marketplace.session.verified &&
      _actor != null &&
      marketplace.session.identity?.id == _actor &&
      marketplace.session.identity?.role == _role &&
      marketplace.coordinator.generation == _generation;
  EngagementRepository get engagement => EngagementRepository(marketplace);
  void clearPrivateState();

  @override
  void initState() {
    super.initState();
    // Materialize the scope before subscribing to any future account change.
    _actor = marketplace.session.identity?.id;
    _role = marketplace.session.identity?.role;
    _generation = marketplace.coordinator.generation;
    marketplace.session.addListener(_accountChanged);
  }

  void _accountChanged() {
    if (!mounted || current) return;
    setState(clearPrivateState);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || current) return;
      final route = ModalRoute.of(context);
      if (route?.isCurrent == true && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    });
  }

  @override
  void dispose() {
    marketplace.session.removeListener(_accountChanged);
    super.dispose();
  }
}

Widget _sessionEnded() => const Center(
  child: Padding(
    padding: EdgeInsets.all(24),
    child: Text('Your session changed. Sign in again.'),
  ),
);

Widget _error(BuildContext context, String message, VoidCallback? retry) =>
    Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            liveRegion: true,
            child: Text(
              message,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
          if (retry != null)
            TextButton(onPressed: retry, child: const Text('Try again')),
        ],
      ),
    );

String _day(DateTime value) =>
    '${value.day.toString().padLeft(2, '0')}/'
    '${value.month.toString().padLeft(2, '0')}/${value.year}';

Duration _pollDelay(DateTime? retryAt) {
  final wait = retryAt?.difference(DateTime.now()) ?? Duration.zero;
  const minimum = Duration(seconds: 4);
  return wait > minimum ? wait : minimum;
}

DateTime? _retryDeadline(Object failure) =>
    failure is ApiException && failure.failure == ApiFailure.rateLimited
    ? DateTime.now().add(
        Duration(seconds: (failure.retryAfterSeconds ?? 60).clamp(1, 3600)),
      )
    : null;

class MembershipScreen extends StatefulWidget {
  const MembershipScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  State<MembershipScreen> createState() => _MembershipState();
}

class _MembershipState extends State<MembershipScreen>
    with _AccountBound<MembershipScreen> {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  Membership? membership;
  String? error;
  bool loading = true;
  int epoch = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void clearPrivateState() {
    epoch++;
    membership = null;
    error = null;
    loading = false;
  }

  Future<void> _load() async {
    if (!current) return;
    final request = ++epoch;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await engagement.membership();
      if (current && epoch == request) setState(() => membership = result);
    } catch (failure) {
      if (current && epoch == request) {
        setState(() => error = engagementError(failure));
      }
    } finally {
      if (current && epoch == request) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Membership'),
      actions: [
        IconButton(
          onPressed: current && !loading ? _load : null,
          tooltip: 'Refresh membership',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: !current
        ? _sessionEnded()
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Find your next home',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'Browse and chat for free. Owner contact sharing is always optional.',
              ),
              const SizedBox(height: 20),
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Free',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text('₹0 · No expiry'),
                      SizedBox(height: 12),
                      Text(
                        'Browse properties and photos\nSave properties\nChat with owners',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'HomeZone Plus',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        '₹299 · 30 days',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Unlock contact numbers for 10 unique owners who agree to share. '
                        'Reopening the same owner does not use another credit.',
                      ),
                      const SizedBox(height: 12),
                      if (loading)
                        const LoadingSkeleton(
                          layout: SkeletonLayout.rows,
                          itemCount: 1,
                          label: 'Loading membership',
                        ),
                      if (!loading && membership?.active != null) ...[
                        Text(
                          '${membership!.active!.remaining} of ${membership!.active!.limit} contacts remaining',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          'Expires ${_day(membership!.active!.expiresAt.toLocal())}',
                        ),
                      ],
                      const SizedBox(height: 12),
                      const FilledButton(
                        onPressed: null,
                        child: Text('Purchases unavailable in this build'),
                      ),
                      if (membership != null &&
                          membership!.notice.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(membership!.notice),
                      ],
                      if (membership != null && !membership!.eligible)
                        const Text(
                          'Plus contact access is available to Property Buyer accounts.',
                        ),
                      const SizedBox(height: 8),
                      const Text(
                        'Manual renewal. No automatic charges. Contact access does not guarantee a reply, visit or sale.',
                      ),
                    ],
                  ),
                ),
              ),
              if (error != null)
                _error(context, error!, loading ? null : _load),
              const SizedBox(height: 16),
              const Text(
                'Owners can publish, receive enquiries and reply to chats for free. '
                'Pro and sponsored listing plans are not offered in this release.',
              ),
            ],
          ),
  );
}

class ContactPrivacyScreen extends StatefulWidget {
  const ContactPrivacyScreen({super.key, required this.repository});
  final MarketplaceRepository repository;
  @override
  State<ContactPrivacyScreen> createState() => _ContactPrivacyState();
}

class _ContactPrivacyState extends State<ContactPrivacyScreen>
    with _AccountBound<ContactPrivacyScreen> {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  final phone = TextEditingController();
  final form = GlobalKey<FormState>();
  bool loading = true,
      saving = false,
      sharing = false,
      consent = false,
      uncertain = false;
  String? error;
  int epoch = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void clearPrivateState() {
    epoch++;
    phone.clear();
    sharing = false;
    consent = false;
    error = null;
    loading = false;
    saving = false;
  }

  @override
  void dispose() {
    phone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!current || saving) return;
    final request = ++epoch;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await engagement.preferences();
      if (!current || epoch != request) return;
      setState(() {
        phone.text = result.phone ?? '';
        sharing = result.sharingEnabled;
        consent = false;
        uncertain = false;
      });
    } catch (failure) {
      if (current && epoch == request) {
        setState(() => error = engagementError(failure));
      }
    } finally {
      if (current && epoch == request) setState(() => loading = false);
    }
  }

  Future<void> _save() async {
    if (!current ||
        loading ||
        saving ||
        uncertain ||
        !form.currentState!.validate()) {
      return;
    }
    if (sharing && !consent) {
      setState(
        () => error = 'Please confirm permission to share this contact number.',
      );
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await engagement.savePreferences(
        phone: phone.text,
        sharingEnabled: sharing,
        consentAccepted: consent,
      );
      final confirmed = await engagement.preferences();
      if (!mounted || !current) return;
      if (confirmed.sharingEnabled != sharing) {
        throw const ApiException(ApiFailure.invalidResponse);
      }
      setState(() {
        phone.text = confirmed.phone ?? '';
        consent = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contact sharing preferences saved.')),
      );
    } catch (failure) {
      if (current) {
        setState(() {
          uncertain = true;
          error = engagementError(failure, mutation: true);
        });
      }
    } finally {
      if (current) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Contact sharing'),
      actions: [
        IconButton(
          onPressed: current && !loading && !saving ? _load : null,
          tooltip: 'Refresh contact preferences',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: !current
        ? _sessionEnded()
        : loading
        ? const LoadingSkeleton(
            layout: SkeletonLayout.profile,
            padding: EdgeInsets.all(20),
            scrollable: true,
            label: 'Loading contact preferences',
          )
        : Form(
            key: form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Your number, your choice',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Chat stays available without sharing your number. '
                  'This separate contact number does not change your login or profile phone.',
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: phone,
                  enabled: !saving && !uncertain,
                  keyboardType: TextInputType.phone,
                  maxLength: 32,
                  decoration: const InputDecoration(
                    labelText: 'Number approved for sharing',
                    hintText: '+91 mobile number',
                  ),
                  validator: (value) =>
                      sharing &&
                          !RegExp(
                            r'^\+?[0-9\s().-]{8,32}$',
                          ).hasMatch(value?.trim() ?? '')
                      ? 'Enter a valid contact number.'
                      : null,
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Share with Plus members'),
                  subtitle: const Text('Off means chat only.'),
                  value: sharing,
                  onChanged: saving || uncertain
                      ? null
                      : (value) => setState(() {
                          sharing = value;
                          consent = false;
                        }),
                ),
                if (sharing)
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: consent,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text(
                      'Allow active Plus members to view this contact number',
                    ),
                    onChanged: saving || uncertain
                        ? null
                        : (value) => setState(() => consent = value == true),
                  ),
                if (error != null)
                  _error(context, error!, saving ? null : _load),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: saving || uncertain ? null : _save,
                  child: Text(saving ? 'Saving…' : 'Save preferences'),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Turning sharing off prevents future disclosures. Numbers already seen by another person cannot be recalled.',
                ),
              ],
            ),
          ),
  );
}

class PropertyContactActions extends StatefulWidget {
  const PropertyContactActions({
    super.key,
    required this.repository,
    required this.propertyId,
  });
  final MarketplaceRepository repository;
  final String propertyId;
  @override
  State<PropertyContactActions> createState() => _PropertyContactActionsState();
}

class _PropertyContactActionsState extends State<PropertyContactActions>
    with _AccountBound<PropertyContactActions> {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  bool busy = false;
  OwnerContact? contact;
  String? error;
  @override
  void clearPrivateState() {
    contact = null;
    error = null;
    busy = false;
  }

  Future<void> _chat() async {
    if (!current || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final conversation = await engagement.startConversation(
        widget.propertyId,
      );
      if (mounted && current) {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => ConversationScreen(
              repository: marketplace,
              conversation: conversation,
            ),
          ),
        );
      }
    } catch (failure) {
      if (current) {
        setState(() => error = engagementError(failure, mutation: true));
      }
    } finally {
      if (current) setState(() => busy = false);
    }
  }

  Future<void> _contact() async {
    if (!current || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final available = await engagement.contact(widget.propertyId);
      if (!mounted || !current) return;
      if (available.status != 'available' || available.phone != null) {
        setState(() => contact = available);
        return;
      }
      final approved = await showDialog<bool>(
        context: context,
        builder: (dialog) => AlertDialog(
          title: const Text('Unlock owner contact?'),
          content: const Text(
            'This uses one contact credit for a new owner. '
            'Reopening the same owner does not use another credit.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialog, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialog, true),
              child: const Text('Unlock contact'),
            ),
          ],
        ),
      );
      if (approved != true || !current) return;
      final result = await engagement.contact(widget.propertyId, unlock: true);
      if (current) setState(() => contact = result);
    } catch (failure) {
      if (current) {
        setState(() => error = engagementError(failure, mutation: true));
      }
    } finally {
      if (current) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!current) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'Sign in as a Property Buyer to chat or view contact options.',
        ),
      );
    }
    if (marketplace.session.identity?.role != 'USER') {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: busy ? null : _chat,
          icon: const Icon(Icons.chat_bubble_outline),
          label: Text(busy ? 'Please wait…' : 'Chat with Owner'),
        ),
        OutlinedButton.icon(
          onPressed: busy ? null : _contact,
          icon: const Icon(Icons.phone_outlined),
          label: const Text('View Owner’s Number'),
        ),
        if (contact?.phone != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Owner-approved contact'),
                  const SizedBox(height: 8),
                  SelectableText(contact!.phone!),
                  if (contact!.remaining != null)
                    Text('${contact!.remaining} contacts remaining'),
                ],
              ),
            ),
          ),
        if (contact != null && contact!.phone == null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(switch (contact!.status) {
              'plan_required' =>
                'Plus membership is required to unlock owner contact numbers.',
              'limit_reached' =>
                'You have used your contact allowance. You can still chat for free.',
              'self' => 'This is your own listing.',
              _ =>
                'This owner is not sharing a contact number. You can still chat.',
            }),
          ),
        if (contact?.status == 'plan_required' ||
            contact?.status == 'limit_reached')
          TextButton(
            onPressed: busy
                ? null
                : () => Navigator.push<void>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => MembershipScreen(repository: marketplace),
                    ),
                  ),
            child: const Text('View plans'),
          ),
        if (error != null) _error(context, error!, null),
      ],
    );
  }
}

class ConversationListScreen extends StatefulWidget {
  const ConversationListScreen({
    super.key,
    required this.repository,
    this.bottomNavigationBar,
  });
  final MarketplaceRepository repository;
  final Widget? bottomNavigationBar;
  @override
  State<ConversationListScreen> createState() => _ConversationListState();
}

class _ConversationListState extends State<ConversationListScreen>
    with
        _AccountBound<ConversationListScreen>,
        WidgetsBindingObserver,
        RouteAware {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  final search = TextEditingController();
  List<Conversation> conversations = [];
  bool loading = true, reading = false, foreground = true, visible = true;
  String? error;
  int epoch = 0;
  Timer? timer;
  DateTime? retryAt;
  RouteObserver<ModalRoute<dynamic>>? observer;
  ModalRoute<dynamic>? route;
  bool get active =>
      current && foreground && visible && (route?.isCurrent ?? true);
  @override
  void initState() {
    super.initState();
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final nextObserver = SessionScope.observerOf(context);
    final nextRoute = ModalRoute.of(context);
    if (observer != nextObserver || route != nextRoute) {
      observer?.unsubscribe(this);
      observer = nextObserver;
      route = nextRoute;
      if (route != null) observer?.subscribe(this, route!);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    timer?.cancel();
    if (active) _load(quiet: true);
  }

  @override
  void didPushNext() {
    visible = false;
    timer?.cancel();
  }

  @override
  void didPopNext() {
    visible = true;
    if (active) _load(quiet: true);
  }

  @override
  void didPop() {
    visible = false;
    timer?.cancel();
  }

  @override
  void clearPrivateState() {
    epoch++;
    timer?.cancel();
    search.clear();
    conversations = [];
    error = null;
    loading = false;
    reading = false;
    retryAt = null;
  }

  @override
  void dispose() {
    epoch++;
    timer?.cancel();
    search.dispose();
    observer?.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    if (!active || reading) return;
    if (retryAt?.isAfter(DateTime.now()) ?? false) {
      timer?.cancel();
      timer = Timer(_pollDelay(retryAt), () => _load(quiet: true));
      return;
    }
    timer?.cancel();
    reading = true;
    final request = ++epoch;
    setState(() {
      loading = !quiet;
      if (!quiet) error = null;
    });
    try {
      final result = await engagement.conversations();
      if (active && epoch == request) {
        setState(() {
          conversations = result;
          error = null;
          retryAt = null;
        });
      }
    } catch (failure) {
      if (current && epoch == request) {
        setState(() {
          error = engagementError(failure);
          retryAt = _retryDeadline(failure);
        });
      }
    } finally {
      if (mounted && epoch == request) {
        reading = false;
        setState(() => loading = false);
        if (active) {
          timer = Timer(_pollDelay(retryAt), () => _load(quiet: true));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = search.text.trim().toLowerCase();
    final matching = conversations.where(
      (item) =>
          query.isEmpty ||
          item.peerName.toLowerCase().contains(query) ||
          item.propertyTitle.toLowerCase().contains(query),
    );
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLowest,
      appBar: AppBar(
        automaticallyImplyLeading: widget.bottomNavigationBar == null,
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLowest,
        toolbarHeight: 68,
        title: const Text(
          'Messages',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -.6,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh messages',
            onPressed: current && !loading ? _load : null,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: !current
          ? _sessionEnded()
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  child: ChatInboxSearch(
                    controller: search,
                    onChanged: (_) {
                      if (current) setState(() {});
                    },
                  ),
                ),
                Expanded(
                  child: loading && conversations.isEmpty
                      ? const LoadingSkeleton(
                          layout: SkeletonLayout.rows,
                          padding: EdgeInsets.all(20),
                          scrollable: true,
                          label: 'Loading conversations',
                        )
                      : RefreshIndicator.noSpinner(
                          onRefresh: _load,
                          child: ListView(
                            keyboardDismissBehavior:
                                ScrollViewKeyboardDismissBehavior.onDrag,
                            padding: const EdgeInsets.only(bottom: 24),
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              if (error != null)
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                  ),
                                  child: _error(
                                    context,
                                    error!,
                                    loading ? null : _load,
                                  ),
                                ),
                              if (!loading && error == null && matching.isEmpty)
                                ChatInboxEmpty(searching: query.isNotEmpty),
                              for (final conversation in matching)
                                ChatInboxTile(
                                  conversation: conversation,
                                  onTap: () async {
                                    if (!current) return;
                                    FocusScope.of(context).unfocus();
                                    await Navigator.push<void>(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => !current
                                            ? Scaffold(body: _sessionEnded())
                                            : ConversationScreen(
                                                repository: marketplace,
                                                conversation: conversation,
                                              ),
                                      ),
                                    );
                                    if (current) _load();
                                  },
                                ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
      bottomNavigationBar: widget.bottomNavigationBar,
    );
  }
}

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({
    super.key,
    required this.repository,
    required this.conversation,
  });
  final MarketplaceRepository repository;
  final Conversation conversation;
  @override
  State<ConversationScreen> createState() => _ConversationState();
}

class _ConversationState extends State<ConversationScreen>
    with _AccountBound<ConversationScreen>, WidgetsBindingObserver, RouteAware {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  final composer = TextEditingController();
  final messages = <ChatMessage>[];
  final scroll = ScrollController();
  final messageViewport = GlobalKey();
  final messageKeys = <String, GlobalKey>{};
  Timer? timer;
  Timer? receiptTimer;
  DateTime? retryAt;
  DateTime? receiptRetryAt;
  RouteObserver<ModalRoute<dynamic>>? observer;
  ModalRoute<dynamic>? route;
  bool foreground = true,
      visible = true,
      loading = true,
      reading = false,
      sending = false,
      acting = false,
      blocked = false,
      blockedByMe = false,
      hasMore = false,
      receiptsSupported = false,
      receiptWriting = false,
      receiptFrameQueued = false;
  String? cursor, error, receiptError;
  (String, String)? pending;
  int epoch = 0, receiptOffset = 0;
  bool get active =>
      current && foreground && visible && (route?.isCurrent ?? true);
  @override
  void initState() {
    super.initState();
    blocked = widget.conversation.blocked;
    blockedByMe = widget.conversation.blockedByMe;
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    WidgetsBinding.instance.addObserver(this);
    scroll.addListener(_queueReceiptCheck);
    _load(initial: true);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final nextObserver = SessionScope.observerOf(context);
    final nextRoute = ModalRoute.of(context);
    if (observer != nextObserver || route != nextRoute) {
      observer?.unsubscribe(this);
      observer = nextObserver;
      route = nextRoute;
      if (route != null) observer?.subscribe(this, route!);
    }
  }

  void _schedule() {
    timer?.cancel();
    if (!active) return;
    timer = Timer(_pollDelay(retryAt), () {
      if (active) _load();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    timer?.cancel();
    receiptTimer?.cancel();
    if (active) _load();
  }

  @override
  void didChangeMetrics() => _queueReceiptCheck();

  @override
  void didPushNext() {
    visible = false;
    timer?.cancel();
    receiptTimer?.cancel();
  }

  @override
  void didPopNext() {
    visible = true;
    if (active) _load();
  }

  @override
  void didPop() {
    visible = false;
    timer?.cancel();
    receiptTimer?.cancel();
  }

  @override
  void clearPrivateState() {
    epoch++;
    timer?.cancel();
    receiptTimer?.cancel();
    messages.clear();
    messageKeys.clear();
    composer.clear();
    pending = null;
    cursor = null;
    error = null;
    loading = false;
    reading = false;
    sending = false;
    retryAt = null;
    receiptRetryAt = null;
    receiptError = null;
    receiptsSupported = false;
    receiptWriting = false;
    receiptFrameQueued = false;
    receiptOffset = 0;
  }

  @override
  void dispose() {
    epoch++;
    timer?.cancel();
    receiptTimer?.cancel();
    observer?.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    composer.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool initial = false}) async {
    if (!active || reading) return;
    if (retryAt?.isAfter(DateTime.now()) ?? false) {
      _schedule();
      return;
    }
    timer?.cancel();
    reading = true;
    final request = epoch;
    final followLatest =
        !scroll.hasClients || scroll.position.extentAfter < 100;
    if (initial) {
      setState(() {
        loading = true;
        error = null;
        retryAt = null;
      });
    }
    try {
      final result = await engagement.messages(
        widget.conversation.id,
        after: cursor,
        receiptIds: _receiptIds(),
      );
      if (!active || request != epoch) return;
      setState(() {
        for (final message in result.messages) {
          final index = messages.indexWhere((item) => item.id == message.id);
          if (index < 0) {
            messages.add(message);
          } else {
            messages[index] = messages[index].withReceipt(
              MessageReceipt.parse({
                'id': message.id,
                'deliveredAt': message.deliveredAt?.toIso8601String(),
                'readAt': message.readAt?.toIso8601String(),
              }),
            );
          }
        }
        _mergeReceipts(result.receipts);
        _sortMessages();
        if (result.cursor != null) cursor = result.cursor;
        // A send receipt is not a complete history read. Only the server's
        // read cursor can establish which earlier messages have been received.
        hasMore = result.hasMore;
        blocked = result.blocked;
        blockedByMe = result.blockedByMe;
        receiptsSupported = result.receiptsSupported;
        if (blocked || !receiptsSupported) {
          receiptTimer?.cancel();
          receiptError = null;
        }
        error = null;
        retryAt = null;
      });
      if (followLatest) _showLatest();
      _queueReceiptCheck();
    } catch (failure) {
      if (current && request == epoch) {
        setState(() {
          error = engagementError(failure);
          retryAt = _retryDeadline(failure);
        });
      }
    } finally {
      if (mounted && request == epoch) {
        reading = false;
        setState(() => loading = false);
        _schedule();
      }
    }
  }

  void _sortMessages() {
    messages.sort((a, b) {
      final time = a.createdAt.compareTo(b.createdAt);
      return time == 0 ? a.id.compareTo(b.id) : time;
    });
    if (messages.length > 500) messages.removeRange(0, messages.length - 500);
    final ids = messages.map((message) => message.id).toSet();
    messageKeys.removeWhere((id, _) => !ids.contains(id));
  }

  // Receipt changes do not advance the history cursor. Rotate bounded snapshots
  // so an older retained outgoing message can still receive its final status.
  List<String> _receiptIds() {
    if (!receiptsSupported || blocked) return const [];
    final ids = messages
        .where((message) => message.mine && message.readAt == null)
        .map((message) => message.id)
        .toList();
    if (ids.isEmpty) return const [];
    receiptOffset %= ids.length;
    final batch = List.generate(
      min(50, ids.length),
      (index) => ids[(receiptOffset + index) % ids.length],
    );
    receiptOffset = (receiptOffset + batch.length) % ids.length;
    return batch;
  }

  void _mergeReceipts(List<MessageReceipt> receipts) {
    for (final receipt in receipts) {
      final index = messages.indexWhere((message) => message.id == receipt.id);
      if (index >= 0) messages[index] = messages[index].withReceipt(receipt);
    }
  }

  bool _messageVisible(String id) {
    final viewport = messageViewport.currentContext?.findRenderObject();
    final bubble = messageKeys[id]?.currentContext?.findRenderObject();
    if (viewport is! RenderBox ||
        bubble is! RenderBox ||
        !viewport.attached ||
        !bubble.attached ||
        !viewport.hasSize ||
        !bubble.hasSize) {
      return false;
    }
    final viewRect = viewport.localToGlobal(Offset.zero) & viewport.size;
    final bubbleRect = bubble.localToGlobal(Offset.zero) & bubble.size;
    final intersection = viewRect.intersect(bubbleRect);
    // A meaningful part of the bubble must actually be on screen. Merely
    // fetching history, prebuilding a widget or polling in the background is
    // never evidence that the recipient displayed a message.
    return intersection.width > 0 &&
        intersection.height > 0 &&
        intersection.height >= min(bubbleRect.height, viewRect.height) * .6;
  }

  void _queueReceiptCheck() {
    if (!active || !receiptsSupported || blocked || receiptFrameQueued) return;
    receiptFrameQueued = true;
    final request = epoch;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || request != epoch) return;
      receiptFrameQueued = false;
      if (!active || !receiptsSupported || blocked) return;
      receiptTimer?.cancel();
      final wait = receiptRetryAt?.difference(DateTime.now()) ?? Duration.zero;
      receiptTimer = Timer(
        wait > const Duration(milliseconds: 300)
            ? wait
            : const Duration(milliseconds: 300),
        _acknowledgeMessages,
      );
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  Future<void> _acknowledgeMessages() async {
    if (!active || !receiptsSupported || blocked || receiptWriting) return;
    if (receiptRetryAt?.isAfter(DateTime.now()) ?? false) {
      _queueReceiptCheck();
      return;
    }
    final incoming = messages.where((message) => !message.mine).toList();
    final readIds = incoming
        .where(
          (message) => message.readAt == null && _messageVisible(message.id),
        )
        .take(50)
        .map((message) => message.id)
        .toList();
    final deliveredIds = incoming
        .where(
          (message) =>
              message.deliveredAt == null && !readIds.contains(message.id),
        )
        .take(50 - readIds.length)
        .map((message) => message.id)
        .toList();
    if (readIds.isEmpty && deliveredIds.isEmpty) return;
    receiptWriting = true;
    final request = epoch;
    try {
      final receipts = await engagement.acknowledge(
        widget.conversation.id,
        deliveredIds: deliveredIds,
        readIds: readIds,
      );
      if (!active || request != epoch) return;
      setState(() {
        _mergeReceipts(receipts);
        receiptError = null;
        receiptRetryAt = null;
      });
    } catch (failure) {
      if (active && request == epoch) {
        setState(() {
          receiptError = 'Message status updates are delayed.';
          receiptRetryAt =
              _retryDeadline(failure) ??
              DateTime.now().add(const Duration(seconds: 4));
        });
      }
    } finally {
      if (mounted && request == epoch) {
        receiptWriting = false;
        _queueReceiptCheck();
      }
    }
  }

  void _showLatest({int remainingLayouts = 5}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!active ||
          !scroll.hasClients ||
          scroll.position.isScrollingNotifier.value)
        return;
      final target = scroll.position.maxScrollExtent;
      if ((target - scroll.position.pixels).abs() < .5) return;
      scroll.jumpTo(target);
      // Lazy layout refines the extent as variable-height bubbles enter view.
      // Follow those refinements for a bounded number of frames, never a drag.
      if (remainingLayouts > 0)
        _showLatest(remainingLayouts: remainingLayouts - 1);
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  String _messageId() {
    final random = Random.secure();
    final bytes = List.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final hex = bytes
        .map((value) => value.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
        '${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Future<void> _send() async {
    if (!active || sending || acting || blocked) return;
    final text = pending?.$2 ?? composer.text.trim();
    if (text.isEmpty || text.length > 2000) return;
    pending ??= (_messageId(), text);
    final attempt = pending!;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      final message = await engagement.send(
        widget.conversation.id,
        attempt.$2,
        attempt.$1,
      );
      if (!current || pending != attempt) return;
      setState(() {
        if (!messages.any((item) => item.id == message.id)) {
          messages.add(message);
        }
        _sortMessages();
        pending = null;
        composer.clear();
      });
      _showLatest();
    } catch (failure) {
      if (current) {
        setState(() {
          final uncertain =
              failure is! ApiException ||
              {
                ApiFailure.network,
                ApiFailure.timeout,
                ApiFailure.server,
                ApiFailure.invalidResponse,
              }.contains(failure.failure);
          if (!uncertain) pending = null;
          error = uncertain
              ? 'Message confirmation was not received. Use “Retry same message” to safely check or resend this exact message.'
              : engagementError(failure, mutation: true);
        });
      }
    } finally {
      if (current) setState(() => sending = false);
    }
  }

  Future<void> _block() async {
    if (!current || acting || sending) return;
    final next = !blockedByMe;
    setState(() {
      acting = true;
      error = null;
    });
    try {
      await engagement.block(widget.conversation.id, next);
      if (current) await _load();
    } catch (failure) {
      if (current) {
        setState(() => error = engagementError(failure, mutation: true));
      }
    } finally {
      if (current) setState(() => acting = false);
    }
  }

  Future<void> _report() async {
    if (!current || acting || sending) return;
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => _ReportDialog(repository: marketplace),
    );
    if (reason == null || !current) return;
    setState(() {
      acting = true;
      error = null;
    });
    try {
      await engagement.report(widget.conversation.id, reason);
      if (mounted && current) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report submitted for review.')),
        );
      }
    } catch (failure) {
      if (current) {
        setState(() => error = engagementError(failure, mutation: true));
      }
    } finally {
      if (current) setState(() => acting = false);
    }
  }

  Widget _messageStatus(ChatMessage message) {
    final read = message.readAt != null;
    final delivered = message.deliveredAt != null;
    final label = read
        ? 'Read'
        : delivered
        ? 'Delivered'
        : 'Sent';
    return Tooltip(
      message: label,
      child: Icon(
        delivered ? Icons.done_all : Icons.check,
        size: 16,
        color: read
            ? const Color(0xFF168AC0)
            : Theme.of(context).colorScheme.onSurfaceVariant,
        semanticLabel: label,
      ),
    );
  }

  bool _sameDay(DateTime first, DateTime second) {
    final a = first.toLocal(), b = second.toLocal();
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _dateLabel(DateTime value) {
    final now = DateTime.now();
    if (_sameDay(value, now)) return 'Today';
    if (_sameDay(value, DateTime(now.year, now.month, now.day - 1))) {
      return 'Yesterday';
    }
    return _day(value.toLocal());
  }

  List<Widget> _messageItems() {
    final colors = Theme.of(context).colorScheme;
    final result = <Widget>[];
    for (var index = 0; index < messages.length; index++) {
      final message = messages[index];
      final startsDay =
          index == 0 ||
          !_sameDay(messages[index - 1].createdAt, message.createdAt);
      final grouped = !startsDay && messages[index - 1].mine == message.mine;
      if (startsDay) {
        result.add(ChatDateSeparator(label: _dateLabel(message.createdAt)));
      }
      final local = message.createdAt.toLocal();
      final time =
          '${local.hour.toString().padLeft(2, '0')}:'
          '${local.minute.toString().padLeft(2, '0')}';
      result.add(
        Align(
          alignment: message.mine
              ? Alignment.centerRight
              : Alignment.centerLeft,
          child: Container(
            key: messageKeys.putIfAbsent(message.id, GlobalKey.new),
            margin: EdgeInsets.only(top: grouped ? 3 : 9),
            padding: const EdgeInsets.fromLTRB(13, 10, 11, 8),
            constraints: BoxConstraints(
              maxWidth: min(MediaQuery.sizeOf(context).width * .82, 420),
            ),
            decoration: BoxDecoration(
              color: message.mine
                  ? Color.alphaBlend(
                      colors.primary.withValues(alpha: .11),
                      colors.surfaceContainerLowest,
                    )
                  : colors.surfaceContainerLowest,
              border: Border.all(
                color: colors.outlineVariant.withValues(alpha: .35),
                width: .6,
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(!message.mine && grouped ? 5 : 18),
                topRight: Radius.circular(message.mine && grouped ? 5 : 18),
                bottomLeft: Radius.circular(message.mine ? 18 : 5),
                bottomRight: Radius.circular(message.mine ? 5 : 18),
              ),
            ),
            child: Wrap(
              alignment: WrapAlignment.end,
              crossAxisAlignment: WrapCrossAlignment.end,
              spacing: 9,
              runSpacing: 5,
              children: [
                SelectableText(
                  message.body,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.45,
                    color: colors.onSurface,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Tooltip(
                      message: '${_day(local)} $time',
                      child: Text(
                        time,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ),
                    if (message.mine) ...[
                      const SizedBox(width: 4),
                      _messageStatus(message),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }
    return result;
  }

  Widget _propertyContext() {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: colors.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: colors.outlineVariant.withValues(alpha: .55),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.home_work_outlined, size: 23, color: colors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.conversation.propertyTitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      color: colors.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
            child: Text(
              'Never share PINs, passwords or payment codes in chat.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10.5, color: colors.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Color.alphaBlend(
      Theme.of(context).colorScheme.primary.withValues(alpha: .035),
      Theme.of(context).colorScheme.surface,
    ),
    appBar: AppBar(
      toolbarHeight: MediaQuery.textScalerOf(context).scale(1) > 1.4 ? 80 : 64,
      titleSpacing: 0,
      title: current
          ? ChatThreadTitle(peerName: widget.conversation.peerName)
          : const Text('Messages'),
      actions: [
        if (current)
          PopupMenuButton<String>(
            enabled: !acting && !sending,
            onSelected: (value) => value == 'block' ? _block() : _report(),
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'block',
                child: Text(
                  blockedByMe ? 'Unblock this person' : 'Block this person',
                ),
              ),
              const PopupMenuItem(
                value: 'report',
                child: Text('Report conversation'),
              ),
            ],
          ),
      ],
    ),
    body: !current
        ? _sessionEnded()
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (MediaQuery.viewInsetsOf(context).bottom == 0)
                _propertyContext(),
              Expanded(
                child: loading && messages.isEmpty
                    ? const LoadingSkeleton(
                        layout: SkeletonLayout.rows,
                        padding: EdgeInsets.all(20),
                        scrollable: true,
                        label: 'Loading messages',
                      )
                    : ListView(
                        key: messageViewport,
                        controller: scroll,
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
                        children: [
                          if (messages.isEmpty && error == null)
                            const Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                'Start the conversation about this property.',
                              ),
                            ),
                          ..._messageItems(),
                          if (error != null)
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                              ),
                              child: _error(
                                context,
                                error!,
                                reading ? null : _load,
                              ),
                            ),
                          if (receiptError != null && !blocked)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(6, 4, 6, 4),
                              child: Text(
                                receiptError!,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          if (blocked)
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(
                                blockedByMe
                                    ? 'You blocked this conversation. Unblock it from the menu to continue.'
                                    : 'Messaging is unavailable for this conversation.',
                              ),
                            ),
                          if (hasMore)
                            TextButton(
                              onPressed: reading ? null : _load,
                              child: const Text('Load newer messages'),
                            ),
                        ],
                      ),
              ),
              if (!blocked)
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLowest,
                    border: Border(
                      top: BorderSide(
                        color: Theme.of(
                          context,
                        ).colorScheme.outlineVariant.withValues(alpha: .4),
                        width: .6,
                      ),
                    ),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: composer,
                              readOnly: sending || pending != null,
                              minLines: 1,
                              maxLines: 4,
                              maxLength: 2000,
                              keyboardType: TextInputType.multiline,
                              textCapitalization: TextCapitalization.sentences,
                              textInputAction: TextInputAction.newline,
                              style: const TextStyle(fontSize: 15, height: 1.4),
                              decoration: InputDecoration(
                                hintText: 'Message',
                                counterText: '',
                                filled: true,
                                fillColor: Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest
                                    .withValues(alpha: .55),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 18,
                                  vertical: 13,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(26),
                                  borderSide: BorderSide.none,
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(26),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(26),
                                  borderSide: BorderSide(
                                    color: Theme.of(context).colorScheme.primary
                                        .withValues(alpha: .45),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox.square(
                            dimension: 48,
                            child: ValueListenableBuilder<TextEditingValue>(
                              valueListenable: composer,
                              builder: (context, value, _) => IconButton.filled(
                                onPressed:
                                    sending ||
                                        acting ||
                                        loading ||
                                        (pending == null &&
                                            value.text.trim().isEmpty)
                                    ? null
                                    : _send,
                                tooltip: sending
                                    ? 'Sending…'
                                    : pending != null
                                    ? 'Retry same message'
                                    : 'Send message',
                                style: IconButton.styleFrom(
                                  shape: const CircleBorder(),
                                ),
                                icon: Icon(
                                  sending
                                      ? Icons.more_horiz
                                      : pending != null
                                      ? Icons.refresh
                                      : Icons.send_rounded,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
  );
}

class _ReportDialog extends StatefulWidget {
  const _ReportDialog({required this.repository});
  final MarketplaceRepository repository;
  @override
  State<_ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<_ReportDialog>
    with _AccountBound<_ReportDialog> {
  @override
  MarketplaceRepository get marketplace => widget.repository;
  final reason = TextEditingController();
  @override
  void clearPrivateState() => reason.clear();
  @override
  void dispose() {
    reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => !current
      ? const AlertDialog(
          title: Text('Session changed'),
          content: Text('Sign in again to continue.'),
        )
      : AlertDialog(
          title: const Text('Report conversation'),
          content: TextField(
            controller: reason,
            maxLength: 500,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'What happened?'),
            onChanged: (_) => setState(() {}),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: reason.text.trim().length < 3
                  ? null
                  : () => Navigator.pop(context, reason.text.trim()),
              child: const Text('Submit report'),
            ),
          ],
        );
}
