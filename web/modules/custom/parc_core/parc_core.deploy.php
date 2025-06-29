<?php

use Drupal\Core\File\FileSystemInterface;
use Drupal\file\Entity\File;
use Drupal\media\Entity\Media;
use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\Entity\Term;
use Drupal\menu_link_content\Entity\MenuLinkContent;

/**
 * Create default event image.
 */
function parc_core_deploy_9001() {
  $image_path = \Drupal::service('extension.list.module')
    ->getPath('parc_core') . '/assets/default-event-image.png';

  /** @var \Drupal\Core\File\FileSystemInterface $file_system */
  $file_system = \Drupal::service('file_system');

  $destination = 'public://default-event-image.png';
  $file_system->copy($image_path, $destination, FileSystemInterface::EXISTS_REPLACE);

  $file = File::create([
    'uid' => 1,
    'filename' => 'default-event-image.png',
    'uri' => $destination,
    'status' => 1,
  ]);
  $file->save();

  $media = Media::create([
    'bundle' => 'image',
    'name' => 'Placeholder event image',
    'uuid' => '8b7d7c71-5927-4114-a87c-5c68bdea69d3',
    'field_media_image' => $file,
  ]);
  $media->save();

  $events = \Drupal::entityTypeManager()->getStorage('node')
    ->loadByProperties([
      'type' => 'events',
    ]);
  foreach ($events as $event) {
    $event->set('field_media_image', $media);
    $event->save();
  }
}

/**
 * Create default image for publication, page, landing page.
 */
function parc_core_deploy_9002() {
  $bundles = [
    'publication' => [
      'media' => '1b0167ab-b3b6-4fdc-a745-0182feabb2f4',
      'field' => 'field_cover',
      'title' => 'Publication default cover',
      'uuid' => '096ec8be-f5d2-4021-96dc-ece0243bc80d',
    ],
    'basic_page' => [
      'media' => 'ad776013-14da-4a86-ab4f-0c0ef3cecff4',
      'field' => 'field_banner',
      'title' => 'Basic page default banner',
      'uuid' => '67db440f-2181-4526-8e7e-ad1633ce9c56',
    ],
    'page' => [
      'media' => 'ad776013-14da-4a86-ab4f-0c0ef3cecff4',
      'field' => 'field_media_image',
      'title' => 'Landing page default image',
      'uuid' => '1b631bd0-31f7-4c77-b319-65c41ea6afb7',
    ],
  ];

  foreach ($bundles as $bundle => $info) {
    $media = \Drupal::entityTypeManager()->getStorage('media')->loadByProperties([
      'uuid' => $info['media'],
    ]);

    if (empty($media)) {
      continue;
    }

    /** @var \Drupal\media\MediaInterface $media */
    $media = reset($media);

    $new_media = Media::create([
      'bundle' => 'image',
      'name' => $info['title'],
      'field_media_image' => $media->get('field_media_image')->entity,
      'uuid' => $info['uuid'],
    ]);
    $new_media->save();

    $nodes = \Drupal::entityTypeManager()->getStorage('node')->getQuery()
      ->condition('type', $bundle)
      ->accessCheck(FALSE)
      ->notExists($info['field'])
      ->execute();

    foreach ($nodes as $node) {
      $node = Node::load($node);
      if (!$node) {
        continue;
      }

      $node->set($info['field'], $new_media);
      $node->save();
    }
  }
}

/**
 * Set deliverable nodes type to deliverable type D.
 */
function parc_core_deploy_9003() {
  $nodes = \Drupal::entityTypeManager()->getStorage('node')->getQuery()
    ->condition('type', 'deliverables')
    ->accessCheck(FALSE)
    ->execute();

  foreach ($nodes as $node) {
    $node = Node::load($node);
    if (!$node) {
      continue;
    }

    $node->set('field_deliverable_type', 'D');
    $node->save();
  }
}

/**
 * Remove 'D' from deliverable order.
 */
function parc_core_deploy_9004() {
  $terms = \Drupal::entityTypeManager()->getStorage('taxonomy_term')->loadTree('deliverables');
  foreach ($terms as $term) {
    $term = Term::load($term->tid);
    $order = $term->get('field_order')->value;
    $order = str_replace("D", "", $order);
    $term->set('field_order', $order);
    $term->save();
  }
}

/**
 * Set field_alternate_color for deliverables taxonomy.
 */
function parc_core_deploy_9005() {
  $colors = [
    '1' => [
      'color' => '#00564C',
      'alternate_color' => '#028475',
    ],
    '2' => [
      'color' => '#F98555',
      'alternate_color' => '#F49C77',
    ],
    '3' => [
      'color' => '#480363',
      'alternate_color' => '#870FB6',
    ],
    '4' => [
      'color' => '#B43D18',
      'alternate_color' => '#D97150',
    ],
    '5' => [
      'color' => '#1E2094',
      'alternate_color' => '#5658E7',
    ],
    '6' => [
      'color' => '#1B90B1',
      'alternate_color' => '#6CBFD7',
    ],
    '7' => [
      'color' => '#890223',
      'alternate_color' => '#C04B67',
    ],
    '8' => [
      'color' => '#D21A46',
      'alternate_color' => '#F57896',
    ],
    '9' => [
      'color' => '#605601',
      'alternate_color' => '#9B8D0C',
    ],
  ];

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  foreach ($colors as $work_package => $settings) {
    $term = $term_storage->loadByProperties([
      'vid' => 'deliverables',
      'name' => "Work Package $work_package",
    ]);
    if (empty($term)) {
      continue;
    }

    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = reset($term);
    $term->set('field_color', [
      'color' => $settings['color'],
    ]);
    $term->set('field_alternate_color', [
      'color' => $settings['alternate_color'],
    ]);
    $term->save();
  }
}

/**
 * Create lab terms.
 */
