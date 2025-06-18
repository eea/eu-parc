<?php

namespace Drupal\parc_core\EventSubscriber;

use Drupal\Core\Database\Database;
use Drupal\search_api\Event\ProcessingResultsEvent;
use Drupal\search_api\Item\Item;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Drupal\search_api\Event\SearchApiEvents;
use Drupal\search_api\Query\ConditionGroup;
use Drupal\search_api\Query\Condition;

/**
 * Appends results of the query on field_projects_abbreviation to the fulltext search results.
 */
class SearchApiEventSubscriber implements EventSubscriberInterface {

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents() {
    return [
      // Listen to the processing results event to alter the search results.
      SearchApiEvents::PROCESSING_RESULTS  => ['onProcessingResults'],
    ];
  }

  /**
   * Responds to the processing results event.
   *
   * @param \Drupal\search_api\Event\ProcessingResultsEvent $event
   *   The event object.
   */
  public function onProcessingResults(ProcessingResultsEvent $event) {
    $results_object = $event->getResults();

    if (!$results_object) {
      return;
    }

    $query = $results_object->getQuery();

    if (!$query || !$query->getOriginalKeys()) {
      return;
    }

    if ($this->queryHasAnyTypeCondition($query->getConditionGroup()) && 
      !$this->queryHasTypeCondition($query->getConditionGroup(), 'project')) {
      return;
    }

    $search = $query->getOriginalKeys();
    $index = $query->getIndex();
    $datasource = $index->getDatasource('entity:node');
    $connection = Database::getConnection();
    $results = $connection->select('search_api_db_global_search', 's')
      ->fields('s', ['field_project_abbreviation', 'item_id', 'search_api_datasource'])
      ->condition('s.field_project_abbreviation', '%' . $search . '%', 'LIKE')
      ->execute()
      ->fetchAll();

    foreach ($results as $result) {
      $res = new Item($index, $result->item_id, $datasource);
      $results_object->addResultItem($res);
      $results_object->setResultCount($results_object->getResultCount() + 1);
    }
  }

  /**
   * Checks if the query has a condition for the specified type.
   *
   * @param \Drupal\search_api\Query\ConditionGroup $condition_group
   *   The condition group to check.
   * @param string $type_value
   *   The type value to check for.
   *
   * @return bool
   *   TRUE if the condition group has a condition for the specified type, FALSE otherwise.
   */
  protected function queryHasTypeCondition($condition_group, $type_value) {
    foreach ($condition_group->getConditions() as $condition) {
      if ($condition instanceof ConditionGroup) {
        if ($this->queryHasTypeCondition($condition, $type_value)) {
          return TRUE;
        }
      }
      elseif ($condition instanceof Condition) {
        if (
          $condition->getField() === 'type' &&
          $condition->getValue() === $type_value &&
          $condition->getOperator() === '='
        ) {
          return TRUE;
        }
      }
    }
    return FALSE;
  }

  /**
   * Checks if the query has any condition for the type field.
   *
   * @param \Drupal\search_api\Query\ConditionGroup $condition_group
   *   The condition group to check.
   *
   * @return bool
   *   TRUE if the condition group has any condition for the type field, FALSE otherwise.
   */
  protected function queryHasAnyTypeCondition($condition_group) {
    foreach ($condition_group->getConditions() as $condition) {
      if ($condition instanceof ConditionGroup) {
        if ($this->queryHasAnyTypeCondition($condition)) {
          return TRUE;
        }
      }
      elseif ($condition instanceof Condition) {
        if ($condition->getField() === 'type') {
          return TRUE;
        }
      }
    }
    return FALSE;
  }

}
