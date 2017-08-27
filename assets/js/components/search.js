var search = {
  input: $('#search-box'),

  config: {
    id: '8S8P30TVIQ',
    apiKey: 'cd8e164d087bf5cb46bfc6854c8372af',
    index: 'restaurants_list',
    params: {
      facets: [
        'stars_count', 
        'payment_options'
      ],
      filters: 'payment_options:"AMEX" OR payment_options:"Visa" OR payment_options:"MasterCard" OR payment_options:"Discover"',
      disjunctiveFacets: [ 'food_type'],
      getRankingInfo: true,
      aroundLatLngViaIP: true,
      hitsPerPage: 3,
      maxValuesPerFacet: 5
    },
  },

  hits: {
    id: $('#hits'),
    temp: Handlebars.compile($('#hit-template').html()),
    showMore: $('#show-more')
  },
  
  stats: {
    id: $('#stats'),
    temp: Handlebars.compile($('#stats-template').html())
  },

  facets: {
    container: $('#facets'),
    defaultList: $('.facet-list'),
    defaultTemp: Handlebars.compile($('#default-facet-template').html()),
    order: [ 'food_type', 'stars_count', 'payment_options' ],

    food_type: {
      header: 'Cuisine/Food Type',
      id: $('#food-type'),
      sortBy: 'count:desc'
    },
    stars_count: {
      header: 'Rating',
      id: $('#stars-count'),
      temp: Handlebars.compile($('#stars-count-template').html()),
      rating: true
    },
    payment_options: {
      header: 'Payment Options',
      id: $('#payment-options'),
      sortBy: 'name:desc',
      options: ['AMEX', 'Visa', 'MasterCard', 'Discover']
    }
  },

  searchCallback: function(results, helper) {
    this.renderHits(results);

    var btnData = {
      'nbHits': results.nbHits,
      'hitsPerPage': results.hitsPerPage
    };
    this.hits.showMore.data(btnData);
    this.handleShowMoreBtn(btnData, search.hits.showMore);

    if(results.hits.length === 0) {
      this.hits.id.empty().html('No results :(');
      return;
    }

    this.renderFacets(results, helper);
    this.renderStats(results, helper);
  },

  renderHits: function(results) {
    var e = this;
    for(var i = 0; i < results.hits.length; ++i) {
      if( $.isArray(results.hits[i].area) ) {
        results.hits[i].area = results.hits[i].area.join(' / ');
      };

      if( $.isArray(results.hits[i].food_type) ) {
        results.hits[i].food_type = results.hits[i].food_type.join(' & ');
      };

      var starCount = results.hits[i].stars_count;
      var half = false;
      if( starCount % 1 != 0 ) {
        starCount = Math.floor(starCount);
        half = true;
      }

      results.hits[i].star_template = e.starRatingTemplate(starCount, false, half).html();
    }
    this.hits.id.html(this.hits.temp(results));
  },

  renderStats: function(results) {
    var stats = {
      nbHits: results.nbHits,
      nbHits_plural: results.nbHits !== 1,
      processingTimeMS: results.processingTimeMS / 1000.0
    };
    this.stats.id.html(this.stats.temp(stats));
  },

  renderFacets: function(results, helper) {
    var e = this;
    for( var i = 0; i < e.facets.order.length; i++ ) {
      var name = e.facets.order[i];
      var facetResult = results.getFacetByName(name);
      var facetConfig = e.facets[name];
      var header = facetConfig.header;
      var type = $.inArray(name, e.config.params.disjunctiveFacets) ? 'conjunctive' : 'disjunctive';

      var data = {
        id: name,
        header: header,
        type: type
      };

      var f = 0;
      data.content = [];
      var sortBy = {};
      if( facetConfig.sortBy ) {
        sortBy = {sortBy: [ facetConfig.sortBy ]};
      }

      $.map(results.getFacetValues(name, sortBy), function(facetData) {
        if( $.inArray(facetData.name, facetConfig.options) >= 0 || !facetConfig.options ) {
          data.content[f] = facetData;
          f++;
          console.log(facetData.name);
        }
      });

      if( facetConfig.rating ) {
        data.type = 'numeric'
        data.min = facetResult.stats.min;
        data.max = facetResult.stats.max;

        var refinements = helper.getRefinements(name);
        

        data.starsHTML = [];
        for( var s = 0; s <= data.max; s++ ) {  
          var refined = false;
          $.map(refinements, function(r) {
            if(r.value[0] === s) {
              refined = true;
            }
          });

          var starData = {
            html: e.starRatingTemplate(s, data).html(),
            rating: s,
            isRefined: refined
          };
          data.starsHTML.push(starData);
        }
      }

      
      if( facetConfig.temp ) {
        facetConfig.id.html(facetConfig.temp(data));
      } else {
        facetConfig.id.html(e.facets.defaultTemp(data));
      }
    };
  },

  handleFacetClick: function(e, item, helper) {
    e.preventDefault();

    var target = $(item);
    var attribute = target.data('attribute')
    var value = target.data('value');
    var type = target.data('type');

    if( type === 'numeric' ) {
      helper.clearRefinements(attribute).addNumericRefinement(attribute, '>=', value).search();
    } else {
      helper.toggleRefine(attribute,value).search();
    }
  },

  starRatingTemplate: function(rating, data, half) {
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
  },

  handleShowMoreBtn: function(data, btn, show) {
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
}