function parc_core_deploy_9006() {
  if (!Vocabulary::load('lab_types')) {
    throw new Exception('Lab types vocabulary not yet created');
  }

  $terms = [
    'PARC member' => [
      'color' => '#008475',
      'weight' => 0,
      'description' => '',
    ],
    'External laboratory' => [
      'color' => '#E45C4D',
      'weight' => 1,
      'description' => '',
    ]
  ];

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  foreach ($terms as $name => $data) {
    $existing_term = $term_storage->loadByProperties([
      'vid' => 'lab_types',
      'name' => $name,
    ]);
    if (!empty($existing_term)) {
      continue;
    }

    $term = Term::create([
      'name' => $name,
      'description' => [
        'format' => 'full_html',
        'value' => $data['description'],
      ],
      'vid' => 'lab_types',
      'field_color' => [
        'color' => strtoupper($data['color']),
        'opacity' => NULL,
      ],
      'weight' => $data['weight'],
    ]);
    $term->save();
  }

  $terms = [
    'sampling_types' => [
      'Urine',
      'Whole Blood',
      'Serum',
      'Plasma',
      'Cord blood',
      'Dried blood spot samples',
      'Breast milk',
      'Hair',
      'Nails',
      'Placenta',
      'Meconium',
      'Saliva',
      'Semen',
      'Faeces',
      'Adipose tissue',
      'Volumetric absorptive microsamples',
    ],
    'substance_groups' => [
      'Acrylamide',
      'Aprotic solvents',
      'Aromatic amines',
      'Bisphenols',
      'Cotinine',
      'Diisocyanates',
      'DINH',
      'Dioxins',
      'Flame retardants',
      'Furans',
      'Metals and trace elements',
      'Musks',
      'Mycotoxins',
      'Parabens',
      'Pesticides',
      'Per- and polyfluoroalkyl substances (PFAS)',
      'Phthalates',
      'Polychlorinated biphenyls (PCBs)',
      'Polycyclic aromatic hydrocarbons (PAHs)',
      'UV filters-benzophenones',
    ],
  ];

  foreach ($terms as $vid => $names) {
    foreach ($names as $idx => $name) {
      $existing_term = $term_storage->loadByProperties([
        'vid' => $vid,
        'name' => $name,
      ]);
      if (!empty($existing_term)) {
        continue;
      }

      $term = Term::create([
        'vid' => $vid,
        'name' => $name,
        'weight' => $idx,
      ]);
      $term->save();
    }
  }
}

/**
 * Add default image to laboratories.
 */
function parc_core_deploy_9007() {
  $media = \Drupal::entityTypeManager()->getStorage('media')->loadByProperties([
    'uuid' => '69f46146-cf01-42d6-b34f-29638e19b8bf',
  ]);
  $media = reset($media);
  if (empty($media)) {
    $image_path = \Drupal::service('extension.list.module')
        ->getPath('parc_core') . '/assets/default-laboratory-image.png';

    /** @var \Drupal\Core\File\FileSystemInterface $file_system */
    $file_system = \Drupal::service('file_system');
    $destination = 'public://2023-08/default-laboratory-image.png';
    $directory = 'public://2023-08';
    $file_system->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);
    $file_system->copy($image_path, $destination, FileSystemInterface::EXISTS_REPLACE);

    $file = File::create([
      'uid' => 1,
      'filename' => 'default-laboratory-image.png',
      'uri' => $destination,
      'status' => 1,
    ]);
    $file->save();

    $media = Media::create([
      'bundle' => 'image',
      'name' => 'Placeholder laboratory image',
      'uuid' => '69f46146-cf01-42d6-b34f-29638e19b8bf',
      'field_media_image' => $file,
    ]);
    $media->save();
  }

  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $results = $node_storage->getQuery()
    ->condition('type', 'laboratory')
    ->notExists('field_media_image')
    ->accessCheck(FALSE)
    ->execute();

  foreach ($results as $result) {
    $node = $node_storage->load($result);
    $node->set('field_media_image', $media);
    $node->save();
  }
}

/**
 * Create training topics.
 */
function parc_core_deploy_9008() {
  if (!Vocabulary::load('training_types')) {
    throw new Exception('Training types vocabulary not yet created');
  }

  $terms = [
    'FAIR & databases' => '#00342E',
    'Human health' => '#00564C',
    'Risk assessment' => '#008475',
    'Statistics & modelling' => '#1DA998',
    'Transferable skills' => '#2EC7B4',
    'Hazard assessment' => '#31D9C4',
    'Exposure assessment' => '#75D1C6',
    'Policy and regulation' => '#9AD3CD',
  ];

  $weight = 0;
  foreach ($terms as $name => $color) {
    $term = Term::create([
      'vid' => 'training_types',
      'name' => $name,
      'field_color' => [
        'color' => $color,
      ],
      'weight' => $weight++,
    ]);
    $term->save();
  }
}

/**
 * Migrate field_parc_training to field_organizer.
 */
function parc_core_deploy_9010() {
  $node_storage = \Drupal::entityTypeManager()
    ->getStorage('node');

  $events = $node_storage
    ->getQuery()
    ->accessCheck(FALSE)
    ->condition('type', 'events')
    ->execute();

  foreach ($events as $event) {
    $event = $node_storage->load($event);
    $organizer = !empty($event->get('field_parc_training')->value)
      ? 'parc'
      : 'external';
    $event->set('field_organizer', $organizer);
    $event->save();
  }
}

/**
 * Import projects.
 */
