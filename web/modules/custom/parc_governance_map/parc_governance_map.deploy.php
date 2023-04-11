<?php

use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\Entity\Term;

/**
 * Delete partner vocabulary terms, create institution types.
 */
function parc_governance_map_deploy_9001() {
  if (!Vocabulary::load('institution_types')) {
    throw new Exception('Institution types vocabulary not yet created');
  }

  $terms = [
    'EU Hubs' => '#54d8c3',
    'National Hubs' => '#f0879c',
    'University' => '#3375ff',
    'Laboratory' => '#6d0692',
    'Research Labs' => '#327d70',
  ];

  foreach ($terms as $name => $color) {
    $term = Term::create([
      'name' => $name,
      'vid' => 'institution_types',
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
function parc_governance_map_deploy_9002() {
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
