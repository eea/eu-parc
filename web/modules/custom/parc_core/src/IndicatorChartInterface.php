<?php

declare(strict_types=1);

namespace Drupal\parc_core;

/**
 * Interface for indicator_chart plugins.
 */
interface IndicatorChartInterface {

  /**
   * Return the render array for the chart.
   */
  public function render(array $rows): array;

}
