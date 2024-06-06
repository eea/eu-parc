<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;

/**
 * Plugin implementation of the 'parc_contacts' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_contacts",
 *   label = @Translation("Contacts paragraphs"),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class ParcContactsFormatter extends EntityReferenceFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    foreach ($this->getEntitiesToView($items, $langcode) as $paragraph) {
      $name = $paragraph->get('field_name')->value;
      $email = $paragraph->get('field_email')->value;

      if (empty($email)) {
        continue;
      }

      $elements[] = [
        '#type' => 'inline_template',
        '#template' => '<a href="{{ email }}">{{ name }}</a>',
        '#context' => [
          'email' => $email,
          'name' => $name ?? $email,
        ],
      ];
    }

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    return $field_definition->getName() == 'field_lab_contacts';
  }

}
