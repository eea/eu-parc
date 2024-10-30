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
use Drupal\taxonomy\TermInterface;
use Drupal\views\Views;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Provides a block to display the parc indicators.
 *
 * @Block(
 *   id = "parc_indicators",
 *   admin_label = @Translation("PARC Indiccators"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcIndicatorsBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The route match.
   *
   * @var \Drupal\Core\Routing\RouteMatchInterface
   */
  protected $routeMatch;

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
   * @param \Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The route match.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, RouteMatchInterface $route_match) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->entityTypeManager = $entity_type_manager;
    $this->routeMatch = $route_match;
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
      $container->get('current_route_match')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    /** @var \Drupal\taxonomy\TermInterface[] $page_topic */
    $page_topic = $this->routeMatch->getParameter('taxonomy_term');
    if (!$page_topic instanceof TermInterface) {
      return [];
    }
    $topics = $this->getTopicsTree($page_topic);

    $build = [];
    foreach ($topics as $topic) {
      $indicators = $this->getIndicators($topic);
      if (empty($indicators)) {
        continue;
      }

      $groups = [
        'output' => [
          'label' => $this->t('Output indicators'),
          'items' => [],
          'id' => 'output-' . $topic->id(),
        ],
        'outcome' => [
          'label' => $this->t('Outcome indicators'),
          'items' => [],
          'id' => 'outcome-' . $topic->id(),
        ],
        'impact' => [
          'label' => $this->t('Impact indicators'),
          'items' => [],
          'id' => 'impact-' . $topic->id(),
        ],
      ];

      $view_builder = $this->entityTypeManager->getViewBuilder('node');
      foreach ($indicators as $indicator) {
        $type = $indicator->get('field_indicator_type')->value;
        $groups[$type]['items'][] = $view_builder->view($indicator, 'teaser');
      }

      $parent = $topic->get('parent')->entity;

      foreach ($groups as $id => $group) {
        if (!empty($group['items'])) {
          $groups[$id]['default_active'] = TRUE;
          break;
        }
      }

      $topic_build = [
        'group_title' => [
          '#type' => 'inline_template',
          '#template' => '<div class="topic-title" id="{{ id }}">{{ title }}</div>',
          '#context' => [
            'title' => $parent instanceof TermInterface ? $parent->label() : $topic->label(),
            'id' => 'topic-' . $topic->id(),
          ],
        ],
        'group_subtitle' => [
          '#type' => 'inline_template',
          '#template' => '<div class="topic-subtitle">{{ title }}</div>',
          '#context' => [
            'title' => $topic->label(),
          ],
        ],
        'groups' => [
          '#theme' => 'parc_indicator_groups',
          '#groups' => $groups,
        ],
      ];

      if (empty($parent)) {
        unset($topic_build['group_subtitle']);
      }
      $build[] = $topic_build;
    }

    return $build;
  }

  /**
   * Get the topic tree.
   *
   * @param \Drupal\taxonomy\TermInterface $term
   *   The term.
   *
   * @return \Drupal\taxonomy\TermInterface[]
   *   The terms.
   */
  protected function getTopicsTree(TermInterface $term) {
    /** @var \Drupal\taxonomy\TermInterface[] $tree */
    $tree = $this->entityTypeManager
      ->getStorage('taxonomy_term')
      ->loadByProperties([
        'vid' => 'indicator_topics',
        'status' => 1,
        'parent' => $term->id(),
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
