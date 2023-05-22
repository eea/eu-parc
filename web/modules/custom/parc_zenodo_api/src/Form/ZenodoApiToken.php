<?php

namespace Drupal\parc_zenodo_api\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * The module configuration form.
 */
class ZenodoApiToken extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'parc_zenodo_api.adminsettings',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'parc_zenodo_api_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('parc_zenodo_api.adminsettings');

    $form['token'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Zenodo API Token'),
      '#description' => $this->t('Zenodo API Token for the callbacks.'),
      '#default_value' => $config->get('token'),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    parent::submitForm($form, $form_state);

    $this->config('parc_zenodo_api.adminsettings')
      ->set('token', $form_state->getValue('token'))
      ->save();
  }

}
