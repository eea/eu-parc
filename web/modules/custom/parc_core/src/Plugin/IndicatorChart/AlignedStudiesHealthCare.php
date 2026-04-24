<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the aligned_studies_health_care.
 *
 * @IndicatorChart(
 *   id = "aligned_studies_health_care",
 *   label = @Translation("Aligned studies - health care"),
 *   description = @Translation("Aligned studies for health care (2025)")
 * )
 */
class AlignedStudiesHealthCare extends AlignedStudiesBase {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    return [
      'chart' => [
        '2025' => self::CHARTS_PATH . 'aligned_studies_health_care_2025.svg',
      ],
    ];
  }

}
