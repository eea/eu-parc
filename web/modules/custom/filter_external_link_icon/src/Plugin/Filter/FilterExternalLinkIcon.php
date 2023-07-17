<?php

namespace Drupal\filter_external_link_icon\Plugin\Filter;

use Drupal\Component\Utility\Html;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A filter that attaches an icon to any anchor in a page.
 *
 * @Filter(
 *   id = "filter_external_link_icon",
 *   title = @Translation("External Link Icon Filter"),
 *   type = Drupal\filter\Plugin\FilterInterface::TYPE_TRANSFORM_REVERSIBLE,
 *   settings = {
 *     "icon" = {},
 *   },
 *   weight = 0
 * )
 */
class FilterExternalLinkIcon extends FilterBase implements ContainerFactoryPluginInterface {

  /**
   * The current request object.
   *
   * @var \Symfony\Component\HttpFoundation\Request|null
   */
  protected $request;

  /**
   * Constructs a FilterExternalLinkIcon object.
   *
   * @param array $configuration
   *   The plugin configuration.
   * @param string $plugin_id
   *   The plugin ID.
   * @param mixed $plugin_definition
   *   The plugin definition.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The request stack.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, RequestStack $request_stack) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->request = $request_stack->getCurrentRequest();
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('request_stack')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode) {
    $dom = Html::load($text);
    $anchors = $dom->getElementsByTagName('a');
    foreach ($anchors as $anchor) {
      $current_domain = parse_url($this->request->getSchemeAndHttpHost(), PHP_URL_HOST);
      $current_domain = preg_replace('/^www\./', '', $current_domain);
      $href = parse_url($anchor->getAttribute('href'), PHP_URL_HOST);

      if ($href && $href != $current_domain) {
        $anchor->nodeValue = $anchor->nodeValue . ' ' . $this->settings['icon'];
      }
    }
    return new FilterProcessResult(Html::serialize($dom));
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $form['icon'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Icon'),
      '#default_value' => $this->settings['icon'],
      '#description' => $this->t('Enter the icon to use for external links.'),
    ];
    return $form;
  }

}
