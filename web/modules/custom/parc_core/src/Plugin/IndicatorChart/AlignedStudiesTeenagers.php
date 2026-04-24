<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the aligned_studies_teenagers.
 *
 * @IndicatorChart(
 *   id = "aligned_studies_teenagers",
 *   label = @Translation("Aligned studies - teenagers"),
 *   description = @Translation("Aligned studies for teenagers (2023–2025)")
 * )
 */
class AlignedStudiesTeenagers extends AlignedStudiesBase {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    return [
      'chart' => [
        '2023' => self::CHARTS_PATH . 'aligned_studies_teenagers_2023.svg',
        '2024' => self::CHARTS_PATH . 'aligned_studies_teenagers_2024.svg',
        '2025' => self::CHARTS_PATH . 'aligned_studies_teenagers_2025.svg',
      ],
    ];
  }

}
