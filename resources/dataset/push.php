<?php
  /*
    navigate to file in directory
    ```sh
    $ php ./push.php
    ```
  */

  require_once('../../vendor/algoliasearch-client-php-master/algoliasearch.php');

  $client = new \AlgoliaSearch\Client('8S8P30TVIQ', 'bcc1f0e323c0ee4de33e044295af4708');
  $index = $client->initIndex('restaurants_list');

  function checkIfHierarchicalFacets($string) {
    if( is_string($string) && strpos($string, ' / ') ) {
      return true;
    } else {
      return false;
    }
  }

  function formatHierarchicalFacets($string) {
    $facetLevels = explode(' / ', $string);
    $hierarchicalFacets = array();
    $i = 0;
    foreach( $facetLevels as $facet ) {
      if( $i > 0 ) {
        $parent = $i - 1;
        $facet = $hierarchicalFacets['lvl' . $parent] . ' > ' . $facet;
      };
      $hierarchicalFacets['lvl' . $i] = $facet;
      $i++;
    }
    return $hierarchicalFacets;
  };

  function getHierarchicalName($string) {
    $facetLevels = explode(' / ', $string);
    return $facetLevels[0];
  }

  $file = './restaurants_list.json';
  if( !file_exists($file) || !is_readable($file) )
      return false;

  $records = json_decode(file_get_contents($file), true);

  foreach( $records as $key => $record ) {
    //for the sake of this demo, I will set it up just for the hierarchical facets to get this, otherwise I would set this up a bit differently
    foreach( $record as $item => $string ) {
      $hierarchical = checkIfHierarchicalFacets($string);
      if( $hierarchical ) {
        $records[$key][$item] = explode(' / ', $string);
        $records[$key]['hierarchical' . ucfirst($item)] = formatHierarchicalFacets($string);
      }
    }
  }

  $chunks = array_chunk($records, 1000);

  foreach ($chunks as $batch) {
    $index->addObjects($batch);
  }

  $file = './restaurants_info.csv';
  if( !file_exists($file) || !is_readable($file) )
      return false;

  $header = null;
  $data = array();

  function checkInteger($n) {
    if( is_numeric ($n) ){
      $n = floatval($n);
    } 
    return $n;
  }
  
  if( ($handle = fopen($file, 'r')) !== false ) {
    while( ($row = fgetcsv($handle, 0, ';')) !== false ) {
      if( !$header )
        $header = $row;
      else
        $data[] = array_combine($header, array_map('checkInteger', $row));
    }

    foreach( $data as $key => $record ) {    
      foreach( $record as $item => $string ) {
        $hierarchical = checkIfHierarchicalFacets($string);
        if( $hierarchical ) {
          $data[$key][$item] = explode(' / ', $string);
          $data[$key]['hierarchical' . ucfirst($item)] = formatHierarchicalFacets($string);
        } 
      }
    }

    $updates = array();
    foreach($data as $object) {
      array_push( $updates, $object );
    }

    $updateChucks = array_chunk($updates, 1000);

    foreach( $updateChucks as $batch ) {
      $index->partialUpdateObjects($batch);
    }

    fclose($handle);
  }

  $index->setSettings([
    'attributesForFaceting' => [
      "payment_options",
      "searchable(food_type)",
      "stars_count"
    ],
    'searchableAttributes' => [
      "unordered(name)",
      "address",
      "city,neighborhood",
      "food_type"
    ],
    'ranking' => [
      "typo",
      "geo",
      "words",
      "filters",
      "proximity",
      "attribute",
      "exact",
      "custom"
    ]
  ]);