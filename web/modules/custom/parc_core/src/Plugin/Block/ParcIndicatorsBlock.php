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
    $indicators = $this->getIndicators();

    $groups = [
      'output' => [
        'label' => $this->t('Output'),
        'items' => [],
      ],
      'outcome' => [
        'label' => $this->t('Outcome'),
        'items' => [],
      ],
      'impact' => [
        'label' => $this->t('Impact'),
        'items' => [],
      ],
    ];

    $view_builder = $this->entityTypeManager->getViewBuilder('node');
    foreach ($indicators as $indicator) {
      $type = $indicator->get('field_indicator_type')->value;

      $groups[$type]['items'][] = $view_builder->view($indicator, 'teaser');
    }

    return [
      '#theme' => 'parc_indicator_groups',
      '#groups' => $groups,
    ];
  }

  /**
   * Get all the indicators.
   *
   * @return \Drupal\node\NodeInterface
   *   The indicators.
   */
  protected function getIndicators() {
    /** @var \Drupal\node\NodeStorageInterface $node_storage */
    $node_storage = $this->entityTypeManager->getStorage('node');
    $query = $node_storage
      ->getQuery()
      ->accessCheck()
      ->condition('type', 'indicator')
      ->sort('title')
      ->condition('status', 1);

    $nids = $query->execute();
    /** @var \Drupal\node\NodeInterface $projects */
    $projects = $node_storage->loadMultiple($nids);

    return $projects;
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    return Cache::mergeTags(parent::getCacheTags(), [
      'node_list:indicator',
    ]);
  }

}
