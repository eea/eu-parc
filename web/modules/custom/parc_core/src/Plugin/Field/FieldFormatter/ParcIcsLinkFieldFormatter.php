<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Url;
use Drupal\ics_link_field\Plugin\Field\FieldFormatter\IcsLinkFieldFormatter;

/**
 * Plugin implementation of the 'ics_link_field_formatter' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_ics_link_field_formatter",
 *   label = @Translation("PARC ICS Link Field Formatter"),
 *   field_types = {
 *     "ics_link_field_type"
 *   }
 * )
 */
class ParcIcsLinkFieldFormatter extends IcsLinkFieldFormatter {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode): array {
    $elements = parent::viewElements($items, $langcode);

    foreach ($elements as $delta => $element) {
      $elements[$delta]['#url'] = Url::fromRoute('parc_core_ics_link_field.download', [
        'entity_type' => $this->fieldDefinition->get('entity_type'),
        'field_name' => $this->fieldDefinition->get('field_name'),
        'entity' => $items->getParent()->getEntity()->id(),
      ]);
    }

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    return $field_definition->getTargetBundle() == 'events';
  }

}
