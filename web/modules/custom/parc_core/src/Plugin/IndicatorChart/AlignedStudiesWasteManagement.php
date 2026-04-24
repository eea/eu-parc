<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the aligned_studies_waste_management.
 *
 * @IndicatorChart(
 *   id = "aligned_studies_waste_management",
 *   label = @Translation("Aligned studies - waste management"),
 *   description = @Translation("Aligned studies for waste management (2025)")
 * )
 */
class AlignedStudiesWasteManagement extends AlignedStudiesBase {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    return [
      'chart' => [
        '2026' => self::CHARTS_PATH . 'aligned_studies_waste_management_2026.svg',
      ],
    ];
  }

}
