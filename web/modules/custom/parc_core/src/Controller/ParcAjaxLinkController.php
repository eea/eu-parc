<?php

namespace Drupal\parc_core\Controller;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\AppendCommand;
use Drupal\Core\Ajax\RemoveCommand;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\CssSelector\CssSelectorConverter;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Controller for ajax links.
 *
 * @package Drupal\parc_core\Controller
 */
class ParcAjaxLinkController extends ControllerBase {

  /**
   * An HTTP kernel for making subrequests.
   *
   * @var \Symfony\Component\HttpKernel\HttpKernelInterface
   */
  protected $httpKernel;

  /**
   * The request stack.
   *
   * @var \Symfony\Component\HttpFoundation\RequestStack
   */
  protected $requestStack;

  /**
   * Renderer definition.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * Create an ajax response instance.
   *
   * @param \Symfony\Component\HttpKernel\HttpKernelInterface $http_kernel
   *   An HTTP kernel for making subrequests.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The request stack.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   Renderer service.
   */
  public function __construct(HttpKernelInterface $http_kernel, RequestStack $request_stack, RendererInterface $renderer) {
    $this->httpKernel = $http_kernel;
    $this->requestStack = $request_stack;
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
    $container->get('http_kernel'),
    $container->get('request_stack'),
    $container->get('renderer')
    );
  }

  /**
   * Response to the ajax pagination reloading the content area.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   THe HTTP Request.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The Ajax replacement response.
   *
   * @throws \Exception
   */
  public function ajax(Request $request) {
    $requestPath = $request->get('path');
    $selector = $request->get('selector');
    $method = $request->get('method');
    $nid = $request->get('nid');
    if (!empty($nid)) {
      $entityManager = $this->entityTypeManager();
      $view_builder = $entityManager->getViewBuilder('node');
      $storage = $entityManager->getStorage('node');
      $node = $storage->load($nid);
      $build = $view_builder->view($node, 'compact');
      $output = $this->renderer->renderRoot($build);
      $nodeHtml = $output->__toString();
      $response = new AjaxResponse();
      $response->addCommand(new ReplaceCommand($selector, $nodeHtml));
      return $response;
    }
    // Keep path only.
    $path = preg_replace('/^https?:\/\/[^\/]+\/(.*)/', '/$1', $requestPath);
    [, $queryString] = explode('?', $path);

    // Override server informations about path and query string.
    $server = $request->server;
    $server = [
      'REQUEST_URI' => $path,
      'QUERY_STRING' => $queryString,
      'argv' => [
        0 => $queryString,
      ],
    ] + $server->all();

    $currentRequest = $this->requestStack->getCurrentRequest();
    // Create request to generate page.
    $newRequest = Request::create($path, $request->getMethod(), [], $currentRequest->cookies->all(), $currentRequest->files->all(), $server);
    $response = $this->httpKernel->handle($newRequest, HttpKernelInterface::SUB_REQUEST);

    // Get the selector which define which markup we want to replace.
    $converter = new CssSelectorConverter();
    $xpathQuery = $converter->toXPath($selector);

    // Extract only the content we want to replace.
    $dom = new \DomDocument();
    $dom->loadHTML($response->getContent());
    $xpath = new \DOMXpath($dom);
    $elements = $xpath->query("//$xpathQuery");
    $html = '';
    if ($elements->count() === 0) {
      // No parent element is found, by default take parent of link and use
      // default selector to javascript replacement.
      $xpathQuery = $converter->toXPath('a.ajax-link');
      $elements = $xpath->query("//$xpathQuery/..");
    }

    $element = $elements->item(0);
    $response = new AjaxResponse();
    switch ($method) {
      case 'replace':
        $html = $dom->saveHTML($element);
        $response->addCommand(new ReplaceCommand($selector, $html));
        break;

      case 'append':
        foreach ($element->childNodes as $child) {
          $html .= $child->ownerDocument->saveHTML($child);
        }
        $response->addCommand(new RemoveCommand('a.ajax-link'));
        $response->addCommand(new AppendCommand($selector, $html));
        break;

    }

    return $response;
  }

}
