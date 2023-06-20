<?php

use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\Entity\Term;
use Drupal\Core\File\FileSystemInterface;
use Drupal\file\Entity\File;
use Drupal\media\Entity\Media;

/**
 * Delete partner vocabulary terms, create institution roles.
 */
function parc_interactive_map_deploy_9001() {
  if (!Vocabulary::load('institution_roles')) {
    throw new Exception('Institution roles vocabulary not yet created');
  }

  $terms = [
    'Coordinator' => '#8631a7',
    'Grant Signatory' => '#31d9c4',
    'Affiliated Entity' => '#e45c4d',
    'Associated Partner' => '#f5d475',
    'National Hub Contact Point' => '#f58296',
    'Work Package Co-leading Organization' => '#1c85ff',
  ];

  foreach ($terms as $name => $color) {
    $term = Term::create([
      'name' => $name,
      'vid' => 'institution_roles',
      'field_color' => [
        'color' => strtoupper($color),
        'opacity' => NULL,
      ],
    ]);
    $term->save();
  }
}

/**
 * Create countries.
 */
function parc_interactive_map_deploy_9002() {
  $data = file_get_contents("https://raw.githubusercontent.com/cristiroma/countries/master/data/countries.json");
  $items = json_decode($data, TRUE);
  foreach ($items as $item) {
    $term = Term::create([
      'name' => $item['name'],
      'vid' => 'countries',
      'field_official_name' => $item['name_official'],
      'field_iso2' => $item['code2l'],
      'field_iso3' => $item['code3l'],
    ]);
    $term->save();
  }
}

/**
 * Create partners.
 */
function parc_interactive_map_deploy_9003() {
  $module_path = \Drupal::service('extension.list.module')->getPath('parc_interactive_map');
  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  $node_storage = \Drupal::entityTypeManager()->getStorage('node');

  $default_role = $term_storage->loadByProperties([
    'vid' => 'institution_roles',
    'name' => 'Affiliated Entity',
  ]);
  $default_role = reset($default_role);

  $country_map = [
    'Luxemburg' => 'Luxembourg',
    'Czech Republic' => 'Czechia',
  ];

  $rows = json_decode(file_get_contents($module_path . '/data/partners.json'), TRUE);
  foreach ($rows as $row) {
    $country = $term_storage->loadByProperties([
      'name' => $country_map[$row['country']] ?? $row['country'],
      'vid' => 'countries',
    ]);
    if (!empty($country)) {
      $country = reset($country);
    }

    $roles = [];
    for ($i = 1; $i <= 5; $i++) {
      if (empty($row["role_$i"])) {
        continue;
      }

      $role = $term_storage->loadByProperties([
        'vid' => 'institution_roles',
        'name' => $row["role_$i"],
      ]);
      if (!empty($role)) {
        $role = reset($role);
        $roles[] = $role;
      }
    }

    if (empty($roles)) {
      $roles[] = $default_role;
    }

    [$lat, $long] = explode(',', $row['coordinates']);
    $lat = trim($lat);
    $long = trim($long);

    $node = $node_storage->create([
      'type' => 'institution',
      'title' => $row['name_en'],
      'body' => [
        'format' => 'full_html',
        'value' => $row['desc'],
      ],
      'field_abbreviation' => $row['abbr_en'],
      'field_original_name' => $row['name_nl'],
      'field_original_abbreviation' => $row['abbr_nl'],
      'field_country' => $country,
      'field_city' => $row['city'],
      'field_address_data' => $row['address'],
      'field_coordinates' => [
        'lat' => $lat,
        'lng' => $long,
      ],
      'field_institution_roles' => $roles,
      'field_website' => [
        'uri' => $row['website'],
      ],
      'field_nhcp_name' => $row['nhcp_name'],
      'field_nhcp_email' => $row['nhcp_email'],
    ]);
    $node->save();
  }
}

/**
 * Group PARC countries.
 */
