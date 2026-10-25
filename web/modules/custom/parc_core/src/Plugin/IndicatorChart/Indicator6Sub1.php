<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\parc_core\IndicatorChartPluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the indicator_6_1.
 *
 * @IndicatorChart(
 *   id = "indicator_6_1",
 *   label = @Translation("Indicator 6.1."),
 *   description = @Translation("Number and characteristics of projects approved for implementation")
 * )
 */
class Indicator6Sub1 extends IndicatorChartPluginBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected EntityTypeManagerInterface $entityTypeManager;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = new static($configuration, $plugin_id, $plugin_definition);
    $instance->entityTypeManager = $container->get('entity_type.manager');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'project_topics';
  }

  /**
   * The chart is built from the projects, not from the indicator table.
   *
   * @return bool
   *   FALSE.
   */
  public function usesTableData(): bool {
    return FALSE;
  }

  /**
   * Cache tags of the content the chart is computed from.
   *
   * @return string[]
   *   The cache tags.
   */
  public function getCacheTags(): array {
    return ['node_list:project', 'taxonomy_term_list:project_topics'];
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $term_storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $tids = $term_storage->getQuery()
      ->condition('vid', 'project_topics')
      ->condition('status', 1)
      ->sort('weight')
      ->sort('name')
      ->accessCheck()
      ->execute();

    $topics = [];
    foreach ($term_storage->loadMultiple($tids) as $term) {
      $topics[] = [
        'id' => (int) $term->id(),
        'name' => $term->label(),
      ];
    }

    $node_storage = $this->entityTypeManager->getStorage('node');
    $nids = $node_storage->getQuery()
      ->condition('type', 'project')
      ->condition('status', 1)
      ->exists('field_date_range')
      ->exists('field_project_topics')
      ->accessCheck()
      ->execute();

    $known_topics = array_column($topics, 'id');
    $chart = [];
    /** @var \Drupal\node\NodeInterface $node */
    foreach ($node_storage->loadMultiple($nids) as $node) {
      $year = substr((string) $node->get('field_date_range')->value, 0, 4);
      $topic_ids = array_map('intval', array_column($node->get('field_project_topics')->getValue(), 'target_id'));
      $topic_ids = array_values(array_unique(array_intersect($topic_ids, $known_topics)));
      if (!$year || !$topic_ids) {
        continue;
      }
      sort($topic_ids);
      $key = implode('+', $topic_ids);
      $chart[$year][$key] ??= ['topics' => $topic_ids, 'count' => 0];
      $chart[$year][$key]['count']++;
    }

    ksort($chart);
    foreach ($chart as &$combinations) {
      $combinations = array_values($combinations);
    }

    return [
      'topics' => $topics,
      'chart' => $chart,
    ];
  }

}
