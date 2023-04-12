<?php

use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\Entity\Term;

/**
 * Delete partner vocabulary terms, create institution roles.
 */
function parc_governance_map_deploy_9001() {
  if (!Vocabulary::load('institution_roles')) {
    throw new Exception('Institution roles vocabulary not yet created');
  }

  $terms = [
    'Grant Signatory' => '#54d8c3',
    'National Hub Contact Point' => '#f0879c',
    'Work Package Co-leading Organization' => '#3375ff',
    'Coordinator' => '#6d0692',

    'Beneficiary' => '#327d70',
    'Affiliated Partner' => '#d56149',
    'Associated Partner' => '#c593fc',
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
