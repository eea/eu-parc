<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\taxonomy\TermInterface;

/**
 * Plugin implementation of the 'parc_lab_matrix' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_lab_matrix",
 *   label = @Translation("PARC Lab Matrix"),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class ParcLabMatrixFormatter extends EntityReferenceFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    $substances = [];
    $paragraphs = $this->getEntitiesToView($items, $langcode);
    usort($paragraphs, function (ParagraphInterface $a, ParagraphInterface $b) {
      /** @var \Drupal\taxonomy\TermInterface $substance_group_a */
      $substance_group_a = $a->get('field_substance_group')->entity;
      /** @var \Drupal\taxonomy\TermInterface $sampling_type_a */
      $sampling_type_a = $a->get('field_sampling_type')->entity;

      /** @var \Drupal\taxonomy\TermInterface $substance_group_b */
      $substance_group_b = $b->get('field_substance_group')->entity;
      /** @var \Drupal\taxonomy\TermInterface $sampling_type_b */
      $sampling_type_b = $b->get('field_sampling_type')->entity;

      $substance_order = $substance_group_a->getWeight() <=> $substance_group_b->getWeight();
      if ($substance_order) {
        return $substance_order;
      }
      return $sampling_type_a->getWeight() <=> $sampling_type_b->getWeight();
    });

    foreach ($paragraphs as $entity) {
      $substance_group = $entity->get('field_substance_group')->entity;
      $sampling_type = $entity->get('field_sampling_type')->entity;
      $qualified = $entity->get('field_qualified')->value;

      if (!$substance_group instanceof TermInterface
        || !$sampling_type instanceof TermInterface) {
        continue;
      }

      $substances[$substance_group->label()][$sampling_type->label()] = $qualified;
    }

    $elements[] = [
      '#theme' => 'parc_lab_matrix',
      '#substances' => $substances,
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    $target_type = $field_definition->getSetting('target_type');
    $paragraph_type = \Drupal::entityTypeManager()->getDefinition($target_type);
    if ($paragraph_type) {
      return $paragraph_type->entityClassImplements(ParagraphInterface::class);
    }

    return FALSE;
  }

}