function parc_core_deploy_9011() {
  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');

  $topics = [
    'Provide protection against most harmful chemicals' => '#F5D475',
    'Address chemical pollution in the natural environment' => '#1C85FF',
    'Biodiversity protection' => '#F58296',
    'Shift away from animal testing' => '#31D9C4',
  ];

  $saved_topics = [];

  $weight = 0;
  foreach ($topics as $name => $color) {
    $term = $term_storage->create([
      'tid' => 1000 + $weight,
      'vid' => 'project_topics',
      'name' => $name,
      'field_color' => [
        'color' => $color,
      ],
      'weight' => $weight++,
    ]);
    $saved_topics[$name] = $term;
    $term->save();
  }

  $projects_path = \Drupal::service('extension.list.module')->getPath('parc_core') . '/data/projects.csv';
  $file = fopen($projects_path, 'r');
  $headers = fgetcsv($file);
  $data = [];
  while (($row = fgetcsv($file)) !== FALSE) {
    $rowData = array_combine($headers, $row);
    $data[] = $rowData;
  }
  fclose($file);

  $project_topics = [
    1 => ['Provide protection against most harmful chemicals'],
    2 => ['Provide protection against most harmful chemicals',  'Address chemical pollution in the natural environment'],
    3 => ['Address chemical pollution in the natural environment'],
    4 => ['Biodiversity protection'],
    5 => ['Shift away from animal testing'],
    6 => ['Shift away from animal testing', 'Biodiversity protection'],
    7 => ['Provide protection against most harmful chemicals', 'Shift away from animal testing'],
  ];

  $allowed_keywords = [
    'NGRA',
    'Environment',
    'Human health',
    'Human biomonitoring',
    'Workers',
    'Monitoring methods',
    'Risk Assessment',
    'Mixtures',
    'Health Effects',
  ];

  $month_zero = '1 April 2022';

  foreach ($data as $row) {
    $project_topic_names = $project_topics[$row['Category']];
    $topics = [];
    foreach ($project_topic_names as $project_topic_name) {
      $topics[] = $saved_topics[$project_topic_name];
    }

    $project_keywords = [];
    foreach ($allowed_keywords as $keyword_name) {
      if (empty(trim($row[$keyword_name]))) {
        continue;
      }
      $project_keyword = $term_storage->loadByProperties([
        'vid' => 'project_keywords',
        'name' => $keyword_name,
      ]);
      if (!empty($project_keyword)) {
        $project_keyword = reset($project_keyword);
      }
      else {
        $project_keyword = $term_storage->create([
          'vid' => 'project_keywords',
          'name' => $keyword_name,
          'field_color' => [
            'color' => sprintf('#%06X', mt_rand(0, 0xFFFFFF)),
          ],
        ]);
        $project_keyword->save();
      }
      $project_keywords[] = $project_keyword;
    }

    $month_start = $row['Project start (in PARC Month)'];
    $date_start = date('Y-m-d', strtotime("+$month_start months", strtotime($month_zero)));
    $month_end = $row['Project end (in PARC Month)'];
    $date_end = date('Y-m-d', strtotime("+$month_end months", strtotime($month_zero)));

    $node_data = [
      'type' => 'project',
      'title' => $row['Short Title'],
      'field_date_range' => [
        'value' => $date_start,
        'end_value' => $date_end,
      ],
      'field_project_abbreviation' => $row['Project Abbreviation'],
      'field_project_topics' => $topics,
      'field_project_keywords' => $project_keywords,
      'field_slideshow_position' => 'top',
    ];
    $node = \Drupal::entityTypeManager()->getStorage('node')->create($node_data);
    $node->save();
  }
}

/**
 * Update labs vocabularies.
 */
function parc_core_deploy_10001() {
  $terms = [
    'sampling_types' => [
      'Other matrix',
    ],
    'substance_groups' => [
      'Pesticides-glyphosate',
      'Pesticides-neonicotinoids',
      'Pesticides-organochlorines',
      'Pesticides-organophosphates',
      'Pesticides-phenylpyrazoles',
      'Pesticides-pyrethroids',
      'Pesticides-others',
      'Other chemicals',
    ],
  ];

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  foreach ($terms as $vid => $names) {
    foreach ($names as $idx => $name) {
      $existing_term = $term_storage->loadByProperties([
        'vid' => $vid,
        'name' => $name,
      ]);
      if (!empty($existing_term)) {
        continue;
      }

      $term = Term::create([
        'vid' => $vid,
        'name' => $name,
        'weight' => $idx,
      ]);
      $term->save();
    }
  }

  $deleted_groups = [
    'DINH',
    'Pesticides',
  ];
  foreach ($deleted_groups as $name) {
    $existing_term = $term_storage->loadByProperties([
      'name' => $name,
      'vid' => 'substance_groups',
    ]);

    if (empty($existing_term)) {
      continue;
    }

    $existing_term = reset($existing_term);
    $existing_term->delete();
  }
}

/**
 * Import labs.
 */
