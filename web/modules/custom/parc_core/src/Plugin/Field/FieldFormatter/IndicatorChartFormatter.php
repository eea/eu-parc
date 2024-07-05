<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

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
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->chartPluginManager = $container->get('plugin.manager.indicator_chart');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode = NULL) {
    /** @var \Drupal\paragraphs\ParagraphInterface $parent */
    $parent = $items->getParent()->getEntity();
    $indicator_type = $parent->get('field_indicator_type')->value;

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

        // Remove weight from rows.
        unset($row['weight']);

        // Remove empty rows.
        $is_empty = TRUE;
        foreach ($row as $column) {
          if (!empty($column)) {
            $is_empty = FALSE;
            break;
          }
        }

        if ($is_empty) {
          unset($table_data[$idx]);
        }
      }
    }

    return $table_data;
  }

}
