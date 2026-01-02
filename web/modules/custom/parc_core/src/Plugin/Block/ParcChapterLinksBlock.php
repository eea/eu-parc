<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Component\Utility\Html;
use Drupal\Core\Access\AccessResult;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\Url;
use Drupal\node\NodeInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block to display the chapter title links.
 *
 * @Block(
 *   id = "parc_chapter_links",
 *   admin_label = @Translation("PARC Chapter Links"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcChapterLinksBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The route match.
   *
   * @var \Drupal\Core\Routing\RouteMatchInterface
   */
  protected $routeMatch;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Construct a ParcChapterLinksBlock instance.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param string $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The route match.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, RouteMatchInterface $route_match, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->routeMatch = $route_match;
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
      $container->get('current_route_match'),
      $container->get('entity_type.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $node = $this->routeMatch->getParameter('node');
    if (!$node instanceof NodeInterface) {
      return [];
    }

    if (!$node->hasField('field_paragraphs_in') || $node->get('field_paragraphs_in')->isEmpty()) {
      return [];
    }

    $links = [];
    $paragraphs = $node->get('field_paragraphs_in')->referencedEntities();
    foreach ($paragraphs as $paragraph) {
      if ($paragraph->bundle() === 'chapter_title' && !$paragraph->get('field_title')->isEmpty()) {
        $title = $paragraph->get('field_short_title')->value ?? $paragraph->get('field_title')->value;
        $id = Html::getId($title);

        $links[] = [
          '#type' => 'link',
          '#title' => $title,
          '#url' => Url::fromUri('internal:#' . $id),
        ];
      }
    }

    if (empty($links)) {
      return [];
    }

    return [
      '#theme' => 'parc_toc',
      '#items' => $links,
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheContexts() {
    return Cache::mergeContexts(parent::getCacheContexts(), ['url']);
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    $node = $this->routeMatch->getParameter('node');
    if ($node instanceof NodeInterface) {
      return Cache::mergeTags(parent::getCacheTags(), $node->getCacheTags());
    }
    return parent::getCacheTags();
  }

  /**
   * {@inheritdoc}
   */
  public function blockAccess(AccountInterface $account) {
    $node = $this->routeMatch->getParameter('node');
    if (!$node instanceof NodeInterface) {
      return AccessResult::forbidden();
    }

    if (!$node->hasField('field_paragraphs_in') || $node->get('field_paragraphs_in')->isEmpty()) {
      return AccessResult::forbidden()->addCacheableDependency($node);
    }

    $paragraphs = $node->get('field_paragraphs_in')->referencedEntities();
    foreach ($paragraphs as $paragraph) {
      if ($paragraph->bundle() === 'chapter_title' && !$paragraph->get('field_title')->isEmpty()) {
        return AccessResult::allowed()->addCacheableDependency($node);
      }
    }

    return AccessResult::forbidden()->addCacheableDependency($node);
  }

}
