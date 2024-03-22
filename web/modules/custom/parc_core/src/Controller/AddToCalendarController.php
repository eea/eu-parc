<?php

namespace Drupal\parc_core\Controller;

use Drupal\Component\Transliteration\TransliterationInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Utility\Token;
use Drupal\ics_link_field\Controller\ServiceController;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\File\FileSystem;
use Drupal\Component\Utility\Html;
use Eluceo\iCal\Component\Calendar;
use Eluceo\iCal\Component\Event;

/**
 * Class AddToCalendarController.
 *
 * @package Drupal\ics_link_field\Controller
 */
class AddToCalendarController extends ServiceController {

  /**
   * {@inheritdoc}
   *
   * Override base function to make it work with date fields
   * that have multiple values.
   */
  public function icsDownload(string $field_name, EntityInterface $entity): Response {
    if (empty($entity)) {
      throw new NotFoundHttpException();
    }

    if (!$entity->hasField($field_name) || $entity->get($field_name)->isEmpty()) {
      throw new NotFoundHttpException();
    }

    $entity_type = $entity->getEntityTypeId();
    $bundle = $entity->bundle();
    $field_config_name = implode(".", [$entity_type, $bundle, $field_name]);
    $field_config = $this->entityTypeManager()->getStorage('field_config')->load($field_config_name);
    $field_settings = $field_config->getSettings();

    $data = [$entity_type => $entity];

    foreach ($field_settings as &$setting_value) {
      $setting_value = $this->token->replace($setting_value, $data, ['clear' => TRUE]);
    }

    $host = $this->request->getCurrentRequest()->getHost();
    $vCalendar = new Calendar($host);

    foreach ($entity->get('field_date')->getValue() as $item) {
      $start_date = date('Y-m-d', $item['value']);
      $end_date = date('Y-m-d', $item['end_value']);

      $start_time = date('H:i:s', $item['value']);
      $end_time = date('H:i:s', $item['end_value']);

      // Full day.
      if ($item['duration'] % 1440 == 1439) {
        $event = $this->createEvent($field_settings, new \DateTime($start_date), new \DateTime($start_date), TRUE);
        $vCalendar->addComponent($event);
      }
      else {
        $daily_start = new \DateTime($start_date . " " . $start_time);
        $daily_end = new \DateTime($end_date . " " . $end_time);

        $event = $this->createEvent($field_settings, $daily_start, $daily_end);
        $vCalendar->addComponent($event);
      }
    }

    $langcode = $this->languageManager()->getCurrentLanguage()->getId();
    $filename = $this->transliteration->transliterate('event-' . strtolower(Html::cleanCssIdentifier($field_settings['title'])), $langcode) . '.ics';
    $content = $vCalendar->render();

    $response = new Response($content);

    // Create the disposition of the file.
    $disposition = $response->headers->makeDisposition(
      ResponseHeaderBag::DISPOSITION_ATTACHMENT,
      $filename
    );

    // Set the content disposition.
    $response->headers->set('Content-Disposition', $disposition);
    $response->headers->set('Content-Type', ['text/calendar', 'charset=utf-8']);

    // @TODO: add caching per entity
    // Dispatch request.
    return $response;
  }

  /**
   * {@inheritdoc}
   */
  protected function createEvent(array $field_settings, \DateTime $dtStart, \DateTime $dtEnd, bool $noTime = FALSE): Event {
    $event = parent::createEvent($field_settings, $dtStart, $dtEnd, $noTime);
    $event->setDescriptionHTML($event->getDescription());
    $event->setDescription(strip_tags($event->getDescription()));
    return $event;
  }

}
