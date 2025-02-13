<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Url;
use Drupal\parc_core\ParcSearchManager;
use Drupal\taxonomy\TermInterface;
use Drupal\views\Views;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block to display the parc indicators menu.
 *
 * @Block(
 *   id = "parc_indicators_menu",
 *   admin_label = @Translation("PARC Indicators Menu"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcIndicatorsMenuBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The search manager.
   *
   * @var \Drupal\parc_core\ParcSearchManager
   */
  protected $searchManager;

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
   * @param \Drupal\parc_core\ParcSearchManager $search_manager
   *   The search manager.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, ParcSearchManager $search_manager) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->entityTypeManager = $entity_type_manager;
    $this->searchManager = $search_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager'),
      $container->get('parc_core.search_manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $build = [
      '#theme' => 'parc_indicators_menu',
      '#topics' => [],
    ];

    $main_topics = $this->getTopicsTree();

    foreach ($main_topics as $main_topic) {
      if (!$main_topic instanceof TermInterface) {
        continue;
      }

      $build['#topics'][$main_topic->id()]  = [
        'icon' => $main_topic->get('field_icon')->view('default'),
        'title' => $main_topic->label(),
        'color' => $main_topic->get('field_color')->color,
        'children' => [],
        'link' => $main_topic->toUrl('canonical')->toString(),
      ];

      $topics = $this->getTopicsTree($main_topic);
      foreach ($topics as $topic) {
        $indicators = $this->getIndicators($topic);
        if (empty($indicators)) {
          continue;
        }

        $groups = [
          'output' => [
            'label' => $this->t('Output indicators'),
            'items' => [],
          ],
          'outcome' => [
            'label' => $this->t('Outcome indicators'),
            'items' => [],
          ],
          'impact' => [
            'label' => $this->t('Impact indicators'),
            'items' => [],
          ],
        ];

        foreach ($indicators as $indicator) {
          $type = $indicator->get('field_indicator_type')->value;

          $groups[$type]['items'][] = [
            '#type' => 'link',
            '#url' => $this->searchManager->getNodeSearchTeaserUrl($indicator),
            '#title' => $indicator->label(),
          ];
        }

        foreach ($groups as $idx => $group) {
          if (empty($group['items'])) {
            unset($groups[$idx]);
          }
        }

        $build['#topics'][$main_topic->id()]['children'][$topic->id()] = [
          'title' => $topic->label(),
          'groups' => $groups,
        ];
      }
    }

    return $build;
  }

  /**
   * Get the topic tree.
   *
   * @param \Drupal\taxonomy\TermInterface|NULL $term
   *   The term.
   *
   * @return \Drupal\taxonomy\TermInterface[]
   *   The terms.
   */
  protected function getTopicsTree(TermInterface $term = NULL) {
    /** @var \Drupal\taxonomy\TermInterface[] $tree */
    $tree = $this->entityTypeManager
      ->getStorage('taxonomy_term')
      ->loadByProperties([
        'vid' => 'indicator_topics',
        'status' => 1,
        'parent' => !empty($term) ? $term->id() : 0,
      ]);
    usort($tree, function (TermInterface $a, TermInterface $b) {
      return $a->getWeight() - $b->getWeight();
    });
    array_unshift($tree, $term);
    return $tree;
  }

  /**
   * Get all the indicators.
   *
   * @param \Drupal\taxonomy\TermInterface $topic
   *   The topic.
   *
   * @return \Drupal\node\NodeInterface[]
   *   The indicators.
   */
  protected function getIndicators(TermInterface $topic) {
    $view = Views::getView('indicators_admin');

    if (!$view) {
      return [];
    }

    $view->setDisplay('page_1');
    $view->setArguments([$topic->id()]);
    $view->preExecute();
    $view->execute();
    $results = $view->result;
    $indicators = [];
    foreach ($results as $result) {
      $indicators[] = $result->_entity;
    }

    return $indicators;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    return Cache::mergeTags(parent::getCacheTags(), [
      'node_list:indicator',
      'config:views.view.indicators_admin.page_1',
    ]);
  }

}
