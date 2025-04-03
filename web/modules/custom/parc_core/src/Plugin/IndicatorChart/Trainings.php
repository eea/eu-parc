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
      $end_date = !empty($row[1]) ? $row[1] : $row[0];
      $year = date('Y', $date);
      $month = strtoupper(date('M', $date));
      $row[0] = date('d/m/Y', $date);
      $end_date = strtotime($end_date);

      $item = array_combine($keys, $row);
      $item['displayed_date'] = $this->formatInterval($date, $end_date);
      $result[$year][$month][] = $item;
    }
    return ['chart' => $result];
  }

  /**
   * Format the interval between 2 dates.
   *
   * @param int $timestamp1
   *   The first timestmap.
   * @param int $timestamp2
   *   The second timestamp.
   * @param string $format
   *   The format, either short or long.
   *
   * @return string
   *   The formatted date.
   */
  protected function formatInterval(int $timestamp1, int $timestamp2) {
    // Ensure timestamps are in the correct order.
    if ($timestamp1 > $timestamp2) {
      [$timestamp1, $timestamp2] = [$timestamp2, $timestamp1];
    }

    $date1 = new \DateTime('@' . $timestamp1);
    $date2 = new \DateTime('@' . $timestamp2);

    // Same day.
    if ($date1->format('Y-m-d') == $date2->format('Y-m-d')) {
      return $date1->format('j F Y');
    }

    // Same month.
    if ($date1->format('Y-m') == $date2->format('Y-m')) {
      return $date1->format('j') . ' - ' . $date2->format('j F Y');
    }

    // Same year.
    if ($date1->format('Y') === $date2->format('Y')) {
      return $date1->format('j F') . ' - ' . $date2->format('j F Y');
    }

    // Different years.
    return $date1->format('j F Y') . ' - ' . $date2->format('j F Y');
  }

}
