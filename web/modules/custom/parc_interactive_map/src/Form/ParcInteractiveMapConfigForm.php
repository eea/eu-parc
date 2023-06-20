<?php

namespace Drupal\parc_interactive_map\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Configure PARC interactive map settings form.
 */
class ParcInteractiveMapConfigForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'parc_interactive_map_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return ['parc_interactive_map.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $form['map_api_key'] = [
      '#type' => 'textfield',
      '#title' => $this->t('MapTiler API key'),
      '#default_value' => $this->config('parc_interactive_map.settings')->get('map_api_key'),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $this->config('parc_interactive_map.settings')
      ->set('map_api_key', $form_state->getValue('map_api_key'))
      ->save();

    parent::submitForm($form, $form_state);
  }

}
