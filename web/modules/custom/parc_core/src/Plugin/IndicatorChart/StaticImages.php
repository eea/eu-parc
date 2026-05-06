<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the static_images indicator chart.
 *
 * Displays images from the node's field_chart_images paragraph field,
 * with an optional year switcher when multiple years are present.
 *
 * @IndicatorChart(
 *   id = "static_images",
 *   label = @Translation("Static images"),
 *   description = @Translation("Displays static chart images managed via the Chart images paragraph field")
 * )
 */
class StaticImages extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'images';
  }

  /**
   * {@inheritdoc}
   *
   * Data is built by IndicatorChartFormatter from field_chart_images paragraphs.
   */
  public function getChartData(array $table_data): array {
    return [];
  }

}
