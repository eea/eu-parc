<?php

use Drupal\node\Entity\Node;

// Load all nodes of type 'project'.
$query = \Drupal::entityQuery('node')
  ->condition('type', 'project')
  ->accessCheck(FALSE);
$nids = $query->execute();

// Load and delete each node.
foreach ($nids as $nid) {
  $node = Node::load($nid);
  if ($node) {
    $node->delete();
  }
}

?>