function parc_interactive_map_deploy_9004() {
  $grouped_countries = [
    'Member States' => [
      'Austria',
      'Belgium',
      'Croatia',
      'Cyprus',
      'Czechia',
      'Denmark',
      'Estonia',
      'Finland',
      'France',
      'Germany',
      'Greece',
      'Hungary',
      'Italy',
      'Latvia',
      'Lithuania',
      'Luxembourg',
      'Netherlands',
      'Poland',
      'Portugal',
      'Slovakia',
      'Slovenia',
      'Spain',
      'Sweden',
    ],
    'Associated countries' => [
      'Iceland',
      'Israel',
      'Norway',
      'United Kingdom',
    ],
    'Non-associated third country' => [],
  ];

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  $weight = 0;
  foreach ($grouped_countries as $group => $countries) {
    if (empty($countries)) {
      $non_associated_countries = $term_storage->loadByProperties([
        'vid' => 'countries',
      ]);
      foreach ($non_associated_countries as $country) {
        if (empty($country->get('parent')->entity) && !empty($country->get('field_iso2')->value)) {
          $countries[] = $country->label();
        }
      }
    }

    $group = $term_storage->create([
      'name' => $group,
      'vid' => 'countries',
      'weight' => ++$weight,
    ]);
    $group->save();

    foreach ($countries as $idx => $country) {
      $country_term = $term_storage->loadByProperties([
        'name' => $country,
      ]);
      if (empty($country_term)) {
        continue;
      }

      $country_term = reset($country_term);
      $country_term->set('parent', $group);
      $country_term->set('weight', $idx);
      $country_term->save();
    }
  }
}

/**
 * Create default institution image.
 */
function parc_interactive_map_deploy_9005() {
  $image_path = \Drupal::service('extension.list.module')
    ->getPath('parc_interactive_map') . '/assets/default-image.png';

  /** @var \Drupal\Core\File\FileSystemInterface $fileSystem */
  $fileSystem = \Drupal::service('file_system');

  $destination = 'public://default-image.png';
  $fileSystem->copy($image_path, $destination, FileSystemInterface::EXISTS_REPLACE);

  $file = File::create([
    'uid' => 1,
    'filename' => 'default-image.png',
    'uri' => $destination,
    'status' => 1,
  ]);
  $file->save();

  $media = Media::create([
    'bundle' => 'image',
    'name' => 'Placeholder institution image',
    'uuid' => '15f79f08-9928-44f7-a909-8ff476217a2e',
    'field_media_image' => $file,
  ]);
  $media->save();
}

/**
 * Set field_role_type for institution roles.
 */
function parc_interactive_map_deploy_9006() {
  if (!Vocabulary::load('institution_roles')) {
    throw new Exception('Institution roles vocabulary not yet created');
  }

  $terms = [
    'Coordinator' => 'main_secondary',
    'Grant Signatory' => 'main_secondary',
    'Affiliated Entity' => 'main_secondary',
    'Associated Partner' => 'main_secondary',
    'National Hub Contact Point' => 'additional',
    'Work Package Co-leading Organization' => 'additional',
  ];

  foreach ($terms as $name => $type) {
    $term = \Drupal::entityTypeManager()->getStorage('taxonomy_term')->loadByProperties([
      'name' => $name,
    ]);
    if (empty ($term)) {
      continue;
    }
    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = reset($term);
    $term->get('field_role_type')->value = $type;
    $term->save();
  }
}

/**
 * Add default image to institutions.
 */
function parc_interactive_map_deploy_9007() {
  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $results = $node_storage->getQuery()
    ->condition('type', 'institution')
    ->notExists('field_media_image')
    ->accessCheck(FALSE)
    ->execute();

  $media = \Drupal::entityTypeManager()->getStorage('media')->loadByProperties([
    'uuid' => '15f79f08-9928-44f7-a909-8ff476217a2e',
  ]);
  $media = reset($media);

  foreach ($results as $result) {
    $node = $node_storage->load($result);
    $node->set('field_media_image', $media);
    $node->save();
  }
}

/**
 * Update institution address and text.
 */
function parc_interactive_map_deploy_9008() {
  $module_path = \Drupal::service('extension.list.module')->getPath('parc_interactive_map');
  $rows = json_decode(file_get_contents($module_path . '/data/partners.json'), TRUE);
  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  foreach ($rows as $row) {
    $title = $row['name_en'];
    $node = $node_storage->loadByProperties([
      'title' => $title,
      'type' => 'institution',
    ]);
    if (empty($node)) {
      continue;
    }

    /** @var \Drupal\node\NodeInterface $node */
    $node = reset($node);
    $node->body->value = '';
    $node->set('field_address_data', $row['address']);
    $node->save();
  }
}

