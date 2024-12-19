<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\geolocation\MapCenterManager;
use Drupal\geolocation\MapProviderManager;
use Drupal\node\NodeInterface;
use Drupal\parc_core\ParcSearchManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Provides a block to display the parc projects.
 *
 * @Block(
 *   id = "parc_projects",
 *   admin_label = @Translation("PARC Projects"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcProjectBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The project topic term IDs.
   */
  const TOPICS = [1001, 1000, 1003, 1002];

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Construct a ParcProjectBlock instance.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param string $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $projects = [];
    $topics_order = static::TOPICS;
    $previous_topic = NULL;
    foreach ($topics_order as $current_topic) {
      if ($previous_topic) {
        $projects = array_merge($projects, $this->getProjectsForTopics([$previous_topic, $current_topic]));
      }
      $projects = array_merge($projects, $this->getProjectsForTopics([$current_topic]));
      $previous_topic = $current_topic;
    }

    $topics = [];
    $keywords = [];
    $projects_list = [];

    $relations = [];
    foreach ($projects as $project) {
      if ($project->get('field_project_topics')->isEmpty()) {
        continue;
      }

      $project_topics = [];
      foreach ($project->get('field_project_topics') as $item) {
        /** @var \Drupal\taxonomy\TermInterface $topic */
        $topic = $item->entity;
        $project_topics[] = $topic->id();
        if (empty($topics[$topic->id()])) {
          $topics[$topic->id()] = [
            'count' => 0,
            'name' => $topic->label(),
            'id' => $topic->id(),
            'color' => $topic->get('field_color')->color,
          ];
        }
        $topics[$topic->id()]['count']++;
        $topics[$topic->id()]['projects'][] = $project->id();
      }

      if ($project->get('field_project_keywords')->isEmpty()) {
        continue;
      }

      $project_keywords = [];
      foreach ($project->get('field_project_keywords') as $item) {
        /** @var \Drupal\taxonomy\TermInterface $keyword */
        $keyword = $item->entity;
        $project_keywords[] = $keyword->id();
        if (empty($keywords[$keyword->id()])) {
          $keywords[$keyword->id()] = [
            'count' => 0,
            'name' => $keyword->label(),
            'id' => $keyword->id(),
            'color' => $keyword->get('field_color')->color,
          ];
        }
        $keywords[$keyword->id()]['count']++;
        $keywords[$keyword->id()]['projects'][] = $project->id();
      }

      $projects_list[$project->id()] = [
        'name' => $project->label(),
        'keywords' => $project_keywords,
        'topics' => $project_topics,
        'percentage' => 100 / count($projects),
        'id' => $project->id(),
        'url' => $project->toUrl()->toString(),
        'show_link' => $project->get('field_show_link')->value,
      ];

      foreach ($project_topics as $topic) {
        $relations[] = [
          'term' => $topic,
          'project' => $project->id(),
          'type' => 'topic',
          'color' => $topics[$topic]['color'],
        ];
      }
      foreach ($project_keywords as $keyword) {
        $relations[] = [
          'term' => $keyword,
          'project' => $project->id(),
          'type' => 'keyword',
          'color' => $keywords[$keyword]['color'],
        ];
      }
    }

    foreach ($topics as &$topic) {
      $topic['percentage'] = $topic['count'] / count($projects) * 100;
    }
    foreach ($keywords as &$keyword) {
      $keyword['percentage'] = $keyword['count'] / count($projects) * 100;
    }

    return [
      'desktop' => [
        '#attached' => [
          'library' => [
            'parc_core/projects',
          ],
          'drupalSettings' => [
            'parc_projects' => [
              'relations' => $relations,
              'topics' => $topics,
              'keywords' => $keywords,
              'projects_list' => $projects_list
            ],
          ],
        ],
        '#theme' => 'parc_projects',
        '#topics' => $topics,
        '#keywords' => $keywords,
        '#projects' => $projects_list,
      ],
      'mobile' => [
        '#type' => 'view',
        '#name' => 'projects',
        '#display_id' => 'block_1',
        '#attributes' => [
          'class' => ['mobile-projects'],
        ],
      ],
    ];
  }

  /**
   * Get all the projects for some topics.
   *
   * @param array $topics
   *   The topics
   *
   * @return \Drupal\node\NodeInterface
   *   The projects.
   */
  protected function getProjectsForTopics(array $topics) {
    /** @var \Drupal\node\NodeStorageInterface $node_storage */
    $node_storage = $this->entityTypeManager->getStorage('node');
    $query = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'project')
      ->sort('title')
      ->condition('status', 1);

    // Only way to get multiple conditions on the same field
    // is to use condition groups.
    foreach ($topics as $topic) {
      $and = $query->andConditionGroup();
      $and->condition('field_project_topics', $topic);
      $query->condition($and);
    }

    $nids = $query->execute();
    /** @var \Drupal\node\NodeInterface $projects */
    $projects = $node_storage->loadMultiple($nids);

    // Exclude projects that don't have these exact topics.
    foreach ($projects as $idx => $project) {
      if (count($project->get('field_project_topics')->getValue()) != count($topics)) {
        unset($projects[$idx]);
      }
    }
    return $projects;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    return Cache::mergeTags(parent::getCacheTags(), [
      'node_list:project',
    ]);
  }

}
