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
 * Create lab terms.
 */
function parc_core_deploy_9003() {
  if (!Vocabulary::load('lab_types')) {
    throw new Exception('Lab types vocabulary not yet created');
  }

  $terms = [
    'PARC qualified' => [
      'color' => '#008475',
      'weight' => 0,
      'description' => 'Lorem ipsum dolor sit amet',
    ],
    'PARC Non-qualified' => [
      'color' => '#E45C4D',
      'weight' => 1,
      'description' => 'Lorem ipsum dolor sit amet',
    ]
  ];

  foreach ($terms as $name => $data) {
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
      'Blood',
      'Serum',
      'Plasma',
      'Nails',
      'Hair',
      'Saliva',
    ],
    'substance_types' => [
      'Aniline family',
      'Bisphenols',
      'Cadmium and chromium VI',
      'Chemical mixtures',
      'Emerging substances',
      'Flame retardants',
      'Polycyclic Aromatic',
      'Hydrocarbons (PAHs)',
      'Per-/poly-fluorinated',
    ]
  ];

  foreach ($terms as $vid => $names) {
    foreach ($names as $idx => $name) {
      $term = Term::create([
        'vid' => $vid,
        'name' => $name,
        'weight' => $idx,
      ]);
      $term->save();
    }
  }
}
