<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the output_02.
 *
 * @IndicatorChart(
 *   id = "output_02",
 *   label = @Translation("Output 2"),
 *   description = @Translation("Output 2 - variable-height pill line per year")
 * )
 */
class Output02 extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'output_02';
  }

}
