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
    $current_year = date('Y', time());
    $year_header = [$current_year, $current_year + 1];
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
    ];
    foreach ($formats as $format => $label) {
      $events = array_merge($events, $this->getEventsWithFormat($format));
    }

    $month_header = [];
    foreach ($events as $event) {
      $format = $event->get('field_event_format')->value ?? 'in person';
      $format = $formats[$format]->__toString();

      if (empty($month_header)) {
        $month_header = [$format];
        foreach ($year_header as $year) {
          for ($i = 1; $i <= 12; $i++) {
            $month_header[] = $i;
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

        $row = [
          'event' => [
            'title' => $event->label(),
            'link' => $event->toUrl()->toString(),
            'color' => $topic->get('field_color')->color,
          ],
          'months' => $events_per_month,
        ];

        foreach ($event->get('field_date') as $item) {
          $date_value = date('Y-m', (int) $item->value);
          $row['months'][$date_value] = TRUE;
        }

        $rows[] = $row;
      }
    }

    $build['content'] = [
      '#theme' => 'parc_events_table',
      '#year_header' => $year_header,
      '#month_header' => $month_header,
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
      // Events after January 1st of current year.
      ->condition('field_date', strtotime(date('Y') . '-01-01', time()), '>=')
      ->condition('field_event_format', $format)
      ->sort('field_date')
      ->execute();
    return $node_storage->loadMultiple($events);
  }

}
