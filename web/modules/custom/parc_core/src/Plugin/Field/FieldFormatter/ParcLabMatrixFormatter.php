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

    /** @var \Drupal\Core\Entity\Plugin\DataType\EntityAdapter $adapter */
    $adapter = $items->getParent();
    /** @var \Drupal\node\NodeInterface $entity */
    $entity = $adapter->getEntity();
    $lab_category = $entity->get('field_lab_category')->value;

    $paragraphs = $this->getEntitiesToView($items, $langcode);

    // Split paragraphs by type.
    $lab_matrix_paragraphs = [];
    $ecotoxicology_paragraphs = [];
    foreach ($paragraphs as $paragraph) {
      if ($paragraph->bundle() === 'ecotoxicology') {
        $ecotoxicology_paragraphs[] = $paragraph;
      }
      else {
        $lab_matrix_paragraphs[] = $paragraph;
      }
    }

    if (!empty($lab_matrix_paragraphs)) {
      $paragraphs_data = [];
      foreach ($lab_matrix_paragraphs as $paragraph) {
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
        $substance_order = $a['group_weight'] <=> $b['group_weight'];
        if (!empty($substance_order)) {
          return $substance_order;
        }
        return $b['sampling_type_count'] <=> $a['sampling_type_count'];
      });

      $substances = [];
      foreach ($paragraphs_data as $paragraph_data) {
        $para = $paragraph_data['paragraph'];
        $substance_group = $para->get('field_substance_group')->entity;
        $sampling_type = $para->get('field_sampling_type')->entity;
        $qualified = $para->get('field_qualified')->value;
        $air_environment = $para->get('field_air_environment')->value;

        if (!$substance_group instanceof TermInterface
          || !$sampling_type instanceof TermInterface) {
          continue;
        }

        if ($lab_category == 'air') {
          $substances[$air_environment][$sampling_type->label()][$substance_group->label()] = $qualified;
          continue;
        }

        $substances[$substance_group->label()][$sampling_type->label()] = $qualified;
      }

      $elements[] = [
        '#theme' => 'parc_lab_matrix',
        '#substances' => $substances,
        '#lab_category' => $lab_category,
      ];
    }

    if (!empty($ecotoxicology_paragraphs)) {
      $rows = [];
      foreach ($ecotoxicology_paragraphs as $paragraph) {
        $domain = $paragraph->get('field_domain')->entity;
        if (!$domain instanceof TermInterface) {
          continue;
        }

        $substance_groups = [];
        foreach ($paragraph->get('field_substance_group_multiple') as $item) {
          if ($item->entity instanceof TermInterface) {
            $substance_groups[] = $item->entity->label();
          }
        }
        sort($substance_groups);

        $sampling_types = [];
        foreach ($paragraph->get('field_sampling_type_multiple') as $item) {
          if ($item->entity instanceof TermInterface) {
            $sampling_types[] = $item->entity->label();
          }
        }
        sort($sampling_types);

        $approaches = [];
        foreach ($paragraph->get('field_approaches') as $item) {
          if ($item->entity instanceof TermInterface) {
            $approaches[] = $item->entity->label();
          }
        }
        sort($approaches);

        $additional_info = $paragraph->get('field_additional_information')->value ?? '';

        $rows[] = [
          'domain' => $domain->label(),
          'substance_groups' => $substance_groups,
          'sampling_types' => $sampling_types,
          'additional_information' => $additional_info,
          'approaches' => $approaches,
        ];
      }

      usort($rows, fn($a, $b) => strcmp($a['domain'], $b['domain']));

      $elements[] = [
        '#theme' => 'parc_ecotoxicology_matrix',
        '#rows' => $rows,
      ];
    }

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
