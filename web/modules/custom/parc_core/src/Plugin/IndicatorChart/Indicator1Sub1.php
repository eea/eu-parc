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
class Indicator1Sub1 extends IndicatorChartPluginBase {

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
      'IS' => ['country' => 'Iceland', 'category' => 'non-associated', 'x' => 100, 'y' => 100],
      'NO' => ['country' => 'Norway', 'category' => 'associated', 'x' => 500, 'y' => 100],
      'UK' => ['country' => 'United Kingdom', 'category' => 'associated', 'x' => 300, 'y' => 300],
      'SE' => ['country' => 'Sweden', 'category' => 'member', 'x' => 600, 'y' => 150],
      'FI' => ['country' => 'Finland', 'category' => 'member', 'x' => 700, 'y' => 100],
      'DK' => ['country' => 'Denmark', 'category' => 'member', 'x' => 500, 'y' => 200],
      'EE' => ['country' => 'Estonia', 'category' => 'member', 'x' => 800, 'y' => 100],
      'LV' => ['country' => 'Latvia', 'category' => 'member', 'x' => 800, 'y' => 150],
      'LT' => ['country' => 'Lithuania', 'category' => 'member', 'x' => 800, 'y' => 200],
      'PL' => ['country' => 'Poland', 'category' => 'member', 'x' => 700, 'y' => 250],
      'DE' => ['country' => 'Germany', 'category' => 'member', 'x' => 600, 'y' => 300],
      'NL' => ['country' => 'Netherlands', 'category' => 'member', 'x' => 500, 'y' => 300],
      'BE' => ['country' => 'Belgium', 'category' => 'member', 'x' => 500, 'y' => 350],
      'LU' => ['country' => 'Luxembourg', 'category' => 'member', 'x' => 500, 'y' => 400],
      'FR' => ['country' => 'France', 'category' => 'member', 'x' => 400, 'y' => 400],
      'CZ' => ['country' => 'Czech Republic', 'category' => 'member', 'x' => 650, 'y' => 350],
      'AT' => ['country' => 'Austria', 'category' => 'member', 'x' => 650, 'y' => 400],
      'SK' => ['country' => 'Slovakia', 'category' => 'member', 'x' => 700, 'y' => 400],
      'HU' => ['country' => 'Hungary', 'category' => 'member', 'x' => 700, 'y' => 450],
      'IT' => ['country' => 'Italy', 'category' => 'member', 'x' => 600, 'y' => 500],
      'SI' => ['country' => 'Slovenia', 'category' => 'member', 'x' => 650, 'y' => 450],
      'HR' => ['country' => 'Croatia', 'category' => 'member', 'x' => 700, 'y' => 500],
      'GR' => ['country' => 'Greece', 'category' => 'member', 'x' => 800, 'y' => 500],
      'CY' => ['country' => 'Cyprus', 'category' => 'member', 'x' => 900, 'y' => 500],
      'IL' => ['country' => 'Israel', 'category' => 'non-associated', 'x' => 1000, 'y' => 500],
      'ES' => ['country' => 'Spain', 'category' => 'member', 'x' => 300, 'y' => 500],
      'PT' => ['country' => 'Portugal', 'category' => 'member', 'x' => 200, 'y' => 500],
      'CH' => ['country' => 'Switzerland', 'category' => 'associated', 'x' => 400, 'y' => 350],
      'IE' => ['country' => 'Ireland', 'category' => 'associated', 'x' => 250, 'y' => 320],
    ];

    $first_data_row = $table_data[1];
    $last_key = NULL;
    foreach ($first_data_row as $key => $value) {
      if ($value != '') {
        $last_key = $key;
      }
    }

    $first_row = NULL;
    $partners = 0;
    foreach ($table_data as $row) {
      if (empty($first_row)) {
        $first_row = $row;
        continue;
      }

      $value = $row[$last_key];
      $partners += $value;
      $country = reset($row);

      if (empty($country_data[$country])) {
        continue;
      }

      $country_data[$country]['value'] = $value;
    }

    $countries = count($country_data);
    return [
      'year' => $first_row[$last_key],
      'partners' => $partners,
      'countries' => $countries,
      'chart' => array_values($country_data),
    ];
  }

}
