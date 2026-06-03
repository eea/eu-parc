<?php

namespace Drupal\parc_core\Plugin\views\filter;

use Drupal\Core\Database\Connection;
use Drupal\views\Plugin\views\filter\InOperator;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Filters publications by the year of a datetime field.
 *
 * The list of years spans the full range from the earliest publication to the
 * current year, including years that have no publications (e.g. an empty 2026
 * is still listed).
 *
 * @ingroup views_filter_handlers
 *
 * @ViewsFilter("parc_publication_year")
 */
class PublicationYear extends InOperator {

  /**
   * The database connection.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $database;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->database = $container->get('database');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getValueOptions() {
    if (isset($this->valueOptions)) {
      return $this->valueOptions;
    }

    $this->valueOptions = [];

    $table = $this->table ?: ('node__' . ($this->definition['field_name'] ?? ''));
    $column = $this->realField;
    if (empty($table) || empty($column) || !$this->database->schema()->tableExists($table)) {
      return $this->valueOptions;
    }

    $field = 'd.' . $column;
    $query = $this->database->select($table, 'd');
    $query->addExpression("MIN(SUBSTRING($field, 1, 4))", 'min_year');
    $query->addExpression("MAX(SUBSTRING($field, 1, 4))", 'max_year');
    $query->isNotNull($field);
    $range = $query->execute()->fetchAssoc();

    $min = (int) ($range['min_year'] ?? 0);
    if (!$min) {
      return $this->valueOptions;
    }

    $max = max((int) ($range['max_year'] ?? 0), (int) date('Y'));
    for ($year = $max; $year >= $min; $year--) {
      $this->valueOptions[$year] = (string) $year;
    }

    return $this->valueOptions;
  }

  /**
   * {@inheritdoc}
   */
  public function query() {
    $this->ensureMyTable();

    $value = array_values(array_filter((array) $this->value));
    if (empty($value)) {
      return;
    }

    $field = "$this->tableAlias.$this->realField";
    $placeholders = [];
    $args = [];
    foreach ($value as $i => $year) {
      $placeholders[] = ":parc_year_$i";
      $args[":parc_year_$i"] = $year;
    }
    $snippet = "SUBSTRING($field, 1, 4) IN (" . implode(', ', $placeholders) . ')';

    $this->query->addWhereExpression($this->options['group'], $snippet, $args);
  }

}
