<?php
  /*
    navigate to file in directory
    ```sh
    $ php ./push.php
    ```
  */

  require_once('../../vendor/algoliasearch-client-php-master/algoliasearch.php');

  $client = new \AlgoliaSearch\Client('44KIH7J8OV', '2996fcd3fd2b1863e7525b40b14c9e9c');
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
      "food_type",
      "stars_count"
    ],
    'numericAttributesForFiltering' => [
      "stars_count"
    ],
    'searchableAttributes' => [
      "name",
      "food_type",
      "city",
      "state"
    ],
    'ranking' => [
      "proximity",
      "exact",
      "filters",
      "geo",
      "words",
      "attribute",
      "typo",
      "custom"
    ],
    'customRanking' => [
      "desc(reviews_count)"
    ]
  ]);