function parc_core_deploy_10002() {
  $groups_map = [
    'pfas' => 'Per- and polyfluoroalkyl substances (PFAS)',
    'phthalates' => 'Phthalates',
    'metals' => 'Metals and trace elements',
    'flame_retardants' => 'Flame retardants',
    'bisphenols' => 'Bisphenols',
    'pahs' => 'Polycyclic aromatic hydrocarbons (PAHs)',
    'cotinine' => 'Cotinine',
    'pcbs' => 'Polychlorinated biphenyls (PCBs)',
    'acrylamide' => 'Acrylamide',
    'mycotoxins' => 'Mycotoxins',
    'pest_pyrethroids' => 'Pesticides-pyrethroids',
    'pest_organophos' => 'Pesticides-organophosphates',
    'pest_phenylpyr' => 'Pesticides-phenylpyrazoles',
    'pest_glyphosate' => 'Pesticides-glyphosate',
    'pest_organochlorine' => 'Pesticides-organophosphates',
    'pest_neonicotinoids' => 'Pesticides-neonicotinoids',
    'pest_others' => 'Pesticides-others',
    'aproticsolvents' => 'Aprotic solvents',
    'uvfilters_benzophenones' => 'UV filters-benzophenones',
    'diisocyanates' => 'Diisocyanates',
    'aromatic_amines' => 'Aromatic amines',
    'parabens' => 'Parabens',
    'dioxins_furans' => 'Furans',
    'other_chemicals' => 'Other chemicals',
    'musks' => 'Musks',
  ];

  $sample_map = [
    'serum' => 'Serum',
    'plasma' => 'Plasma',
    'urine' => 'Urine',
    'wholeblood' => 'Whole blood',
    'dbs' => 'Dried blood spot samples',
    'breastmilk' => 'Breast milk',
    'cordblood' => 'Cord blood',
    'placenta' => 'Placenta',
    'othermatrix' => 'Other matrix',
    'semen' => 'Semen',
    'meconium' => 'Meconium',
    'hair' => 'Hair',
    'nails' => 'Nails',
    'saliva' => 'Saliva',
    'faeces' => 'Faeces',
    'adiposetissue' => 'Adipose tissue',
    'vams' => 'Volumetric absorptive microsamples',
  ];

  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $existing_labs = $node_storage->loadByProperties([
    'type' => 'laboratory',
  ]);
  foreach ($existing_labs as $existing_lab) {
    $existing_lab->delete();
  }

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  $paragraph_storage = \Drupal::entityTypeManager()->getStorage('paragraph');

  $module_path = \Drupal::service('extension.list.module')->getPath('parc_core');
  $file_path = $module_path . '/data/labs.csv';

  $file = fopen($file_path, 'r');
  $headers = fgetcsv($file);
  while (FALSE !== ($line = fgetcsv($file))) {
    $row = array_combine($headers, $line);

    $country = $row['lab_country'];
    $country_term = $term_storage->loadByProperties([
      'vid' => 'countries',
      'name' => $country,
    ]);
    if (empty($country_term)) {
      continue;
    }
    $country_term = reset($country_term);

    $institute = $row['lab_inst'];
    $title = $row['lab_name'];
    $address = $row['lab_adress'];
    $city = $row['City lab'];
    $latitude = $row['Latitude'];
    $longitude = $row['Longitude'];

    $lab_type = $row['lab_type'];
    $lab_type_term = $term_storage->loadByProperties([
      'vid' => 'lab_types',
      'name' => $lab_type,
    ]);
    if (empty($lab_type_term)) {
      continue;
    }
    $lab_type_term = reset($lab_type_term);

    $contact_name = $row['lab_person_name'];
    $contact_email = $row['lab_person_email'];

    $matrix_entries = [];
    foreach ($headers as $column) {
      if (!str_contains($column, '.')) {
        continue;
      }

      if (empty(trim($row[$column]))) {
        continue;
      }

      [$substance_group, $sampling_type] = explode('.', $column);
      if (empty($groups_map[$substance_group])) {
        continue;
      }
      $substance_group = $groups_map[$substance_group];
      $substance_group_term = $term_storage->loadByProperties([
        'vid' => 'substance_groups',
        'name' => $substance_group,
      ]);
      if (empty($substance_group_term)) {
        continue;
      }
      $substance_group_term = reset($substance_group_term);

      if (empty($sample_map[$sampling_type])) {
        continue;
      }
      $sampling_type = $sample_map[$sampling_type];
      $sampling_type_term = $term_storage->loadByProperties([
        'vid' => 'sampling_types',
        'name' => $sampling_type,
      ]);
      if (empty($sampling_type_term)) {
        continue;
      }
      $sampling_type_term = reset($sampling_type_term);

      /** @var \Drupal\paragraphs\ParagraphInterface $matrix_entry */
      $matrix_entry = $paragraph_storage->create([
        'type' => 'lab_matrix',
        'field_sampling_type' => $sampling_type_term,
        'field_substance_group' => $substance_group_term,
      ]);
      $matrix_entry->save();
      $matrix_entries[] = [
        'target_id' => $matrix_entry->id(),
        'target_revision_id' => $matrix_entry->getRevisionId(),
      ];
    }

    $lab = $node_storage->create([
      'type' => 'laboratory',
      'title' => $title,
      'field_institute_name' => $institute,
      'field_country' => $country_term,
      'field_address_data' => $address,
      'field_city' => $city,
      'field_coordinates' => [
        'lat' => $latitude,
        'lng' => $longitude,
      ],
      'field_lab_type' => $lab_type_term,
      'field_contact_name' => $contact_name,
      'field_contact_email' => $contact_email,
      'field_substances_matrix' => $matrix_entries,
    ]);
    $lab->save();
  }
}


/**
 * Migrate lab contacts.
 */
function parc_core_deploy_10003() {
  $node_storage = \Drupal::entityTypeManager()
    ->getStorage('node');
  $paragraph_storage = \Drupal::entityTypeManager()
    ->getStorage('paragraph');

  $results = $node_storage
    ->getQuery()
    ->accessCheck(FALSE)
    ->condition('type', 'laboratory')
    ->execute();

  foreach ($results as $result) {
    $result = $node_storage->load($result);

    // Skip nodes that already have the new field populated.
    if (!$result->get('field_lab_contacts')->isEmpty()) {
      continue;
    }

    $contact_names = $result->get('field_contact_name')->value;
    $contact_emails = $result->get('field_contact_email')->value;

    // If either field is empty, skip this node.
    if (empty($contact_names) || empty($contact_emails)) {
      continue;
    }

    // Create a new paragraph item.
    $paragraph = $paragraph_storage->create([
      'type' => 'contact',
      'field_name' => [
        'value' => $contact_names,
      ],
      'field_email' => [
        'value' => $contact_emails,
      ],
    ]);

    // Save the paragraph item.
    $paragraph->save();

    // Add the paragraph item to the node's field_contacts field.
    $result->get('field_lab_contacts')->appendItem($paragraph);

    // Save the node.
    $result->save();
  }
}

/**
 * Create training topics.
 */
function parc_core_deploy_10004() {
  $terms = [
    'Ethics framework' => '#008475',
    'Policy and regulation' => '#D87283',
    'Exposure assessment' => '#8B33AE',
    'Hazard and risk ' => '#2CC7B4',
    'FAIR data and data management ' => '#B2984F',
    'Statistics ' => '#0475F9',
    'SSbD ' => '#E45C4D',
  ];

  $weight = 0;
  foreach ($terms as $name => $color) {
    $term = Term::create([
      'vid' => 'course_domains_of_interest',
      'name' => $name,
      'field_color' => [
        'color' => $color,
      ],
      'weight' => $weight++,
    ]);
    $term->save();
  }

  $terms = [
    'Chemicals prioritization' => '#D87283',
    'Regulatory policy frameworks' => '#D87283',
    'Risk communication' => '#D87283',

    'Environmental monitoring' => '#8B33AE',
    'HBM' => '#8B33AE',
    'Innovative' => '#8B33AE',
    'Modelling' => '#8B33AE',
    'QA/QC' => '#8B33AE',

    'In vivo testing' => '#2CC7B4',
    'NAMs' => '#2CC7B4',
    'IATAs' => '#2CC7B4',
    'AOPs' => '#2CC7B4',
    'IVIVE' => '#2CC7B4',
    'Risk assessment methods/frameworks' => '#2CC7B4',

    'FAIR' => '#B2984F',
    'Databases' => '#B2984F',
  ];
  $weight = 0;
  foreach ($terms as $name => $color) {
    $term = Term::create([
      'vid' => 'course_topics',
      'name' => $name,
      'field_color' => [
        'color' => $color,
      ],
      'weight' => $weight++,
    ]);
    $term->save();
  }

  $terms = [
    'Alkaloid',
    'Anilines and MOCA',
    'Care products',
    'DINCH',
    'Glycol Ethers',
    'Advanced (nano)materials',
    'Chemicals Mixtures',
    'Natural Toxins',
    'Pesticides',
    'Volatile Anaesthetics',
    'Volatile Organic Compounds (VOCs)',
  ];
  foreach ($terms as $name) {
    $term = Term::create([
      'vid' => 'substance_groups',
      'name' => $name,
    ]);
    $term->save();
  }
}

