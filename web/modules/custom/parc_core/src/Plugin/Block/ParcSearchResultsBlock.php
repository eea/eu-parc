<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Component\Plugin\Context\Context;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\Context\ContextDefinition;
use Drupal\Core\Url;
use Drupal\node\NodeInterface;
use Drupal\views\Plugin\Block\ViewsBlock;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a search results block.
 */
class ParcSearchResultsBlock extends ViewsBlock implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The current request.
   *
   * @var \Symfony\Component\HttpFoundation\Request
   */
  protected $request;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->entityTypeManager = $container->get('entity_type.manager');
    $instance->request = $container->get('request_stack')->getCurrentRequest();
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {
    return [
      'bundles' => [],
    ] + parent::defaultConfiguration();
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state) {
    $this->configuration['bundles'] = $form_state->getValue('bundles');
    parent::blockSubmit($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {
    $form = parent::blockForm($form, $form_state);

    $types = [];
    $content_types = $this->entityTypeManager->getStorage('node_type')->loadMultiple();
    foreach ($content_types as $content_type) {
      $types[$content_type->id()] = $content_type->label();
    }

    $form['bundles'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Content types'),
      '#default_value' => $this->getConfiguration()['bundles'],
      '#options' => $types,
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $query_bundles = $this->request->query->get('type');
    $bundles = $this->getConfiguration()['bundles'];
    $bundles = array_filter($bundles, function ($bundle) {
      return !empty($bundle);
    });
    $bundles = !empty($bundles)
      ? implode('+', $bundles)
      : 'all';
    if (!empty($query_bundles) && $query_bundles != $bundles) {
      return [];
    }
    $this->context['type'] = new Context(new ContextDefinition(), $bundles);

    $view_title = $this->getConfiguration()['views_label'];
    $title = '<div class="subview-title">' . $view_title . '</div>';

    if (!$this->isFullPage()) {
      $this->view->getPager()->setItemsPerPage(4);
    }
    $build = parent::build();
    /** @var \Drupal\views\Plugin\views\area\TextCustom $header */
    $header = $this->view->getDisplay()->handlers['header']['area_text_custom'];
    $header->options['content'] = $this->t($title);
    $this->view->getDisplay()->options['bundles'] = $bundles;
    $this->view->getDisplay()->options['view_title'] = $view_title;
    if (!$this->isFullPage()) {
      $build['#attributes']['class'][] = 'teaser-view';
    }
    return $build;
  }

  /**
   * Decide if we should dispaly the full results.
   *
   * @return bool
   *   True if we should display the full results.
   */
  protected function isFullPage() {
    return !empty($this->request->query->get('full_results'));
  }

}