/**
 * Re-import partners.
 */
function parc_interactive_map_deploy_9011() {
  $module_path = \Drupal::service('extension.list.module')->getPath('parc_interactive_map');
  if (!file_exists($module_path . '/data/partners-import/partners_19_06_2023.json')) {
    return;
  }
  $entity_type_manager = \Drupal::entityTypeManager();
  $term_storage = $entity_type_manager->getStorage('taxonomy_term');
  $node_storage = $entity_type_manager->getStorage('node');
  /** @var \Drupal\Core\File\FileSystemInterface $file_system */
  $file_system = \Drupal::service('file_system');

  $past_institutions = $node_storage->loadByProperties([
    'type' => 'institution',
  ]);
  foreach ($past_institutions as $node) {
    $node->delete();
  }

  $default_role = $term_storage->loadByProperties([
    'vid' => 'institution_roles',
    'name' => 'Affiliated Entity',
  ]);
  $default_role = reset($default_role);

  $country_map = [
    'Luxemburg' => 'Luxembourg',
    'Czechia' => 'Czech Republic',
  ];

  $default_media = \Drupal::entityTypeManager()->getStorage('media')->loadByProperties([
    'uuid' => '15f79f08-9928-44f7-a909-8ff476217a2e',
  ]);
  $default_media = reset($default_media);

  $rows = json_decode(file_get_contents($module_path . '/data/partners-import/partners_19_06_2023.json'), TRUE);
  foreach ($rows as $row) {
    $country = $term_storage->loadByProperties([
      'name' => $country_map[$row['country']] ?? $row['country'],
      'vid' => 'countries',
    ]);
    $country = reset($country);

    $roles = [];
    for ($i = 1; $i <= 5; $i++) {
      if (empty($row["role_$i"])) {
        continue;
      }

      $role = $term_storage->loadByProperties([
        'vid' => 'institution_roles',
        'name' => $row["role_$i"],
      ]);
      if (!empty($role)) {
        $role = reset($role);
        $roles[] = $role;
      }
    }

    if (empty($roles)) {
      $roles[] = $default_role;
    }

    [$lat, $long] = explode(',', $row['coordinates']);
    $lat = trim($lat);
    $long = trim($long);

    $media = $default_media;
    if (!empty($row['logo_path'])) {
      $image_path = $module_path . '/data/partners-import/' . $row['logo_path'];
      $file_name = basename($image_path);

      $destination = 'public://2023-06/' . $file_name;
      $destination_dir = dirname($destination);
      $file_system->prepareDirectory($destination_dir, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);
      $file_system->copy($image_path, $destination, FileSystemInterface::EXISTS_REPLACE);

      $file = $entity_type_manager->getStorage('file')->create([
        'uid' => 1,
        'filename' => $file_name,
        'uri' => $destination,
        'status' => 1,
      ]);
      $file->save();

      $media = $entity_type_manager->getStorage('media')->create([
        'bundle' => 'image',
        'name' => $row['name_en'] . ' logo',
        'field_media_image' => $file,
      ]);
      $media->save();
    }

    $emails = explode(';', $row['nhcp_email'] ?? []);
    foreach ($emails as &$email) {
      $email = trim($email);
    }

    $node = $node_storage->create([
      'type' => 'institution',
      'title' => $row['name_en'],
      'field_abbreviation' => $row['abbr_en'],
      'field_original_name' => $row['name_nl'],
      'field_original_abbreviation' => $row['abbr_nl'],
      'field_country' => $country,
      'field_city' => $row['city'],
      'field_address_data' => $row['address'],
      'field_coordinates' => [
        'lat' => $lat,
        'lng' => $long,
      ],
      'field_institution_roles' => $roles,
      'field_website' => [
        'uri' => $row['website'],
      ],
      'field_nhcp_name' => $row['nhcp_name'],
      'field_nhcp_email' => $emails,
      'field_media_image' => $media,
    ]);
    $node->save();
  }
}
