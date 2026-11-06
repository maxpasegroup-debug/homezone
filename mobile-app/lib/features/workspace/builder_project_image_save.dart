import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../marketplace/marketplace_repository.dart';
import 'listing_photo_picker.dart';

/// Owns one explicit save attempt. Uncertain mutations are never replayed.
class BuilderProjectImageSave {
  BuilderProjectImageSave(this.repository, {this.onProgress})
    : _actor = repository.session.identity?.id,
      _generation = repository.coordinator.generation;

  static const fields = [
    'mediaUrls',
    'floorPlanUrls',
    'masterPlanUrl',
    'brochureUrl',
  ];
  static const _statuses = {'DRAFT', 'PUBLISHED', 'ARCHIVED', 'COMPLETED'};
  static final _id = RegExp(r'^[A-Za-z0-9_-]{8,128}$');
  final MarketplaceRepository repository;
  final ValueChanged<String>? onProgress;
  final String? _actor;
  final int _generation;
  bool _started = false;
  bool _saving = false;
  String? _projectId;
  bool get started => _started;
  String? get projectId => _projectId;

  void _requireCurrent() {
    if (_actor == null ||
        !repository.session.verified ||
        repository.session.identity?.id != _actor ||
        repository.session.identity?.role != 'BUILDER' ||
        repository.coordinator.generation != _generation) {
      throw const ApiException(ApiFailure.unauthorized);
    }
  }

  void _progress(String message) {
    _requireCurrent();
    onProgress?.call(message);
  }

  JsonObject _project(JsonObject response) {
    final value = object(response['project']);
    if (response['ok'] == false ||
        value['id'] != _projectId ||
        !_statuses.contains(value['status'])) {
      throw const FormatException('Project confirmation unavailable');
    }
    if (value.containsKey('updatedAt') &&
        (value['updatedAt'] is! String ||
            DateTime.tryParse(value['updatedAt'] as String) == null)) {
      throw const FormatException('Project confirmation unavailable');
    }
    for (final field in fields.take(2)) {
      final urls = value[field];
      if (urls is! List ||
          urls.length > (field == 'mediaUrls' ? 40 : 30) ||
          urls.any((url) => url is! String || url.length > 4096)) {
        throw const FormatException('Image confirmation unavailable');
      }
    }
    for (final field in fields.skip(2)) {
      final url = value[field];
      if (url != null && (url is! String || url.length > 4096)) {
        throw const FormatException('Image confirmation unavailable');
      }
    }
    return value;
  }

  String _uploadedUrl(Object? value) {
    final uri = value is String ? Uri.tryParse(value) : null;
    if (value is! String ||
        value.length > 4096 ||
        value.contains(RegExp(r'[\s\\]')) ||
        uri == null ||
        uri.scheme != 'https' ||
        !uri.hasAuthority ||
        uri.host.isEmpty ||
        uri.port != 443 ||
        uri.userInfo.isNotEmpty ||
        uri.hasFragment) {
      throw const FormatException('Image confirmation unavailable');
    }
    return value;
  }

  void _confirm(JsonObject project, Map<String, List<String>> expected) {
    for (final entry in expected.entries) {
      for (final url in entry.value) {
        final saved = project[entry.key];
        if (saved is List ? !saved.contains(url) : saved != url) {
          throw const FormatException('Stored image confirmation unavailable');
        }
      }
    }
  }

