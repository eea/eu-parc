<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the trainings.
 *
 * @IndicatorChart(
 *   id = "trainings",
 *   label = @Translation("Trainings."),
 *   description = @Translation("Involvement of different stakeholders in the national hubs")
 * )
 */
class Trainings extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'trainings';
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $keys = $table_data[0];
    $result = [];
    foreach ($table_data as $key => $row) {
      if ($key === 0) {
        continue;
      }
      $date = strtotime($row[0]);
      $year = date('Y', $date);
      $month = strtoupper(date('M', $date));
      $row[0] = date('d/m/Y', $date);
      $result[$year][$month][] = array_combine($keys, $row);
    }
    return ['chart' => $result];
  }
}
