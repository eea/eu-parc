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
    'Coordinator' => '#6d0692',
    'Grant Signatory' => '#54d8c3',
    'Affiliated Entity' => '#d56149',
    'Associated Partner' => '#c593fc',
    'National Hub Contact Point' => '#f0879c',
    'Work Package Co-leading Organization' => '#3375ff',
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
