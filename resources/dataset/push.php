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

  $file = './restaurants_list.json';
  if( !file_exists($file) || !is_readable($file) )
      return false;

  $records = json_decode(file_get_contents($file), true);
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