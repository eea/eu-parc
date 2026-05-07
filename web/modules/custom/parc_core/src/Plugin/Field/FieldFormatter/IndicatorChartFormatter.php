<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Datetime;

/**
 * Plugin implementation of the Indicator Chart formatter.
 *
 * @FieldFormatter (
 *   id = "parc_indicator_chart",
 *   label = @Translation("Indicator chart"),
 *   field_types = {
 *     "tablefield"
 *   }
 * )
 */
class IndicatorChartFormatter extends FormatterBase implements ContainerFactoryPluginInterface {

  /**
   * The chart plugin manager.
   *
   * @var \Drupal\parc_core\IndicatorChartPluginManager
   */
  protected $chartPluginManager;

  /**
   * The PARC search manager.
   *
   * @var \Drupal\parc_core\ParcSearchManager
   */
  protected $parcSearchManager;

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
    $instance->chartPluginManager = $container->get('plugin.manager.indicator_chart');
    $instance->parcSearchManager = $container->get('parc_core.search_manager');
    $instance->entityTypeManager = $container->get('entity_type.manager');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode = NULL) {
    /** @var \Drupal\paragraphs\ParagraphInterface $parent */
    $parent = $items->getParent()->getEntity();
    if (!$parent->hasField('field_indicator_id')) {
      return [];
    }
    $indicator_type = $parent->get('field_indicator_id')->value;

    if ($indicator_type == 'indicator_7_1') {
      return $this->renderPublicationsChart();
    }

    try {
      /** @var \Drupal\parc_core\IndicatorChartInterface $plugin */
      $plugin = $this->chartPluginManager->createInstance($indicator_type);
    }
    catch (\Exception $e) {
      return [];
    }

    $chart_type = $plugin->getChartType();

    if ($indicator_type === 'static_images') {
      $chart_data = $this->buildChartDataFromParagraphs($parent);
      if (empty($chart_data)) {
        return [];
      }
    }
    else {
      $table_data = $this->getTableData($items);
      if ($chart_type !== 'images' && empty($table_data)) {
        return [];
      }
      $chart_data = $plugin->getChartData($table_data);
    }

    return [
      '#theme' => 'parc_indicator_chart',
      '#indicator_id' => $indicator_type,
      '#chart_type' => $chart_type,
      '#id' => $parent->id(),
      '#attached' => [
        'drupalSettings' => [
          'parc_core' => [
            'indicator_data' => [
              $parent->id() => $chart_data,
            ],
          ],
        ],
      ],
    ];
  }

  /**
   * Build chart data from the node's field_chart_images paragraph field.
   *
   * @param \Drupal\Core\Entity\EntityInterface $node
   *   The indicator node.
   *
   * @return array
   *   Chart data in the format ['chart' => ['year' => 'url', ...]].
   */
  protected function buildChartDataFromParagraphs($node): array {
    if (!$node->hasField('field_chart_images') || $node->get('field_chart_images')->isEmpty()) {
      return [];
    }

    $chart = [];
    foreach ($node->get('field_chart_images') as $item) {
      /** @var \Drupal\paragraphs\ParagraphInterface $paragraph */
      $paragraph = $item->entity;
      if (!$paragraph) {
        continue;
      }

      $year = $paragraph->hasField('field_chart_year') && !$paragraph->get('field_chart_year')->isEmpty()
        ? $paragraph->get('field_chart_year')->value
        : NULL;

      if (!$year) {
        continue;
      }

      if (!$paragraph->hasField('field_chart_image') || $paragraph->get('field_chart_image')->isEmpty()) {
        continue;
      }

      /** @var \Drupal\media\MediaInterface $media */
      $media = $paragraph->get('field_chart_image')->entity;
      if (!$media) {
        continue;
      }

      $source_field = $media->getSource()->getConfiguration()['source_field'];
      if ($media->hasField($source_field) && !$media->get($source_field)->isEmpty()) {
        /** @var \Drupal\file\FileInterface $file */
        $file = $media->get($source_field)->entity;
        if ($file) {
          $chart[$year] = $file->createFileUrl(FALSE);
        }
      }
    }

    return $chart ? ['chart' => $chart] : [];
  }

  /**
   * Render the publications chart.
   *
   * @return array
   *   The render array.
   */
  protected function renderPublicationsChart() {
    $items = [];

    $node_storage = $this->entityTypeManager
      ->getStorage('node');

    $query = $node_storage
      ->getQuery()
      ->condition('type', 'publications')
      ->condition('status', 1)
      ->exists('field_cover')
      ->condition('field_cover', NULL, 'IS NOT NULL')
      ->sort('field_publication_date')
      ->accessCheck()
      ->execute();

    /** @var \Drupal\node\NodeInterface[] $nodes */
    $nodes = $node_storage->loadMultiple($query);

    $last_year = 0;
    foreach ($nodes as $node) {
      $date = $node->get('field_publication_date')->value;
      $date = strtotime($date);
      $formatted_date = date('Y F', $date);
      $month = date('F', $date);
      $year = date('Y', $date);

      $items[$year][$month][] = [
        'image' => $node->get('field_cover')->view('search_teaser'),
        'link' =>  $this->parcSearchManager->getNodeSearchTeaserUrl($node)->toString(),
        'date' => $last_year != $year ? $formatted_date : $month,
        'title' => $node->label(),
      ];

      $last_year = $year;
    }

    return [
      '#theme' => 'parc_publications_timeline',
      '#items' => $items,
    ];
  }

  /**
   * Retrieve the table data.
   *
   * @param \Drupal\Core\Field\FieldItemListInterface $items
   *   The items.
   *
   * @return array
   *   The table data.
   */
  protected function getTableData(FieldItemListInterface $items) {
    $table_data = [];

    foreach ($items as $delta => $table) {
      $table_data = $table->value;
      foreach ($table_data as $idx => &$row) {
        // Remove other properties.
        if (!is_array($row)) {
          unset($table_data[$idx]);
          continue;
        }

        foreach ($row as &$value) {
          $value = str_replace('%', '', $value);
          if (is_numeric($value)) {
            if ((float) $value == (int) $value) {
              $value = (int) $value;
            }
            else {
              $value = (float) $value;
            }
          }
        }

        // Remove weight from rows.
        unset($row['weight']);
      }
    }

    $this->removeEmptyRows($table_data);

    // Remove empty columns.
    $table_data = $this->transposeArray($table_data);
    $this->removeEmptyRows($table_data);
    $table_data = $this->transposeArray($table_data);

    return $table_data;
  }

  /**
   * Remove empty rows in array.
   *
   * @param array $array
   *   The array.
   */
  protected function removeEmptyRows(array &$array) {
    foreach ($array as $idx => $row) {
      $is_empty = TRUE;
      foreach ($row as $idx2 => $column) {
        if ($idx2 == 0) {
//          continue;
        }
        if (!empty($column)) {
          $is_empty = FALSE;
          break;
        }
      }

      if ($is_empty) {
        unset($array[$idx]);
      }
    }
  }

  /**
   * Transpose array.
   *
   * @param array $data
   *   The array.
   *
   * @return array
   *   The transposed array.
   */
  protected function transposeArray(array $data) {
    if (empty($data)) {
      return $data;
    }
    return array_map(NULL, ...$data);
  }

}
