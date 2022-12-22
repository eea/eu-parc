<?php

namespace Drupal\parc;

use Drupal\path_alias\AliasManager;
use Drupal\Core\Path\CurrentPathStack;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;

/**
 * Defines a class for reacting to entity/preprocess events.
 *
 * @internal
 */
class ParcThemeProcess implements ContainerInjectionInterface {

  use StringTranslationTrait;

  /**
   * The Entity Type Manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Current route match.
   *
   * @var \Drupal\Core\Routing\CurrentRouteMatch
   */
  protected $routeMatch;

  /**
   * Current user.
   *
   * @var \Drupal\Core\Session\AccountProxyInterface
   */
  protected $currentUser;

  /**
   * Current path.
   *
   * @var \Drupal\Core\Path\CurrentPathStack
   */
  protected $currentPath;

  /**
   * Path alias manager.
   *
   * @var \Drupal\path_alias\AliasManager
   */
  protected $pathAliasManager;

  /**
   * Constructs a new ParcThemeProcess object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   Entity type manager service.
   * @param \Drupal\Core\Routing\CurrentRouteMatch $route_match
   *   Current route match.
   * @param \Drupal\Core\Sesssion\AccountProxyInterface $account
   *   Current user.
   * @param \Drupal\Core\Path\CurrentPathStack $path
   *   Current path.
   * @param \Drupal\path_alias\AliasManager $alias_manager
   *   Path alias manager.
   */
  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    CurrentRouteMatch $route_match,
    AccountProxyInterface $account,
    CurrentPathStack $path,
    AliasManager $alias_manager
  ) {
    $this->entityTypeManager = $entity_type_manager;
    $this->routeMatch = $route_match;
    $this->currentUser = $account;
    $this->currentPath = $path;
    $this->pathAliasManager = $alias_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('current_route_match'),
      $container->get('current_user'),
      $container->get('path.current'),
      $container->get('path_alias.manager')
    );
  }

  /**
   * Preprocess blocks.
   *
   * @see hook_preprocess_block()
   */
  public function preprocessBlock(&$variables) {
    // Apply certain classes to blocks.
    if ($variables['elements']['#base_plugin_id'] == 'block_content') {
      $blockType = strtr($variables['content']['#block_content']->bundle(), '_', '-');
      $variables['attributes']['class'][] = 'block--' . $blockType;
    }
    // Get block element.
    $element =& $variables['elements'];
    $mediaViewBuilder = $this->entityTypeManager->getViewBuilder('media');
    // Get content.
    $content = $element['content']['#block_content'] ?? NULL;
    // Parse multimedia block.
    if ($element['#derivative_plugin_id'] == 'video_block' ||
    (!empty($content->type->target_id) &&
    $content->type->target_id == 'video_block')) {
      // Retrieve video.
      $media = $content->get('field_video')->entity;
      $variables['video_url'] = $mediaViewBuilder
        ->view($media, 'background');
    }

  }

}