/**
 * Import courses.
 */
function parc_core_deploy_10005() {
  $courses_path = \Drupal::service('extension.list.module')->getPath('parc_core') . '/data/courses.csv';
  $file = fopen($courses_path, 'r');
  $headers = fgetcsv($file);
  $data = [];
  while (($row = fgetcsv($file)) !== FALSE) {
    $rowData = array_combine($headers, $row);
    foreach ($rowData as &$value) {
      $value = trim($value);
    }
    $data[] = $rowData;
  }
  fclose($file);

  foreach ($data as $row) {
    $domains = [];
    $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
    if (!empty($row['Domain'])) {
      foreach (explode(';', $row['Domain']) as $domain) {
        $domain = trim($domain);
        if (empty($domain)) {
          continue;
        }
        $term = $term_storage->loadByProperties([
          'name' => $domain,
          'vid' => 'course_domains_of_interest',
        ]);
        if (empty($term)) {
          continue;
        }

        $term = reset($term);
        $domains[] = $term;
      }
    }

    $topics = [];
    $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
    if (!empty($row['Topic'])) {
      foreach (explode(';', $row['Topic']) as $topic) {
        $topic = trim($topic);
        if (empty($topic)) {
          continue;
        }
        $term = $term_storage->loadByProperties([
          'name' => $topic,
          'vid' => 'course_topics',
        ]);
        if (empty($term)) {
          continue;
        }

        $term = reset($term);
        $topics[] = $term;
      }
    }

    $substances = [];
    $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
    if (!empty($row['Substance Group'])) {
      foreach (explode(';', $row['Substance Group']) as $substance) {
        $substance = trim($substance);
        if (empty($substance)) {
          continue;
        }
        $term = $term_storage->loadByProperties([
          'name' => $substance,
          'vid' => 'substance_groups',
        ]);
        if (empty($term)) {
          continue;
        }

        $term = reset($term);
        $substances[] = $term;
      }
    }

    $node_data = [
      'type' => 'learning_material',
      'title' => $row['Resource'],
      'field_course_accessibility' => $row['Accessibility'],
      'body' => [
        'format' => 'full_html',
        'value' => $row['Additional remarks'],
      ],
      'field_d_date' => !empty($row['Date of development/publication'])
        ? date('Y-m-d', strtotime($row['Date of development/publication']))
        : NULL,
      'field_domains_of_interest' => $domains,
      'field_external_url' => [
        'uri' => $row['URL']
      ],
      'field_expertise' => explode(';', $row['Level of expertise']),
      'field_owner' => $row['Owner'],
      'field_reading_time' => $row['Reading time'],
      'field_course_topics' => $topics,
      'field_course_stakeholder' => explode(';', $row['Stakeholder']),
      'field_substance_group' => $substances,
      'field_course_type' => $row['Type of education/training material'],
    ];
    $node = \Drupal::entityTypeManager()->getStorage('node')->create($node_data);
    $node->save();
  }
}

/**
 * Create SSBD menu entries.
 */
function parc_core_deploy_10006() {
  $entries = [
    [
      'title' => 'Introduction to SSbD',
      'url' => '/ssbd',
      'class' => 'ssbd-menu-introduction-to-ssbd',
    ],
    [
      'title' => 'EU legislation & link to the SSbD',
      'url' => '/ssbd/eu-legislation-link-to-the-ssbd',
      'class' => 'ssbd-menu-eu-legislation-link-to-the-ssbd',
    ],
    [
      'title' => 'Test guidelines and standards',
      'url' => '/ssbd/test-guidelines-and-standards',
      'class' => 'ssbd-menu-test-guidelines-and-standards',
    ],
    [
      'title' => 'Tools & methods',
      'url' => '/ssbd/tools-methods',
      'class' => 'ssbd-menu-tools-methods',
    ],
    [
      'title' => 'Data & databases',
      'url' => '/ssbd/data-databases',
      'class' => 'ssbd-menu-data-databases',
    ],
    [
      'title' => 'Education & training',
      'url' => '/ssbd/education-training',
      'class' => 'ssbd-menu-education-training',
    ],
    [
      'title' => 'Case studies & practical application',
      'url' => '/ssbd/case-studies-practical-application',
      'class' => 'ssbd-menu-case-studies-practical-application',
    ],
    [
      'title' => 'User community',
      'url' => '/ssbd/user-community',
      'class' => 'ssbd-menu-user-community',
    ],
    [
      'title' => 'Announcements',
      'url' => '/ssbd/announcements',
      'class' => 'ssbd-menu-announcements',
    ],
    [
      'title' => 'FAQs',
      'url' => '/ssbd/faqs',
      'class' => 'ssbd-menu-faqs',
    ],
  ];

  $menu_name = 'ssbd-repository';

  foreach ($entries as $idx => $entry) {
    // Check if the menu link already exists.
    $existing_links = \Drupal::entityTypeManager()
      ->getStorage('menu_link_content')
      ->loadByProperties(['title' => $entry['title'], 'menu_name' => $menu_name]);
    if ($existing_links) {
      $existing_link = reset($existing_links);
      $existing_link->delete();
    }

    // Create a new menu link entity.
    $menu_link = MenuLinkContent::create([
      'title' => $entry['title'],
      'link' => [
        'uri' => 'internal:' . $entry['url'],
        'options' => ['attributes' => ['class' => [$entry['class']]]],
      ],
      'menu_name' => $menu_name,
      'expanded' => TRUE,
      'weight' => $idx,
    ]);

    $menu_link->save();
  }
}

/**
 * Import labs.
 */
