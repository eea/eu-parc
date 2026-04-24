<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

/**
 * Plugin implementation of the aligned_studies_children.
 *
 * @IndicatorChart(
 *   id = "aligned_studies_children",
 *   label = @Translation("Aligned studies - children"),
 *   description = @Translation("Aligned studies for children (2023–2025)")
 * )
 */
class AlignedStudiesChildren extends AlignedStudiesBase {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    return [
      'chart' => [
        '2023' => self::CHARTS_PATH . 'aligned_studies_children_2023.svg',
        '2024' => self::CHARTS_PATH . 'aligned_studies_children_2024.svg',
        '2025' => self::CHARTS_PATH . 'aligned_studies_children_2025.svg',
      ],
    ];
  }

}
