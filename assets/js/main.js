$(function () {
  // INIT
  var APPLICATION_ID = '8S8P30TVIQ';
  var API_KEY = '0cabafec3faed746f8fc6f55a9fc05d9';
  var INDEX_NAME = 'restaurants_list';
  var PARAMS = {
      facets: ['stars_count', 'payment_options'],
      disjunctiveFacets: ['food_type'],
      getRankingInfo: true,
      aroundLatLngViaIP: true,
      hitsPerPage: 3,
      maxValuesPerFacet: 7
  };

   // CLIENT & HELPER INIT
  var client = algoliasearch(APPLICATION_ID, API_KEY);
  var index = client.initIndex(INDEX_NAME);
  var helper = algoliasearchHelper(client, INDEX_NAME, PARAMS);

  //TEMPLATES
  var hitsTemplate = Handlebars.compile($('#hit-template').html());
  var emptyHitsTemplate = Handlebars.compile($('#empty-hits-template').html());
  var statsTemplate = Handlebars.compile($('#stats-template').html());
  var facetsDefaultTemplate = Handlebars.compile($('#default-facet-template').html());
  var starsCountTemplate = Handlebars.compile($('#stars-count-template').html());

  //DOM BINDING
  var $searchInput = $('#search-box');
  var $hits = $('#hits');
  var $stats = $('#stats');
  var $facetList = $('.facet-list');
  var $showMoreHits = $('#show-more-hits');

  //FACET CONFIG
  var $facets = {
    food_type: {
      id: $('#food-type'),
      header: 'Cuisine/Food Type',
      temp: facetsDefaultTemplate
    },
    payment_options: {
      id: $('#payment-options'),
      header: 'Payment Options',
      temp: facetsDefaultTemplate,
      values: ['AMEX', 'Visa', 'MasterCard', 'Discover']
    },
    stars_count: {
      id: $('#stars-count'),
      header: 'Rating',
      temp: starsCountTemplate
    }
  };

  // SEARCH
  // ======
  $searchInput.on('input propertychange', function(e) {
    var query = e.currentTarget.value;
    helper.setQuery(query).search();
  }).focus();

  // Errors
  helper.on('error', function(error) {
    console.log(error);
  });

  // Search Results
  helper.on('result', function(results, state) {
    searchCallback(results);
  });

  // init search
  helper.search();

  // RENDER SEARCH
  // =============

  // Stats 
  function renderStats(results) {
    var stats = {
      nbHits: results.nbHits,
      nbHits_plural: results.nbHits !== 1,
      processingTimeMS: results.processingTimeMS / 1000.0
    };
    
    $stats.html(statsTemplate(stats));
  }

  // Hits
  function renderHits(results) {
    for(var i = 0; i < results.hits.length; ++i) {
      var starCount = results.hits[i].stars_count;
      var half = false;
      if( starCount % 1 != 0 ) {
        starCount = Math.floor(starCount);
        half = true;
      }

      results.hits[i].star_template = starRatingTemplate(starCount, false, half).html();
    }
    $hits.html(hitsTemplate(results));
  };

  // Disjunctive Facets
  function renderDisjunctiveFacets(results) {
    $.map(results.disjunctiveFacets, function(facet) {
      var i = 0;
      var facetConfig = $facets[facet.name];
      data = {
        id: facet.name,
        header: facetConfig.header,
        content: []
      };

      $.map(results.getFacetValues(facet.name, {sortBy: ['count:desc']}), function(facetData) {
        data.content[i] = facetData;
        i++;
      });

     facetConfig.id.html(facetConfig.temp(data));   
    });
  };

  // Facets
  function renderFacets(results) {
    $.map(results.facets, function(facet) {
      var i = 0;
      var facetConfig = $facets[facet.name];
      var data = {
        id: facet.name,
        header: facetConfig.header,
        content: []
      };

      if( facet.name === 'stars_count') {
        data.type = 'numeric'

        var refinements = helper.getRefinements(facet.name);
        data.starsHTML = [];
        
        for( var s = 0; s <= facet.stats.max; s++ ) {  
          var refined = false;
          $.map(refinements, function(r) {
            if(r.value[0] === s) {
              refined = true;
            }
          });

          var starData = {
            html: starRatingTemplate(s).html(),
            rating: s,
            isRefined: refined
          };
          data.starsHTML.push(starData);
        }
      }

      $.map(results.getFacetValues(facet.name, {sortBy: ['name:desc']}), function(facetData) {
        if( $.inArray(facetData.name, facetConfig.values) >= 0 || !facetConfig.values ) {
          data.content[i] = facetData;
          i++;
        }
      });

     facetConfig.id.html(facetConfig.temp(data))     
    });
  };

  // EVENT BINDING
  // =============
  $facetList.on('click', '.facet-link', function(e) {
    handleFacetClick(e, $(this));
  });

  $showMoreHits.on('click', function(e) {
    var btn = $(this);
    var show = {
      current: btn.data('value'),
      add: 5,
      total: 0
    };

    handleShowMoreBtn(btn.data(), btn, show);
    btn.data('value', show.total);
    
    helper.searchOnce({hitsPerPage: show.total}).then(function(res) {
      searchCallback(res.content);
    });

    // use function below if you want to set the total for each search results
    //helper.setQueryParameter('hitsPerPage', show.total).search();
  });
  

  // HELPER FUNCTIONS
  // ================

  // Search Callback
  function searchCallback(results) {
    renderStats(results);
    if(results.hits.length === 0) {
      $hits.html(emptyHitsTemplate({query: results.query}));
      $showMoreHits.addClass('no-results');
      return;
    }

    renderHits(results);
    renderDisjunctiveFacets(results);
    renderFacets(results);
  }

  // On Facet Click
  function handleFacetClick(e, item) {
    e.preventDefault();

    var target = $(item);
    var attribute = target.data('attribute')
    var value = target.data('value');
    var type = target.data('type');

    if(!attribute || !value && parseInt(value) !== 0) return;
    
    if( type === 'numeric' ) {
      helper.clearRefinements(attribute).addNumericRefinement(attribute, '>=', value).search();
    } else {
      helper.toggleRefine(attribute,value).search();
    }
  }

  // Autocomplete 
  $searchInput.autocomplete(
    {hint: false}, [
    {
      source: $.fn.autocomplete.sources.hits(index, { hitsPerPage: 5 }),
      displayKey: 'name',
      templates: {
        suggestion: function(suggestion) {
          return '<span>' + suggestion._highlightResult.name.value + '</span><span>';
        }
      }
    }
  ]);

  // Show more button
  function handleShowMoreBtn(data, btn, show) {
    //I would like this to sort results differently on each click, but for this demo I will keep as this.
    btn.removeClass('no-results');
    btn.data('value', data.hitsPerPage);

    if( data.nbHits < data.hitsPerPage ) {
      btn.addClass('no-results');
    }

    if( show ) { 
      show.total = show.current + show.add;
      return show;
    }
  }

  // Star HTML
  function starRatingTemplate(rating, half) {
    var starDiv = $('<div></div>');

    var star = {
      full: '<span class="star-rating--star"><i class="fa fa-star" aria-hidden="true"></i></span>',
      half: '<span class="star-rating--star star-rating--star__half"><i class="fa fa-star-half-o" aria-hidden="true"></i></span>',
      empty: '<span class="star-rating--star star-rating--star__empty"><i class="fa fa-star" aria-hidden="true"></i></span>'
    }
    
    for( var i = 0; i < 5; i++ ){
      if( i < rating ) {
        starDiv.append(star.full);
      } else if( i === rating && half ) {
        starDiv.append(star.half);
      } else {
        starDiv.append(star.empty);
      }
    }

    return starDiv;
  };
});