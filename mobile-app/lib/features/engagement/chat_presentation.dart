import 'package:flutter/material.dart';

import '../../theme/design_tokens.dart';
import 'engagement_repository.dart';

class ChatAvatar extends StatelessWidget {
  const ChatAvatar({super.key, required this.name, this.size = 52});

  final String name;
  final double size;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.first.isEmpty) return 'H';
    return [
      parts.first,
      if (parts.length > 1) parts.last,
    ].map((part) => part.characters.first.toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      image: true,
      label: 'Avatar for $name',
      child: ExcludeSemantics(
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                colors.primaryContainer,
                colors.primary.withValues(alpha: .15),
              ],
            ),
            border: Border.all(color: BrandColors.gold.withValues(alpha: .22)),
          ),
          child: Text(
            _initials,
            textScaler: TextScaler.noScaling,
            style: TextStyle(
              color: colors.primary,
              fontSize: size * .31,
              fontWeight: FontWeight.w700,
              letterSpacing: .4,
            ),
          ),
        ),
      ),
    );
  }
}

class ChatInboxTile extends StatelessWidget {
  const ChatInboxTile({
    super.key,
    required this.conversation,
    required this.onTap,
  });

  final Conversation conversation;
  final VoidCallback onTap;

  String _timeLabel(BuildContext context) {
    final updated = conversation.updatedAt.toLocal();
    final now = DateTime.now();
    final day = DateTime(updated.year, updated.month, updated.day);
    final today = DateTime(now.year, now.month, now.day);
    if (day == today) {
      return MaterialLocalizations.of(context).formatTimeOfDay(
        TimeOfDay.fromDateTime(updated),
        alwaysUse24HourFormat: true,
      );
    }
    if (day == DateTime(now.year, now.month, now.day - 1)) return 'Yesterday';
    return MaterialLocalizations.of(context).formatShortDate(updated);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final compact =
        MediaQuery.sizeOf(context).width < 360 ||
        MediaQuery.textScalerOf(context).scale(1) > 1.4;
    final timestamp = Text(
      _timeLabel(context),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: theme.textTheme.labelSmall?.copyWith(
        color: colors.onSurfaceVariant,
        fontSize: 11,
      ),
    );
    return Material(
      color: colors.surfaceContainerLowest,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              child: Row(
                children: [
                  ChatAvatar(name: conversation.peerName),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                conversation.peerName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: colors.onSurface,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            if (!compact) ...[
                              const SizedBox(width: 10),
                              timestamp,
                            ],
                          ],
                        ),
                        const SizedBox(height: 5),
                        Row(
                          children: [
                            Icon(
                              Icons.home_work_outlined,
                              size: 14,
                              color: colors.onSurfaceVariant,
                            ),
                            const SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                conversation.propertyTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colors.onSurfaceVariant,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (conversation.blocked) ...[
                          const SizedBox(height: 5),
                          Row(
                            children: [
                              Icon(
                                Icons.block_outlined,
                                size: 13,
                                color: colors.onSurfaceVariant,
                              ),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(
                                  'Messaging blocked',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: colors.onSurfaceVariant,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (compact) ...[const SizedBox(height: 5), timestamp],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Divider(
            height: 1,
            thickness: .6,
            indent: 82,
            endIndent: 16,
            color: colors.outlineVariant.withValues(alpha: .65),
          ),
        ],
      ),
    );
  }
}

class ChatInboxSearch extends StatelessWidget {
  const ChatInboxSearch({
    super.key,
    required this.controller,
    required this.onChanged,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(28),
      borderSide: BorderSide.none,
    );
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 52),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          textInputAction: TextInputAction.search,
          maxLines: 1,
          maxLength: 160,
          decoration: InputDecoration(
            counterText: '',
            hintText: 'Search conversations',
            hintStyle: TextStyle(color: colors.onSurfaceVariant, fontSize: 14),
            fillColor: colors.surfaceContainerHighest.withValues(alpha: .6),
            prefixIcon: const Icon(Icons.search_rounded, size: 23),
            suffixIcon: value.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Clear search',
                    constraints: const BoxConstraints(
                      minWidth: 48,
                      minHeight: 48,
                    ),
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                    icon: const Icon(Icons.close_rounded, size: 20),
                  ),
            border: border,
            enabledBorder: border,
            focusedBorder: border.copyWith(
              borderSide: BorderSide(
                color: colors.primary.withValues(alpha: .45),
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 18,
              vertical: 14,
            ),
          ),
        ),
      ),
    );
  }
}

class ChatInboxEmpty extends StatelessWidget {
  const ChatInboxEmpty({super.key, this.searching = false});

  final bool searching;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 42),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              color: colors.primary.withValues(alpha: .09),
              border: Border.all(color: colors.primary.withValues(alpha: .09)),
            ),
            child: Icon(
              searching ? Icons.search_rounded : Icons.forum_outlined,
              size: 33,
              color: colors.primary,
            ),
          ),
          const SizedBox(height: 22),
          Text(
            searching ? 'No matching conversations' : 'No conversations yet',
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontSize: 19,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            searching
                ? 'Try a different name or property.'
                : 'Buyers can start a chat from a published property. Owners can reply here for free.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
              fontSize: 13,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

class ChatThreadTitle extends StatelessWidget {
  const ChatThreadTitle({super.key, required this.peerName});

  final String peerName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Semantics(
      label: '$peerName. Property conversation',
      child: ExcludeSemantics(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact =
                MediaQuery.textScalerOf(context).scale(1) > 1.4 &&
                constraints.maxHeight < 72;
            return Row(
              children: [
                ChatAvatar(name: peerName, size: 36),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        peerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: colors.onSurface,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (!compact) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Property conversation',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.onSurfaceVariant,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class ChatDateSeparator extends StatelessWidget {
  const ChatDateSeparator({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 15),
      child: Row(
        children: [
          Expanded(
            child: Divider(color: colors.outlineVariant.withValues(alpha: .5)),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colors.surfaceContainerHighest.withValues(alpha: .75),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: colors.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Divider(color: colors.outlineVariant.withValues(alpha: .5)),
          ),
        ],
      ),
    );
  }
}
