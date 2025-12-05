<?php

namespace Drupal\parc_core\Plugin\views\style;

use Drupal\views\Plugin\views\style\StylePluginBase;
use Drupal\Core\Annotation\Translation;
use Drupal\views\Annotation\ViewsStyle;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Style plugin to render projects as a chart/list.
 *
 * @ViewsStyle(
 *   id = "parc_projects_style",
 *   title = @Translation("PARC Projects"),
 *   help = @Translation("Displays projects as a chart/list."),
 *   theme = "parc_projects",
 *   display_types = {"normal"}
 * )
 */
class ParcProjectsStyle extends StylePluginBase {

  /**
   * {@inheritdoc}
   */
  protected $usesRowPlugin = FALSE;

  /**
   * {@inheritdoc}
   */
  protected $usesFields = FALSE;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->entityTypeManager = $container->get('entity_type.manager');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    $projects = [];
    $topics = [];
    $keywords = [];
    $projects_list = [];
    $relations = [];

    $results = $this->view->result;

    // Sort results based on specific topic combinations.
    $topic_combinations = [
      [1001],
      [1001, 1000],
      [1000],
      [1000, 1003],
      [1003],
      [1003, 1002],
      [1002],
    ];

    usort($results, function ($a, $b) use ($topic_combinations) {
      $get_weight = function ($row) use ($topic_combinations) {
        $project = $row->_entity;
        if ($project->get('field_project_topics')->isEmpty()) {
          return 999;
        }
        $project_topics = array_column($project->get('field_project_topics')->getValue(), 'target_id');
        sort($project_topics);

        foreach ($topic_combinations as $index => $combination) {
          sort($combination);
          if ($project_topics == $combination) {
            return $index;
          }
        }
        return 999;
      };

      $weight_a = $get_weight($a);
      $weight_b = $get_weight($b);

      if ($weight_a == $weight_b) {
        return strnatcasecmp($a->_entity->label(), $b->_entity->label());
      }
      return ($weight_a < $weight_b) ? -1 : 1;
    });

    foreach ($results as $row) {
      $project = $row->_entity;

      if (!$project->get('field_project_topics')->isEmpty()) {
        $project_topics = [];
        foreach ($project->get('field_project_topics') as $item) {
          /** @var \Drupal\taxonomy\TermInterface $topic */
          $topic = $item->entity;
          if ($topic) {
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
        }
      }

      if (!$project->get('field_project_keywords')->isEmpty()) {
        $project_keywords = [];
        foreach ($project->get('field_project_keywords') as $item) {
          /** @var \Drupal\taxonomy\TermInterface $keyword */
          $keyword = $item->entity;
          if ($keyword) {
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
        }
      }

      $projects_list[$project->id()] = [
        'name' => $project->label(),
        'keywords' => $project_keywords ?? [],
        'topics' => $project_topics ?? [],
        'percentage' => 0, // Will be calculated later
        'id' => $project->id(),
        'url' => $project->toUrl()->toString(),
        'show_link' => $project->get('field_show_link')->value,
      ];

      if (!empty($project_topics)) {
        foreach ($project_topics as $topic) {
          $relations[] = [
            'term' => $topic,
            'project' => $project->id(),
            'type' => 'topic',
            'color' => $topics[$topic]['color'],
          ];
        }
      }
      
      if (!empty($project_keywords)) {
        foreach ($project_keywords as $keyword) {
          $relations[] = [
            'term' => $keyword,
            'project' => $project->id(),
            'type' => 'keyword',
            'color' => $keywords[$keyword]['color'],
          ];
        }
      }
      
      $projects[] = $project;
    }

    $total_projects = count($projects);
    if ($total_projects > 0) {
      foreach ($projects_list as &$p) {
        $p['percentage'] = 100 / $total_projects;
      }
      $sum = array_sum(array_column($topics, 'count'));
      foreach ($topics as &$topic) {
        $topic['percentage'] = $topic['count'] / $sum * 100 * 0.9;
      }
      $sum = array_sum(array_column($keywords, 'count'));
      foreach ($keywords as &$keyword) {
        $keyword['percentage'] = $keyword['count'] / $sum * 100 * 0.9;
      }
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
              'projects_list' => $projects_list,
            ],
          ],
        ],
        '#theme' => 'parc_projects',
        '#topics' => $topics,
        '#keywords' => $keywords,
        '#projects' => $projects_list,
      ],
      'mobile' => $this->getMobileRender(),
    ];
  }

  /**
   * Get the mobile render.
   *
   * @return array
   *   The render.
   */
  protected function getMobileRender() {
    $projects_by_topic = [];
    $projects_by_keyword = [];

    $node_storage = $this->entityTypeManager->getStorage('node');
    $query = $node_storage->getQuery()
      ->accessCheck()
      ->condition('type', 'project')
      ->condition('status', 1)
      ->sort('title');

    $nids = $query->execute();
    /** @var \Drupal\node\NodeInterface[] $projects */
    $projects = $node_storage->loadMultiple($nids);

    foreach ($projects as $project) {
      /** @var \Drupal\taxonomy\TermInterface $topic */
      foreach ($project->get('field_project_topics')->referencedEntities() as $topic) {
        $projects_by_topic[$topic->id()]['label'] = $topic->label();
        $projects_by_topic[$topic->id()]['id'] = $topic->id();
        $projects_by_topic[$topic->id()]['color'] = $topic->get('field_color')->color;
        $projects_by_topic[$topic->id()]['projects'][] = [
          'id' => $project->id(),
          'label' => $project->label(),
          'show_link' => $project->get('field_show_link')->value,
        ];
      }

      /** @var \Drupal\taxonomy\TermInterface $keyword */
      foreach ($project->get('field_project_keywords')->referencedEntities() as $keyword) {
        $projects_by_keyword[$keyword->id()]['label'] = $keyword->label();
        $projects_by_keyword[$keyword->id()]['id'] = $keyword->id();
        $projects_by_keyword[$keyword->id()]['color'] = $keyword->get('field_color')->color;
        $projects_by_keyword[$keyword->id()]['projects'][] = [
          'id' => $project->id(),
          'label' => $project->label(),
          'show_link' => $project->get('field_show_link')->value,
        ];
      }
    }

    return [
      '#theme' => 'parc_projects_mobile',
      '#projects_by_topic' => $projects_by_topic,
      '#projects_by_keyword' => $projects_by_keyword,
      '#attached' => [
        'library' => [
          'parc_core/projects_mobile',
        ],
      ],
    ];
  }

}