function parc_core_deploy_import_labs() {
  $groups_map = [
    'pfas' => 'Per- and polyfluoroalkyl substances (PFAS)',
    'phthalates' => 'Phthalates',
    'metals' => 'Metals and trace elements',
    'flame_retardants' => 'Flame retardants',
    'bisphenols' => 'Bisphenols',
    'pahs' => 'Polycyclic aromatic hydrocarbons (PAHs)',
    'cotinine' => 'Cotinine',
    'pcbs' => 'Polychlorinated biphenyls (PCBs)',
    'acrylamide' => 'Acrylamide',
    'mycotoxins' => 'Mycotoxins',
    'pest_pyrethroids' => 'Pesticides-pyrethroids',
    'pest_organophos' => 'Pesticides-organophosphates',
    'pest_phenylpyr' => 'Pesticides-phenylpyrazoles',
    'pest_glyphosate' => 'Pesticides-glyphosate',
    'pest_organochlorine' => 'Pesticides-organophosphates',
    'pest_neonicotinoids' => 'Pesticides-neonicotinoids',
    'pest_others' => 'Pesticides-others',
    'aproticsolvents' => 'Aprotic solvents',
    'uvfilters_benzophenones' => 'UV filters-benzophenones',
    'diisocyanates' => 'Diisocyanates',
    'aromatic_amines' => 'Aromatic amines',
    'parabens' => 'Parabens',
    'dioxins_furans' => 'Furans',
    'other_chemicals' => 'Other chemicals',
    'musks' => 'Musks',
  ];

  $sample_map = [
    'serum' => 'Serum',
    'plasma' => 'Plasma',
    'urine' => 'Urine',
    'wholeblood' => 'Whole blood',
    'dbs' => 'Dried blood spot samples',
    'breastmilk' => 'Breast milk',
    'cordblood' => 'Cord blood',
    'placenta' => 'Placenta',
    'othermatrix' => 'Other matrix',
    'semen' => 'Semen',
    'meconium' => 'Meconium',
    'hair' => 'Hair',
    'nails' => 'Nails',
    'saliva' => 'Saliva',
    'faeces' => 'Faeces',
    'adiposetissue' => 'Adipose tissue',
    'vams' => 'Volumetric absorptive microsamples',
  ];

  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $existing_labs = $node_storage->loadByProperties([
    'type' => 'laboratory',
  ]);
  foreach ($existing_labs as $existing_lab) {
    $existing_lab->delete();
  }

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  $paragraph_storage = \Drupal::entityTypeManager()->getStorage('paragraph');

  $module_path = \Drupal::service('extension.list.module')->getPath('parc_core');
  $file_path = $module_path . '/data/labs.csv';

  $file = fopen($file_path, 'r');
  $headers = fgetcsv($file);

  $lats = [];

  while (FALSE !== ($line = fgetcsv($file))) {
    $row = array_combine($headers, $line);

    $country = $row['lab_country'];
    $country_term = $term_storage->loadByProperties([
      'vid' => 'countries',
      'name' => $country,
    ]);
    if (empty($country_term)) {
      continue;
    }
    $country_term = reset($country_term);

    $institute = $row['lab_inst'];
    $title = $row['lab_nm'];
    $address = $row['lab_adress'];
    $city = $row['lab_city'];
    $latitude = $row['Latitude'];
    if (in_array($latitude, $lats)) {
      $latitude += 0.0006;
    }
    $lats[] = $latitude;

    $longitude = $row['Longitude'];
    $external_id = $row['pid'];

    $lab_type = $row['lab_type'];
    $lab_type_term = $term_storage->loadByProperties([
      'vid' => 'lab_types',
      'name' => $lab_type,
    ]);
    if (empty($lab_type_term)) {
      continue;
    }
    $lab_type_term = reset($lab_type_term);

    $contact_name = $row['lab_person_name'];
    $contact_email = $row['lab_person_email'];

    $matrix_entries = [];
    foreach ($headers as $column) {
      if (!str_contains($column, '.')) {
        continue;
      }

      if (empty(trim($row[$column]))) {
        continue;
      }

      [$substance_group, $sampling_type] = explode('.', $column);
      if (empty($groups_map[$substance_group])) {
        continue;
      }
      $substance_group = $groups_map[$substance_group];
      $substance_group_term = $term_storage->loadByProperties([
        'vid' => 'substance_groups',
        'name' => $substance_group,
      ]);
      if (empty($substance_group_term)) {
        continue;
      }
      $substance_group_term = reset($substance_group_term);

      if (empty($sample_map[$sampling_type])) {
        continue;
      }
      $sampling_type = $sample_map[$sampling_type];
      $sampling_type_term = $term_storage->loadByProperties([
        'vid' => 'sampling_types',
        'name' => $sampling_type,
      ]);
      if (empty($sampling_type_term)) {
        continue;
      }
      $sampling_type_term = reset($sampling_type_term);

      /** @var \Drupal\paragraphs\ParagraphInterface $matrix_entry */
      $matrix_entry = $paragraph_storage->create([
        'type' => 'lab_matrix',
        'field_sampling_type' => $sampling_type_term,
        'field_substance_group' => $substance_group_term,
      ]);
      $matrix_entry->save();
      $matrix_entries[] = [
        'target_id' => $matrix_entry->id(),
        'target_revision_id' => $matrix_entry->getRevisionId(),
      ];
    }

    $lab = $node_storage->create([
      'type' => 'laboratory',
      'title' => $title,
      'field_institute_name' => $institute,
      'field_country' => $country_term,
      'field_address_data' => $address,
      'field_city' => $city,
      'field_coordinates' => [
        'lat' => $latitude,
        'lng' => $longitude,
      ],
      'field_lab_type' => $lab_type_term,
      'field_contact_name' => $contact_name,
      'field_contact_email' => $contact_email,
      'field_substances_matrix' => $matrix_entries,
      'field_external_id' => $external_id,
      'field_lab_category' => 'hbm',
    ]);
    $lab->save();
  }
}

/**
 * Set lab category for existing labs.
 */
function parc_core_deploy_update_hbm_labs() {
  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $existing_labs = $node_storage->loadByProperties([
    'type' => 'laboratory',
  ]);
  foreach ($existing_labs as $existing_lab) {
    $existing_lab->set('field_lab_category', 'hbm');
    $existing_lab->save();
  }
}

/**
 * Import air labs.
 */
