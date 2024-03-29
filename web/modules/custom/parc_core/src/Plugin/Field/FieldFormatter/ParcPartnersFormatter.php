<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Drupal\taxonomy\TermInterface;

/**
 * Plugin implementation of the 'parc_partners' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_partners",
 *   label = @Translation("PARC Partners"),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class ParcPartnersFormatter extends EntityReferenceFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    foreach ($this->getEntitiesToView($items, $langcode) as $entity) {
      $name = $entity->get('field_name')->value;
      $website = $entity->get('field_link_one')->uri;
      $country_iso2 = NULL;
      $country = $entity->get('field_country')->entity;
      if ($country instanceof TermInterface) {
        $country_iso2 = strtolower($country->get('field_iso2')->value);
        $country_iso2 = " ($country_iso2)";
      }

      $elements[] = [
        '#type' => 'inline_template',
        '#template' => '<a target="_blank" href="{{ url }}">{{ name }}</a>{{ country_iso }}',
        '#context' => [
          'url' => $website,
          'name' => $name,
          'country_iso' => $country_iso2,
        ],
      ];
    }

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    return $field_definition->getName() == 'field_partners';
  }

}
