<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Component\Render\FormattableMarkup;
use Drupal\Component\Utility\Unicode;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Path\PathValidatorInterface;
use Drupal\Core\Render\Markup;
use Drupal\Core\Url;
use Drupal\link\LinkItemInterface;
use Drupal\link\Plugin\Field\FieldFormatter\LinkFormatter;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'parc_link' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_link",
 *   label = @Translation("PARC Link"),
 *   field_types = {
 *     "link"
 *   }
 * )
 */
class ParcLinkFormatter extends FormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $element = [];

    foreach ($items as $delta => $item) {
      $url = $this->buildUrl($item);
      $link_title = $url->toString();
      $link_title = parse_url($link_title, PHP_URL_HOST);

      $element[$delta] = [
        '#type' => 'link',
        '#title' => Markup::create($link_title . '<span class="external-link-mark"> ↗</span>'),
        '#options' => $url->getOptions(),
      ];
      $element[$delta]['#url'] = $url;

      if (!empty($item->_attributes)) {
        $element[$delta]['#options'] += ['attributes' => []];
        $element[$delta]['#options']['attributes'] += $item->_attributes;
        // Unset field item attributes since they have been included in the
        // formatter output and should not be rendered in the field template.
        unset($item->_attributes);
      }
    }

    return $element;
  }

  /**
   * Builds the \Drupal\Core\Url object for a link field item.
   *
   * @param \Drupal\link\LinkItemInterface $item
   *   The link field item being rendered.
   *
   * @return \Drupal\Core\Url
   *   A Url object.
   */
  protected function buildUrl(LinkItemInterface $item) {
    try {
      $url = $item->getUrl();
    }
    catch (\InvalidArgumentException $e) {
      // @todo Add logging here in https://www.drupal.org/project/drupal/issues/3348020
      $url = Url::fromRoute('<none>');
    }

    $options['attributes']['target'] = '_blank';
    $url->setOptions($options);

    return $url;
  }

}
