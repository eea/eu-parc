<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\system\Plugin\Block\SystemMenuBlock;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a Thematic Areas menu block.
 *
 * @Block(
 *   id = "parc_thematic_areas_menu",
 *   admin_label = @Translation("Thematic Areas Menu"),
 *   category = @Translation("Menus"),
 *   forms = {
 *     "settings_tray" = "\Drupal\system\Form\SystemMenuOffCanvasForm",
 *   },
 * )
 */
class ThematicAreasMenuBlock extends SystemMenuBlock {

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('parc_core.menu_link_tree'),
      $container->get('menu.active_trail')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $build = parent::build();

    $build['#theme'] = 'menu__main__thematic_areas';
    foreach ($build['#items'] as &$link) {
      /** @var \Drupal\menu_link_content\MenuLinkContentInterface $original_link */
      $original_link = $link['original_link'];
      if (!$original_link->isEnabled()) {
        $link['is_disabled'] = TRUE;
      }
    }

    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function getDerivativeId() {
    return 'main';
  }

}
