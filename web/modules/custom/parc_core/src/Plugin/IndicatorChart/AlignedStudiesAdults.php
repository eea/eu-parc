<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the aligned_studies_adults.
 *
 * @IndicatorChart(
 *   id = "aligned_studies_adults",
 *   label = @Translation("Aligned studies - adults"),
 *   description = @Translation("Aligned studies for adults (2023–2025)")
 * )
 */
class AlignedStudiesAdults extends AlignedStudiesBase {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    return [
      'chart' => [
        '2023' => self::CHARTS_PATH . 'aligned_studies_adults_2023.svg',
        '2024' => self::CHARTS_PATH . 'aligned_studies_adults_2024.svg',
        '2025' => self::CHARTS_PATH . 'aligned_studies_adults_2025.svg',
      ],
    ];
  }

}