function parc_core_deploy_update_hbm_labs_import() {
  $groups_map = [
    'pfas' => 'Per- and polyfluoroalkyl substances (PFAS)',
    'phthalates' => 'Phthalates',
    'metals' => 'Metals and trace elements',
    'flame_retardants' => 'Flame retardants',
    'bisphenols' => 'Bisphenols',
    'pahs' => 'Polycyclic aromatic hydrocarbons (PAHs)',
    'cotinine' => 'Cotinine',
    'pcbs' => 'Polychlorinated biphenyls (PCBs)',
    'acrylamide' => 'Acrylamide',
    'mycotoxins' => 'Mycotoxins',
    'pest_pyrethroids' => 'Pesticides-pyrethroids',
    'pest_organophos' => 'Pesticides-organophosphates',
    'pest_phenylpyr' => 'Pesticides-phenylpyrazoles',
    'pest_glyphosate' => 'Pesticides-glyphosate',
    'pest_organochlorines' => 'Pesticides-organochlorines',
    'pest_neonicotinoids' => 'Pesticides-neonicotinoids',
    'pest_others' => 'Pesticides-others',
    'aproticsolvents' => 'Aprotic solvents',
    'uvfilters_benzophenones' => 'UV filters-benzophenones',
    'diisocyanates' => 'Diisocyanates',
    'aromatic_amines' => 'Aromatic amines',
    'parabens' => 'Parabens',
    'dioxins_furans' => 'Furans',
    'other_chemicals' => 'Other chemicals',
    'musks' => 'Musks',
  ];

  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
  foreach ($groups_map as $id => $name) {
    $term = $term_storage->loadByProperties([
      'name' => $name,
      'vid' => 'substance_groups',
    ]);

    if (empty($term)) {
      continue;
    }

    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = reset($term);
    $term->set('machine_name', $id);
    $term->save();
  }

  $sample_map = [
    'serum' => 'Serum',
    'plasma' => 'Plasma',
    'urine' => 'Urine',
    'wholeblood' => 'Whole blood',
    'dbs' => 'Dried blood spot samples',
    'breastmilk' => 'Breast milk',
    'cordblood' => 'Cord blood',
    'placenta' => 'Placenta',
    'othermatrix' => 'Other matrix',
    'semen' => 'Semen',
    'meconium' => 'Meconium',
    'hair' => 'Hair',
    'nails' => 'Nails',
    'saliva' => 'Saliva',
    'faeces' => 'Faeces',
    'adiposetissue' => 'Adipose tissue',
    'vams' => 'Volumetric absorptive microsamples',
  ];
  foreach ($sample_map as $id => $name) {
    $term = $term_storage->loadByProperties([
      'name' => $name,
      'vid' => 'sampling_types',
    ]);

    if (empty($term)) {
      continue;
    }

    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = reset($term);
    $term->set('machine_name', $id);
    $term->save();
  }

  $terms = [
    'sampling_types' => [
      'gas' => 'Gas phase',
      'part' => 'Particle phase',
    ],
    'substance_groups' => [
      'nh3' => 'Ammonia',
      'c6h6' => 'Benzene',
      'co2' => 'Carbon dioxide ',
      'co' => 'Carbon monoxide ',
      'no' => 'Nitrogen oxide',
      'no2' => 'Nitrogen dioxide ',
      'o3' => 'Ozone ',
      'so2' => 'Sulfur dioxide ',
      'asb' => 'Asbestos',
      'benzoth' => 'Benzothiazoles',
      'bc' => 'Black carbon',
      'chlorpar' => 'Chlorinated paraffins',
      'dechlor' => 'Dechloranes',
      'disbyprod' => 'Disinfection by-products',
      'dioxfur' => 'Dioxins and furans',
      'form' => 'Formaldehyde',
      'halan' => 'Halogenated anaesthetics',
      'lys' => 'Lysmeral',
      'mdi_tdi' => 'MDI/TDI',
      'hg' => 'Mercury',
      'nitrosam' => 'Nitrosamines',
      'odour' => 'Odour',
      'oilmist' => 'Oil mist',
      'ocec' => 'Organic and elemental carbon',
      'opes' => 'Organophosphate ester plasticizers (OPEs)',
      'phenols' => 'Phenols',
      'plasticmon' => 'Plastic monomers',
      'rn' => 'Radon',
      'si' => 'Silicon',
      'siloxanes' => 'Siloxanes',
      'sugars_tetrols' => 'Sugars, sugar alcohols, tetrols',
      'vocs' => 'Volatile and semi-volatile organic compounds (VOCs and SVOCs)',
      'volflcl' => 'Volatile fluorinated and chlorinated substances ',
      'wsi' => 'Water soluble ions ',
      'pm10' => 'Particles (PM10)',
      'pm25' => 'Particles (PM2.5)',
      'part_total' => 'Particles (total)',
      'ufp' => 'Ultrafine particles',
      'as10' => 'Arsenic (As) in PM10',
      'as25' => 'Arsenic (As) in PM2.5',
      'benzoapyrene10' => 'Benzo(a)pyrene in PM10',
      'cd10' => 'Cadmium (Cd) in PM10',
      'cd25' => 'Cadmium (Cd) in PM2.5',
      'ni10' => 'Nickel (Ni) in PM10',
      'ni25' => 'Nickel (Ni) in PM2.5',
      'pb10' => 'Lead (Pb) in PM10',
      'pb25' => 'Lead (Pb) in PM2.5',
    ],
  ];

  foreach ($terms as $vid => $term_lists) {
    foreach ($term_lists as $machine_name => $name) {
      $existing_term = $term_storage->loadByProperties([
        'vid' => $vid,
        'machine_name' => $machine_name,
      ]);
      if (!empty($existing_term)) {
        continue;
      }

      $term = $term_storage->create([
        'vid' => $vid,
        'name' => $name,
        'machine_name' => $machine_name,
      ]);
      $term->save();
    }
  }

  $map = [
    'acryl' => 'acrylamide',
    'aprsolv' => 'aproticsolvents',
    'aram' => 'aromatic_amines',
    'bis' => 'bisphenols',
    'cot' => 'cotinine',
    'diisocy' => 'diisocyanates',
    'flameret' => 'flame_retardants',
    'metals' => 'metals',
    'musks' => 'musks',
    'mycotox' => 'mycotoxins',
    'parab' => 'parabens',
    'pfas' => 'pfas',
    'pest_glyph' => 'pest_glyphosate',
    'pest_neonicot' => 'pest_neonicotinoids',
    'pest_orgchlor' => 'pest_organochlorines',
    'pest_orgphos' => 'pest_organophos',
    'pest_phenylpyr' => 'pest_phenylpyr',
    'pest_pyreth' => 'pest_pyrethroids',
    'phthalates' => 'phthalates',
    'pcbs' => 'pcbs',
    'pahs' => 'pahs',
    'uvfilters_benzoph' => 'uvfilters_benzophenones',
    'other_chem' => 'other_chemicals',
  ];

  $node_storage = \Drupal::entityTypeManager()->getStorage('node');
  $paragraph_storage = \Drupal::entityTypeManager()->getStorage('paragraph');

  $module_path = \Drupal::service('extension.list.module')->getPath('parc_core');
  $file_path = $module_path . '/data/air_labs.csv';

  $file = fopen($file_path, 'r');
  $headers = fgetcsv($file);

  $lats = [];

  $existing_nodes = $node_storage->loadByProperties([
    'type' => 'laboratory',
    'field_lab_category' => 'air',
  ]);
  foreach ($existing_nodes as $node) {
    $node->delete();
  }

  while (FALSE !== ($line = fgetcsv($file))) {
    $row = array_combine($headers, $line);

    $country = $row['lab_country'];
    $country_term = $term_storage->loadByProperties([
      'vid' => 'countries',
      'name' => $country,
    ]);
    if (empty($country_term)) {
      continue;
    }
    $country_term = reset($country_term);

    $institute = $row['lab_inst'];
    $title = $row['lab_nm'] ?? $row['lab_name'];
    $address = $row['lab_adress'] ?? $row['lab_address'];
    $city = $row['lab_city'];
    $latitude = $row['Latitude'] ?? $row['latitude'];
    if (in_array($latitude, $lats)) {
      $latitude += 0.0006;
    }
    $lats[] = $latitude;

    $longitude = $row['Longitude'] ?? $row['longitude'];
    $external_id = $row['pid'] ?? $row['id'];

    $lab_type = $row['lab_type'];
    $lab_type_term = $term_storage->loadByProperties([
      'vid' => 'lab_types',
      'name' => $lab_type,
    ]);
    if (empty($lab_type_term)) {
      continue;
    }
    $lab_type_term = reset($lab_type_term);

    $contact_name = $row['lab_person_name'];
    $contact_email = $row['lab_person_email'];

    $matrix_entries = [];
    foreach ($headers as $column) {
      if (!str_contains($column, '__')) {
        continue;
      }

      if (empty(trim($row[$column]))) {
        continue;
      }

      [$sampling_type, $substance_group] = explode('__', $column);
      if (str_contains($sampling_type, 'out_')) {
        $air_environment = 'out';
        $sampling_type = str_replace('out_', '', $sampling_type);
      }
      else {
        $sampling_type = str_replace('in_', '', $sampling_type);
        $air_environment = 'in';
      }

      $substance_group = trim($substance_group);
      $substance_group = $map[$substance_group] ?? $substance_group;
      $substance_group_term = $term_storage->loadByProperties([
        'vid' => 'substance_groups',
        'machine_name' => $substance_group,
      ]);
      if (empty($substance_group_term)) {
        continue;
      }
      $substance_group_term = reset($substance_group_term);

      $sampling_type = trim($sampling_type);
      $sampling_type_term = $term_storage->loadByProperties([
        'vid' => 'sampling_types',
        'machine_name' => $sampling_type,
      ]);
      if (empty($sampling_type_term)) {
        continue;
      }
      $sampling_type_term = reset($sampling_type_term);

      /** @var \Drupal\paragraphs\ParagraphInterface $matrix_entry */
      $matrix_entry = $paragraph_storage->create([
        'type' => 'lab_matrix',
        'field_sampling_type' => $sampling_type_term,
        'field_substance_group' => $substance_group_term,
        'field_air_environment' => $air_environment,
      ]);
      $matrix_entry->save();
      $matrix_entries[] = [
        'target_id' => $matrix_entry->id(),
        'target_revision_id' => $matrix_entry->getRevisionId(),
      ];
    }

    $lab = $node_storage->create([
      'type' => 'laboratory',
      'title' => $title,
      'field_institute_name' => $institute,
      'field_country' => $country_term,
      'field_address_data' => $address,
      'field_city' => $city,
      'field_coordinates' => [
        'lat' => $latitude,
        'lng' => $longitude,
      ],
      'field_lab_type' => $lab_type_term,
      'field_contact_name' => $contact_name,
      'field_contact_email' => $contact_email,
      'field_substances_matrix' => $matrix_entries,
      'field_external_id' => $external_id,
      'field_lab_category' => 'air',
    ]);
    $lab->save();
  }
}

