<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the output_11.
 *
 * @IndicatorChart(
 *   id = "output_11",
 *   label = @Translation("Output 11"),
 *   description = @Translation("Output 11 - synergies-style chart with circles and achieved hover")
 * )
 */
class Output11 extends Indicator7Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'output_11';
  }

}
