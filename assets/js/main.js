$(function () {
  var client = algoliasearch(search.config.id, search.config.apiKey);
  var index = client.initIndex(search.config.index);
  var helper = algoliasearchHelper(client, search.config.index, search.config.params);

  helper.setQueryParameter('getRankingInfo', true);

  search.input.on('input propertychange', function(e) {
    var query = e.currentTarget.value;
    helper.setQuery(query).search();
  }).focus();

  helper.on('result', function(results) {
    search.searchCallback(results, helper); 
  });

  search.hits.showMore.on('click', function(e) {
    var btn = $(this);
    var show = {
      current: btn.data('value'),
      add: 5,
      total: 0
    };

    search.handleShowMoreBtn(btn.data(), btn, show);
    btn.data('value', show.total);
    
    //set total number even when switching categories -- I purposely wanted it this way
    helper.setQueryParameter('hitsPerPage', show.total).search();
  });

  search.facets.defaultList.on('click', 'a.facet-link', function(e) {
    search.handleFacetClick(e, this, helper);
  });

  helper.search();
});