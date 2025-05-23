<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Cache\Cache;
use Drupal\Core\Field\Attribute\FieldFormatter;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\file\FileInterface;
use Drupal\file\Plugin\Field\FieldFormatter\FileVideoFormatter;
use Drupal\image\Entity\ImageStyle;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'parc_video_thumbnail' formatter.
 */
#[FieldFormatter(
  id: 'parc_video_thumbnail',
  label: new TranslatableMarkup('Video with thumbnail'),
  description: new TranslatableMarkup('Display the file using an HTML5 video tag with thumbnail.'),
  field_types: [
    'file',
  ],
)]
class VideoThumbnailFormatter extends FileVideoFormatter implements ContainerFactoryPluginInterface {

  /**
   * The file URL generator.
   *
   * @var \Drupal\Core\File\FileUrlGeneratorInterface
   */
  protected $fileUrlGenerator;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->fileUrlGenerator = $container->get('file_url_generator');
    $instance->entityTypeManager = $container->get('entity_type.manager');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = parent::viewElements($items, $langcode);
    /** @var \Drupal\Core\Entity\Plugin\DataType\EntityAdapter $adapter */
    $adapter = $items->getParent();
    /** @var \Drupal\media\MediaInterface $media */
    $media = $adapter->getEntity();

    $thumbnail_url = NULL;
    if ($media->hasField('field_media_image')
      && !$media->get('field_media_image')->isEmpty()) {
      /** @var \Drupal\file\FileInterface $file */
      $file = $media->get('field_media_image')->entity;
      if ($file instanceof FileInterface) {
        $image_uri = $file->getFileUri();
        $image_style = $this->entityTypeManager->getStorage('image_style')->load('thumbnail_16_9');

        $thumbnail_url = $image_style
          ? $this->fileUrlGenerator->transformRelative($image_style->buildUrl($image_uri))
          : $this->fileUrlGenerator->generateString($image_uri);
      }
    }

    foreach ($elements as &$element) {
      $element['#theme'] = 'file_video';

      if (empty($thumbnail_url)) {
        continue;
      }

      $attributes = $element['#attributes'];
      $attributes->setAttribute('poster', '/sites/default/files/styles/thumbnail_16_9/public/2025-05/thumbnails/tj.png?itok=2J29tVMi');
    }

    return $elements;
  }

}
