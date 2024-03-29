<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'parc_related_publications' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_related_publications",
 *   label = @Translation("Publications view"),
 *   field_types = {
 *     "entity_reference"
 *   }
 * )
 */
class RelatedPublicationsFormatter extends EntityReferenceFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $ids = [];
    foreach ($this->getEntitiesToView($items, $langcode) as $entity) {
      $ids[] = $entity->id();
    }

    if (empty($ids)) {
      return [];
    }

    return [
      [
        '#type' => 'view',
        '#name' => 'publications',
        '#display_id' => 'related_publications',
        '#arguments' => [implode('+', $ids)],
      ]
    ];
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    return $field_definition->getName() == 'field_related_publications';
  }

}
