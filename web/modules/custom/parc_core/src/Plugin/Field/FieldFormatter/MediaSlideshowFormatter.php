<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'parc_media_slideshow' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_media_slideshow",
 *   label = @Translation("Media Slideshow"),
 *   field_types = {
 *     "entity_reference"
 *   }
 * )
 */
class MediaSlideshowFormatter extends EntityReferenceFormatterBase {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Constructs an MediaSlideshow instance.
   *
   * @param string $plugin_id
   *   The plugin_id for the formatter.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The definition of the field to which the formatter is associated.
   * @param array $settings
   *   The formatter settings.
   * @param string $label
   *   The formatter label display setting.
   * @param string $view_mode
   *   The view mode.
   * @param array $third_party_settings
   *   Any third party settings.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, $label, $view_mode, array $third_party_settings, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['label'],
      $configuration['view_mode'],
      $configuration['third_party_settings'],
      $container->get('entity_type.manager')
    );
  }


  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $slideshow_items = [];
    $view_builder = $this->entityTypeManager->getViewBuilder('media');
    foreach ($this->getEntitiesToView($items, $langcode) as $entity) {
      $slideshow_items[] = [
        'media' => $view_builder->view($entity, 'slideshow', $entity->language()->getId()),
        'caption' => $entity->get('field_caption')->value ?? '',
      ];
    }

    return [
      [
        '#theme' => 'parc_slideshow',
        '#items' => $slideshow_items,
      ]
    ];
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    $storage = $field_definition->getFieldStorageDefinition();
    return $storage->isMultiple() && $storage->getSetting('target_type') === 'media';
  }

}
