<?php

use Drupal\Core\File\FileSystemInterface;
use Drupal\file\Entity\File;
use Drupal\media\Entity\Media;
use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\Entity\Term;

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
 * Import projects.
 */
function parc_core_deploy_9009() {
  $term_storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');

  $topics = [
    'Provide protection against most harmful chemicals' => '#F5D475',
    'Address Chemical pollution in the natural environment' => '#1C85FF',
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
    2 => ['Provide protection against most harmful chemicals',  'Address Chemical pollution in the natural environment'],
    3 => ['Address Chemical pollution in the natural environment'],
    4 => ['Biodiversity protection'],
    5 => ['Shift away from animal testing'],
    6 => ['Shift away from animal testing', 'Biodiversity protection'],
    7 => ['Provide protection against most harmful chemicals', 'Shift away from animal testing'],
  ];

  $month_zero = '1 April 2022';

  foreach ($data as $row) {
    $project_topic_names = $project_topics[$row['Category']];
    $topics = [];
    foreach ($project_topic_names as $project_topic_name) {
      $topics[] = $saved_topics[$project_topic_name];
    }

    $project_keyword_names = explode(';', $row['Manual Tags']);
    $project_keywords = [];
    foreach ($project_keyword_names as $keyword_name) {
      $keyword_name = trim($keyword_name);
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
    ];
    $node = \Drupal::entityTypeManager()->getStorage('node')->create($node_data);
    $node->save();
  }
}
