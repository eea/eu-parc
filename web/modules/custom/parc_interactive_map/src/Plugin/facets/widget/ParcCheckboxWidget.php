<?php

namespace Drupal\parc_interactive_map\Plugin\facets\widget;

use Drupal\Core\Url;
use Drupal\facets\FacetInterface;
use Drupal\facets\Plugin\facets\widget\CheckboxWidget;
use Drupal\facets\Result\ResultInterface;

/**
 * The checkbox / radios widget.
 *
 * @FacetsWidget(
 *   id = "parc_checkbox",
 *   label = @Translation("PARC List of checkboxes"),
 *   description = @Translation("A configurable widget that shows a list of checkboxes"),
 * )
 */
class ParcCheckboxWidget extends CheckboxWidget {

  /**
   * {@inheritdoc }
   */
  protected function buildResultItem(ResultInterface $result) {
    $build = parent::buildResultItem($result);

    if (!empty($result->getChildren())) {
      $build['#theme'] = 'facets_result_item_with_children';
      $build['#parent_id'] = $result->getRawValue();
    }

    return $build;
  }

  protected function buildListItems(FacetInterface $facet, ResultInterface $result) {
    $build = parent::buildListItems($facet, $result);

    /** @var \Drupal\Core\Url $url */
    $url = $build['#url'] ?? NULL;

    if (!$url instanceof Url) {
      return $build;
    }

    $query = $url->getOption('query');
    unset($query['focus']);
    $url->setOption('query', $query);
    $build['#url'] = $url;

    return $build;
  }

}
