<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\taxonomy\TermInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

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
   * The database API.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $database;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->database = $container->get('database');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    $substances = [];
    $paragraphs = $this->getEntitiesToView($items, $langcode);
    $paragraphs_data = [];
    foreach ($paragraphs as $paragraph) {
      /** @var \Drupal\taxonomy\TermInterface $substance_group */
      $substance_group = $paragraph->get('field_substance_group')->entity;
      /** @var \Drupal\taxonomy\TermInterface $sampling_type */
      $sampling_type = $paragraph->get('field_sampling_type')->entity;

      $paragraphs_data[] = [
        'paragraph' => $paragraph,
        'group_weight' => $substance_group->getWeight(),
        'sampling_type_count' => $this->getSamplingTypeCount($sampling_type),
      ];
    }

    usort($paragraphs_data, function ($a, $b) {
      // Order by group weight, ASC.
      $substance_order = $a['group_weight'] <=> $b['group_weight'];
      if (!empty($substance_order)) {
        return $substance_order;
      }
      // If substance is the same, order by sampling type count, DESC.
      return $b['sampling_type_count'] <=> $a['sampling_type_count'];
    });

    foreach ($paragraphs_data as $paragraph_data) {
      $entity = $paragraph_data['paragraph'];
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
   * Get the number of labs using this sampling type.
   *
   * @param \Drupal\taxonomy\TermInterface $term
   *   The sampling type
   *
   * @return int
   *   The count.
   */
  public function getSamplingTypeCount(TermInterface $term) {
    $query = $this->database->select('paragraph__field_sampling_type', 'p');
    $query->join('node__field_substances_matrix', 'n', 'n.field_substances_matrix_target_id = p.entity_id');
    $query->groupBy('n.entity_id');
    $query->condition('p.field_sampling_type_target_id', $term->id());
    $query->fields('n', ['entity_id']);
    return $query->countQuery()->execute()->fetchField();
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
