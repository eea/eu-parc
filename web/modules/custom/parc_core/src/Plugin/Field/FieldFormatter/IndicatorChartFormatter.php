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
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->chartPluginManager = $container->get('plugin.manager.indicator_chart');
    $instance->parcSearchManager = $container->get('parc_core.search_manager');
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
      $items = [];

      $query = \Drupal::entityQuery('node')
        ->condition('type', 'publications')
        ->condition('status', 1)
        ->exists('field_cover') // Ensure the field_cover field exists
        ->condition('field_cover', NULL, 'IS NOT NULL') // Ensure the field_cover field is not empty
        ->sort('field_publication_date', 'ASC')
        ->accessCheck('false')
        ->execute();

      $nodes = \Drupal\node\Entity\Node::loadMultiple($query);

      foreach ($nodes as $node) {
        $data_formatata_frumos = $node->get('field_publication_date')->value;
        $data_formatata_frumos = strtotime($data_formatata_frumos);
        $data_formatata_frumos = date('F Y', $data_formatata_frumos);

        if (!isset($items[$data_formatata_frumos])) {
          $items[$data_formatata_frumos] = [];
        }


        $items[$data_formatata_frumos][] = [
          'image' => $node->get('field_cover')->view('search_teaser'),
          'link' =>  $this->parcSearchManager->getNodeSearchTeaserUrl($node)->toString(),
          'date' => $data_formatata_frumos,
          'date_month' => explode(' ', $data_formatata_frumos)[0],
        ];
      }
      uksort($items, function($a, $b) {
        // Convert keys to DateTime objects for comparison
        $dateA = DateTime::createFromFormat('F Y', $a);
        $dateB = DateTime::createFromFormat('F Y', $b);

        // Compare DateTime objects
        if ($dateA == $dateB) {
          return 0;
        }
        return ($dateA < $dateB) ? -1 : 1;
      });



      // Incarcate toate publicatiile.
      // Sortate dupa Publication date
      // $data_formatata_frumos = 'February 2020'; field_publication_date
      // Trecut prin fiecare publication, $items[$data_formatata_frumos][] = [
      //     'image' => $node->get('field_publication_date')->view('search_teaser')
      //     'link' =>  $this->parcSearchManager->getNodeSearchTeaserUrl($node);,
      // ]
      // <a href="{{ link}}">{{ item.image }}</a>



      return [
        '#theme' => 'parc_publications_timeline',
        '#items' => $items,
      ];
    }

    try {
      /** @var \Drupal\parc_core\IndicatorChartInterface $plugin */
      $plugin = $this->chartPluginManager->createInstance($indicator_type);
    }
    catch (\Exception $e) {
      return [];
    }

    $table_data = $this->getTableData($items);
    $chart_data = $plugin->getChartData($table_data);
    $chart_type = $plugin->getChartType();

    if (empty($table_data)) {
      return [];
    }

    return [
      '#theme' => 'parc_indicator_chart',
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
            $value = (int) $value;
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
          continue;
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
