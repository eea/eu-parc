<?php

namespace Drupal\parc_core\Plugin\CKEditorPlugin;

use Drupal\ckeditor\CKEditorPluginBase;
use Drupal\editor\Entity\Editor;

/**
 * Defines the "indented_paragraph" plugin.
 *
 * @CKEditorPlugin(
 *   id = "indented_paragraph",
 *   label = @Translation("Indented Paragraph Container Manager")
 * )
 */
class IndentedParagraph extends CKEditorPluginBase {

  /**
   * {@inheritdoc}
   */
  public function getFile() {
    return $this->getModulePath('parc_core') . '/js/plugins/indented_paragraph/plugin.js';
  }

  /**
   * {@inheritdoc}
   */
  public function getButtons() {
    return [
      'IndentParagraph' => [
        'label' => $this->t('Indent Paragraph'),
        'image' => $this->getModulePath('parc_core') . '/js/plugins/indented_paragraph/icons/indented_paragraph.png',
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getConfig(Editor $editor) {
    return [];
  }

}
