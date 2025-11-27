<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block to display the parc projects for mobile.
 *
 * @Block(
 *   id = "parc_projects_mobile",
 *   admin_label = @Translation("PARC Projects Mobile"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcProjectsMobileBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Construct a ParcProjectsMobileBlock instance.
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

    $view_builder = $this->entityTypeManager->getViewBuilder('node');

    foreach ($projects as $project) {
      $render = $view_builder->view($project, 'teaser');

      /** @var \Drupal\taxonomy\TermInterface $topic */
      foreach ($project->get('field_project_topics')->referencedEntities() as $topic) {
        $projects_by_topic[$topic->id()]['label'] = $topic->label();
        $projects_by_topic[$topic->id()]['id'] = $topic->id();
        $projects_by_topic[$topic->id()]['color'] = $topic->get('field_color')->color;
        $projects_by_topic[$topic->id()]['projects'][] = [
          'render' => $render,
          'id' => $project->id(),
          'label' => $project->label(),
        ];
      }

      /** @var \Drupal\taxonomy\TermInterface $keyword */
      foreach ($project->get('field_project_keywords')->referencedEntities() as $keyword) {
        $projects_by_keyword[$keyword->id()]['label'] = $keyword->label();
        $projects_by_keyword[$keyword->id()]['id'] = $keyword->id();
        $projects_by_keyword[$keyword->id()]['color'] = $keyword->get('field_color')->color;
        $projects_by_keyword[$keyword->id()]['projects'][] = [
          'render' => $render,
          'id' => $project->id(),
          'label' => $project->label(),
        ];
      }
    }

    return [
      '#theme' => 'parc_projects_mobile',
      '#projects_by_topic' => $projects_by_topic,
      '#projects_by_keyword' => $projects_by_keyword,
    ];
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