  Future<JsonObject> save({
    required String method,
    required String path,
    required JsonObject payload,
    required Map<String, List<SelectedListingPhoto>> images,
  }) async {
    _requireCurrent();
    if (_started || _saving) {
      throw StateError('Refresh Projects before another save attempt');
    }
    _saving = true;
    try {
      final creating = method == 'POST' && path == '/api/builder/projects';
      final editing = method == 'PATCH'
          ? RegExp(
              r'^/api/builder/projects/([A-Za-z0-9_-]{8,128})$',
            ).firstMatch(path)
          : null;
      if (!creating && editing == null) throw const FormatException();
      if (editing != null) _projectId = editing.group(1);
      final selected = <String, List<SelectedListingPhoto>>{};
      var totalBytes = 0, totalImages = 0;
      for (final entry in images.entries) {
        if (!fields.contains(entry.key) ||
            entry.value.length > (fields.take(2).contains(entry.key) ? 6 : 1)) {
          throw const FormatException('Invalid project images');
        }
        selected[entry.key] = List.unmodifiable(entry.value);
        for (final image in entry.value) {
          if (image.bytes.isEmpty ||
              image.bytes.length > SelectedListingPhoto.maxBytes) {
            throw const FormatException('Invalid project image');
          }
          totalBytes += image.bytes.length;
          totalImages++;
        }
      }
      if (totalImages == 0 || totalBytes > ListingPhotoPicker.maxTotalBytes) {
        throw const FormatException(
          'Choose project images up to 24 MB in total',
        );
      }
      final requestedStatus = payload['status'];
      if (requestedStatus != null && !_statuses.contains(requestedStatus)) {
        throw const FormatException('Invalid project status');
      }
      _progress('Checking project image uploads…');
      final capabilities = await repository.call(
        'GET',
        '/api/mobile/capabilities',
      );
      _requireCurrent();
      final supported = capabilities['builderProjectImageUploadFields'];
      if (capabilities['builderProjectImageUploadConfigured'] != true ||
          supported is! List ||
          fields.any((field) => !supported.contains(field))) {
        throw const BuilderProjectImagesUnavailable();
      }
      final metadata = Map<String, dynamic>.of(payload)
        ..removeWhere((key, _) => fields.contains(key) || key == 'status');
      if (creating) metadata['status'] = 'DRAFT';
      _progress(
        creating ? 'Creating your project draft…' : 'Saving project details…',
      );
      _started = true;
      final saved = await repository.call(method, path, body: metadata);
      _requireCurrent();
      final record = object(saved['project']);
      if (creating &&
          record['id'] is String &&
          _id.hasMatch(record['id'] as String)) {
        _projectId = record['id'] as String;
      }
      if (_projectId == null ||
          saved['ok'] == false ||
          record['id'] != _projectId) {
        throw const FormatException('Project confirmation unavailable');
      }
      final initialProject = _project(saved);
      if (creating && initialProject['status'] != 'DRAFT') {
        throw const FormatException('Project draft confirmation unavailable');
      }
      final projectPath = '/api/builder/projects/$_projectId';
      final confirmed = <String, List<String>>{};
      var completed = 0;
      for (final field in fields) {
        for (final image in selected[field] ?? const <SelectedListingPhoto>[]) {
          _progress(
            'Uploading project image ${completed + 1} of $totalImages…',
          );
          final result = await repository.call(
            'POST',
            '/api/mobile/upload',
            body: {
              'projectId': _projectId,
              'field': field,
              'base64': base64Encode(image.bytes),
            },
          );
          _requireCurrent();
          final url = _uploadedUrl(result['url']);
          final attached = _project(result);
          confirmed.putIfAbsent(field, () => []).add(url);
          _confirm(attached, confirmed);
          completed++;
        }
      }
      _progress('Confirming saved project images…');
      var project = _project(await repository.call('GET', projectPath));
      _requireCurrent();
      _confirm(project, confirmed);
      final status =
          requestedStatus ?? (creating ? 'DRAFT' : project['status']);
      if (project['status'] != status) {
        _progress('Finishing your project…');
        final updated = await repository.call(
          'PATCH',
          projectPath,
          body: {'status': status},
        );
        _requireCurrent();
        _confirm(_project(updated), confirmed);
        project = _project(await repository.call('GET', projectPath));
        _requireCurrent();
        _confirm(project, confirmed);
      }
      if (project['status'] != status) {
        throw const FormatException('Project status unconfirmed');
      }
      return project;
    } finally {
      _saving = false;
    }
  }

  String errorMessage(Object failure) {
    if (_started) {
      return _projectId == null
          ? 'Project confirmation was not received. It may already be saved. Return to Projects and refresh before creating it again.'
          : 'The project save or image uploads could not be fully confirmed. Some changes may already be stored. Return to Projects and refresh this project before uploading or saving again.';
    }
    if (failure is BuilderProjectImagesUnavailable) {
      return 'Project image uploads are unavailable. Your details and selected images are kept on this screen. Try again after the upload service is ready.';
    }
    return 'Project image upload availability could not be confirmed. Check your connection and sign-in, then try again. Your details and selected images are kept on this screen.';
  }
}

class BuilderProjectImagesUnavailable implements Exception {
  const BuilderProjectImagesUnavailable();
}