/**
 * Migrate lab contacts.
 */
function parc_core_deploy_update_hbm_labs_import_2() {
  $node_storage = \Drupal::entityTypeManager()
    ->getStorage('node');
  $paragraph_storage = \Drupal::entityTypeManager()
    ->getStorage('paragraph');

  $results = $node_storage
    ->getQuery()
    ->accessCheck(FALSE)
    ->condition('type', 'laboratory')
    ->execute();

  foreach ($results as $result) {
    $result = $node_storage->load($result);

    // Skip nodes that already have the new field populated.
    if (!$result->get('field_lab_contacts')->isEmpty()) {
      continue;
    }

    $contact_names = $result->get('field_contact_name')->value;
    $contact_emails = $result->get('field_contact_email')->value;

    // If either field is empty, skip this node.
    if (empty($contact_names) || empty($contact_emails)) {
      continue;
    }

    $contact_names = explode(';', $contact_names);
    $contact_emails = explode(';', $contact_emails);

    for ($i = 0; $i < count($contact_names); $i++) {
      // Create a new paragraph item.
      $paragraph = $paragraph_storage->create([
        'type' => 'contact',
        'field_name' => [
          'value' => trim($contact_names[$i]),
        ],
        'field_email' => [
          'value' => trim($contact_emails[$i]),
        ],
      ]);

      // Save the paragraph item.
      $paragraph->save();

      // Add the paragraph item to the node's field_contacts field.
      $result->get('field_lab_contacts')->appendItem($paragraph);
    }

    // Save the node.
    $result->save();
  }
}
