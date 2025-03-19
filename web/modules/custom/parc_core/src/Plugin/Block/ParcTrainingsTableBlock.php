<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\taxonomy\TermInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a parc trainings table block.
 *
 * @Block(
 *   id = "parc_core_trainings_table",
 *   admin_label = @Translation("PARC Trainings Table"),
 *   category = @Translation("PARC"),
 * )
 */
final class ParcTrainingsTableBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * Constructs the plugin instance.
   */
  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    private readonly EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): self {
    return new self(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $current_calendar_year = $this->getCurrentCalendarYear();
    $year_header = range(2024, $current_calendar_year + 1);
    $events_per_month = [];
    foreach ($year_header as $year) {
      for ($i = 1; $i <= 12; $i++) {
        $month = (string) $i;
        $month = str_pad($month, 2, '0', STR_PAD_LEFT);
        $events_per_month["$year-$month"] = FALSE;
      }
    }

    $events = [];
    $groups = [];

    $formats = [
      'in person' => $this->t('In Person Courses'),
      'hybrid' => $this->t('Hybrid Courses'),
      'online' => $this->t('Remote Courses'),
      'resource' => $this->t('Online Resources'),
    ];
    foreach ($formats as $format => $label) {
      if ($format == 'resource') {
        $events = array_merge($events, $this->getResources());
        continue;
      }
      $events = array_merge($events, $this->getEventsWithFormat($format));
    }

    $month_header = [];
    foreach ($events as $event) {
      if ($event->bundle() == 'resource') {
        $format = 'resource';
      }
      else {
        $format = $event->get('field_event_format')->value ?? 'in person';
      }
      $format = $formats[$format]->__toString();

      if (empty($month_header)) {
        $month_header = [$format];
        foreach ($year_header as $year) {
          for ($i = 1; $i <= 12; $i++) {
            $month_header[] = [
              'month' => $i,
              'year' => $year,
            ];
          }
        }
      }

      $groups[$format][] = $event;
    }

    $first_format = TRUE;
    $rows = [];
    foreach ($groups as $format => $group) {
      if (!$first_format) {
        $rows[] = [
          'empty_row' => TRUE,
          'months' => $events_per_month,
        ];
        $rows[] = [
          'format' => $format,
          'months' => $events_per_month,
        ];
      }
      $first_format = FALSE;

      /** @var \Drupal\node\NodeInterface $event */
      foreach ($group as $event) {
        $topic  = $event->get('field_training_type')->entity;
        if (!$topic instanceof TermInterface) {
          continue;
        }

        $dates = $event->bundle() == 'events'
          ? $event->get('field_date')
          : $event->get('field_d_date');

        $link = $event->bundle() == 'events'
          ? $event->toUrl()->toString()
          : $event->get('field_external_link')->uri;

        $row = [
          'event' => [
            'title' => $event->label(),
            'link' => $link,
            'color' => $topic->get('field_color')->color,
            'tentative' => $event->bundle() == 'events'
              && $event->get('field_tentative_event')->value,
          ],
          'months' => $events_per_month,
        ];
        foreach ($dates as $item) {
          $value = (int) $item->value;
          if ($event->bundle() == 'resource') {
            $value = strtotime($item->value);
          }

          $date_value = date('Y-m', $value);
          $row['months'][$date_value] = TRUE;
          $row['years'][] = date('Y', $value);
        }

        $rows[] = $row;
      }
    }

    $build['content'] = [
      '#theme' => 'parc_events_table',
      '#year_header' => $year_header,
      '#month_header' => $month_header,
      '#current_year' => $current_calendar_year,
      '#rows' => $rows,
      '#attached' => ['library' => ['parc_core/events_table']],
    ];
    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    return Cache::mergeTags(parent::getCacheTags(), ['node_list:events']);
  }

  /**
   * Get events of a specific format.
   *
   * @param string $format
   *   The format.
   *
   * @return \Drupal\node\NodeInterface[]
   *   The events.
   */
  protected function getEventsWithFormat(string $format) {
    /** @var \Drupal\node\NodeStorageInterface $node_storage */
    $node_storage = $this->entityTypeManager->getStorage('node');

    $events = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'events')
      ->condition('status', TRUE)
      // Events.
      ->condition('field_categories', 91)
      ->condition('field_event_format', $format)
      ->condition('field_organizer', 'external', '!=')
      ->sort('field_date')
      ->execute();
    return $node_storage->loadMultiple($events);
  }

  /**
   * Get the current calendar year.
   *
   * This is the year where the last resource or event exists,
   * but cannot be higher than current year.
   *
   * @return int
   *   The current calendar year.
   */
  protected function getCurrentCalendarYear() {
    /** @var \Drupal\node\NodeStorageInterface $node_storage */
    $node_storage = $this->entityTypeManager->getStorage('node');

    $event = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'events')
      ->condition('status', TRUE)
      // Events.
      ->condition('field_categories', 91)
      ->condition('field_organizer', 'external', '!=')
      ->sort('field_date', 'DESC')
      ->range(0, 1)
      ->execute();
    $event = reset($event);
    $event = $node_storage->load($event);
    $dates = $event->get('field_date')->getValue();
    $date = end($dates);
    $last_event_year = date('Y', (int) $date['value']);

    $resource = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'resource')
      ->condition('status', TRUE)
      ->sort('field_d_date', 'DESC')
      ->range(0, 1)
      ->execute();
    $resource = reset($resource);
    $resource = $node_storage->load($resource);
    $date = $resource->get('field_d_date')->value;
    $last_resource_year = date('Y', strtotime($date));

    $max_year = max($last_resource_year, $last_event_year);
    $current_year = date('Y');
    return min($current_year, $max_year);
  }

  /**
   * Get resources.
   *
   * @return \Drupal\node\NodeInterface[]
   *   The resources.
   */
  protected function getResources() {
    /** @var \Drupal\node\NodeStorageInterface $node_storage */
    $node_storage = $this->entityTypeManager->getStorage('node');

    $events = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'resource')
      ->condition('status', TRUE)
      ->sort('field_d_date')
      ->execute();
    return $node_storage->loadMultiple($events);
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheMaxAge() {
    // Cache for a week to make sure the new year is displayed.
    return 60 * 60 * 24 * 7;
  }

}
