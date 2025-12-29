<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_1_1.
 *
 * @IndicatorChart(
 *   id = "indicator_1_1",
 *   label = @Translation("Indicator 1.1."),
 *   description = @Translation("Number and characteristics of PARC partners (by country)")
 * )
 */
class Indicator1Sub1 extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'map';
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $country_data = [
      'IS' => ['country' => 'Iceland', 'category' => 'non-associated', 'x' => 50, 'y' => 110],
      'NO' => ['country' => 'Norway', 'category' => 'associated', 'x' => 380, 'y' => 180],
      'UK' => ['country' => 'United Kingdom', 'category' => 'associated', 'x' => 250, 'y' => 360],
      'SE' => ['country' => 'Sweden', 'category' => 'member', 'x' => 480, 'y' => 130],
      'FI' => ['country' => 'Finland', 'category' => 'member', 'x' => 610, 'y' => 80],
      'DK' => ['country' => 'Denmark', 'category' => 'member', 'x' => 410, 'y' => 350],
      'EE' => ['country' => 'Estonia', 'category' => 'member', 'x' => 600, 'y' => 240],
      'LV' => ['country' => 'Latvia', 'category' => 'member', 'x' => 580, 'y' => 300],
      'LT' => ['country' => 'Lithuania', 'category' => 'member', 'x' => 560, 'y' => 330],
      'PL' => ['country' => 'Poland', 'category' => 'member', 'x' => 530, 'y' => 390],
      'DE' => ['country' => 'Germany', 'category' => 'member', 'x' => 380, 'y' => 430],
      'NL' => ['country' => 'Netherlands', 'category' => 'member', 'x' => 350, 'y' => 400],
      'BE' => ['country' => 'Belgium', 'category' => 'member', 'x' => 330, 'y' => 430],
      'LU' => ['country' => 'Luxembourg', 'category' => 'member', 'x' => 350, 'y' => 440],
      'FR' => ['country' => 'France', 'category' => 'member', 'x' => 280, 'y' => 530],
      'CZ' => ['country' => 'Czech Republic', 'category' => 'member', 'x' => 480, 'y' => 430],
      'AT' => ['country' => 'Austria', 'category' => 'member', 'x' => 450, 'y' => 490],
      'SK' => ['country' => 'Slovakia', 'category' => 'member', 'x' => 530, 'y' => 470],
      'HU' => ['country' => 'Hungary', 'category' => 'member', 'x' => 530, 'y' => 490],
      'IT' => ['country' => 'Italy', 'category' => 'member', 'x' => 440, 'y' => 650],
      'SI' => ['country' => 'Slovenia', 'category' => 'member', 'x' => 460, 'y' => 510],
      'HR' => ['country' => 'Croatia', 'category' => 'member', 'x' => 480, 'y' => 580],
      'GR' => ['country' => 'Greece', 'category' => 'member', 'x' => 560, 'y' => 650],
      'CY' => ['country' => 'Cyprus', 'category' => 'member', 'x' => 660, 'y' => 660],
      'IL' => ['country' => 'Israel', 'category' => 'non-associated', 'x' => 680, 'y' => 700],
      'ES' => ['country' => 'Spain', 'category' => 'member', 'x' => 230, 'y' => 630],
      'PT' => ['country' => 'Portugal', 'category' => 'member', 'x' => 180, 'y' => 630],
      'CH' => ['country' => 'Switzerland', 'category' => 'associated', 'x' => 390, 'y' => 490],
      'IE' => ['country' => 'Ireland', 'category' => 'associated', 'x' => 210, 'y' => 360],
    ];

    $table_data = $this->transposeArray($table_data);
    $chart_data = [];
    foreach ($table_data as $row) {
      if (empty($header)) {
        $header = $row;
        array_shift($header);
        continue;
      }

      $year = array_shift($row);
      $data = array_combine($header, $row);
      $chart_data[$year] = $data;
    }

    $final_chart_data = [];

    foreach ($chart_data as $year => $year_data) {
      $total = 0;
      $final_chart_data[$year]['total_countries'] = 0;
      $final_chart_data[$year]['member'] = 0;
      $final_chart_data[$year]['associated'] = 0;
      $final_chart_data[$year]['non-associated'] = 0;

      foreach ($year_data as $country => $value) {
        if (empty($value)) {
          continue;
        }
        $total += $value;

        if (empty($country_data[$country])) {
          continue;
        }

        $final_chart_data[$year]['data'][$country] = [
          'value' => $value,
        ] + $country_data[$country];
        $final_chart_data[$year][$country_data[$country]['category']]++;
        $final_chart_data[$year]['total_countries']++;
      }

      $final_chart_data[$year]['total'] = $total;
    }

    return [
      'chart' => $final_chart_data,
    ];
  }

}
