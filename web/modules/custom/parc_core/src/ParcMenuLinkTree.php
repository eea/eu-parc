<?php

namespace Drupal\parc_core;

use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Controller\ControllerResolverInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Menu\MenuActiveTrailInterface;
use Drupal\Core\Menu\MenuLinkInterface;
use Drupal\Core\Menu\MenuLinkManagerInterface;
use Drupal\Core\Menu\MenuLinkTree;
use Drupal\Core\Menu\MenuTreeStorageInterface;
use Drupal\Core\Routing\RouteProviderInterface;

/**
 * Override core MenuLinkTree service.
 */
class ParcMenuLinkTree extends MenuLinkTree {

  /**
   * The term storage.
   *
   * @var \Drupal\taxonomy\TermStorageInterface
   */
  protected $termStorage;

  /**
   * Constructs a ParcMenuLinkTree object.
   *
   * @param \Drupal\Core\Menu\MenuTreeStorageInterface $tree_storage
   *   The menu link tree storage.
   * @param \Drupal\Core\Menu\MenuLinkManagerInterface $menu_link_manager
   *   The menu link plugin manager.
   * @param \Drupal\Core\Routing\RouteProviderInterface $route_provider
   *   The route provider to load routes by name.
   * @param \Drupal\Core\Menu\MenuActiveTrailInterface $menu_active_trail
   *   The active menu trail service.
   * @param \Drupal\Core\Controller\ControllerResolverInterface $controller_resolver
   *   The controller resolver.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   */
  public function __construct(MenuTreeStorageInterface $tree_storage, MenuLinkManagerInterface $menu_link_manager, RouteProviderInterface $route_provider, MenuActiveTrailInterface $menu_active_trail, ControllerResolverInterface $controller_resolver, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($tree_storage, $menu_link_manager, $route_provider, $menu_active_trail, $controller_resolver);
    $this->termStorage = $entity_type_manager->getStorage('taxonomy_term');
  }

  /**
   * {@inheritdoc}
   *
   * Override core function to allow disabled links to
   * appear in certain cases.
   */
  protected function buildItems(array $tree, CacheableMetadata &$tree_access_cacheability, CacheableMetadata &$tree_link_cacheability) {
    $this->prepareTree($tree);
    $build = parent::buildItems($tree, $tree_access_cacheability, $tree_link_cacheability);
    $this->revertTreeAccess($tree);
    return $build;
  }

  protected function revertTreeAccess(array &$tree) {
    foreach ($tree as &$data) {
      if (!isset($data->originalIsEnabled)) {
        continue;
      }

      $link = $data->link;
      $link->updateLink(['enabled' => $data->originalIsEnabled], FALSE);
    }
  }

  /**
   * Prepare menu tree before display.
   *
   * @param array $tree
   *   The tree.
   */
  protected function prepareTree(array &$tree) {
    foreach ($tree as &$data) {
      // Make sure the links in the main menu are ignored
      // in the process above.
      // Thematic area links in the main menu are displayed through
      // their parents unlike the sidebar menu block.
      if (!empty($data->subtree)) {
        foreach ($data->subtree as $item) {
          $item->isNotThematicAreaLink = TRUE;
        }
      }

      // Set thematic area link as enabled when displayed
      // in the sidebar block.
      /** @var \Drupal\Core\Menu\MenuLinkInterface $link */
      $link = $data->link;
      if ($this->isThematicAreaLink($link) && $data->inActiveTrail) {
        $data->originalIsEnabled = $link->isEnabled();
        if (empty($data->isNotThematicAreaLink)) {
          $link->updateLink(['enabled' => TRUE], FALSE);
        }
        else {
          $link->updateLink(['enabled' => FALSE], FALSE);
        }
      }
    }
  }

  /**
   * Check if a link is a sidebar thematic area link.
   *
   * @param \Drupal\Core\Menu\MenuLinkInterface $link
   *   The link.
   *
   * @return bool
   *   True if a sidebar thematic area link.
   */
  protected function isThematicAreaLink(MenuLinkInterface $link) {
    $url = $link->getUrlObject();

    $is_thematic_area_url = $url->isRouted()
      && $url->getRouteName() == 'entity.taxonomy_term.canonical';

    if (!$is_thematic_area_url) {
      return FALSE;
    }

    $term = $url->getRouteParameters()['taxonomy_term'];
    $term = $this->termStorage->load($term);
    return $term && $term->bundle() == 'thematic_areas';
  }

}
