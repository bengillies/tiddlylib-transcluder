/*
 * Transclude some content from one place to another
 */

var Transcluder = (function() {

	var store;
	var attachStore = function(ts) {
		store = ts;
	};

	// find any transclusions and extract the target to transclude
	var findTransclusions = function($html) {
		var _find = function(el, i) {
			var $el = $(el),
				context = {
					href: $el.attr('href'),
					linkText: $el.html()
				};
			return {
				$el: $el,
				target: $el.attr('href'),
				context: $.extend($el.data(), context)
			};
		};
		if ($html.hasClass('transclude')) {
			return [_find($html, 0)];
		} else {
			return $.map($html.find('.transclude'), _find);
		}
	};

	// fetch the target that we want to transclude and extract the appropriate part
	var fetchTarget = function(transclusion, callback) {
		// determine if the target is local
		if (store && !/^(http|\/)/.test(transclusion.target)) {
			store.get(transclusion.target, function(tiddler) {
				if (tiddler) {
					callback(tiddler);
				}
			});
		} else {
			$.ajax({
				url: transclusion.target,
				dataType: 'json',
				success: function(data) {
					callback(data);
				},
				error: function() {
					console.error('xhr failed with:', arguments);
				}
			});
		}
	};

	// render the transclusion into HTML
	var renderTarget = function(res, renderer, context) {
		if (renderer && renderer.render) {
			return renderer.render(res, context);
		} else {
			return res.text;
		}
	};

	// replace the old link with a new transclusion
	var insertTarget = function(transclusion) {
		$('<div class="transclusion" />')
			.html(transclusion.render)
			.data(transclusion.context)
			.insertBefore(transclusion.$el);
		transclusion.$el.remove();
	};

	// take in some html, and perform transclusions on it
	// renderer is an object that has a render function that outputs html
	var transclude = function(html, renderer) {
		var $html = $(html),
			transclusions = findTransclusions($html);
		$.each(transclusions, function(i, transclusion) {
			fetchTarget(transclusion, function(data) {
				transclusion['render'] = renderTarget(data, renderer,
					transclusion.context);
				insertTarget(transclusion);
			});
		});
		return (transclusions.length > 0) ? $html : null;
	};

	var findUnclusions = function($html) {
		var _find = function(el, i) {
			var data = $(el).data(),
				target = data['href'],
				linkText = data['linkText'];
			delete data['href'];
			delete data['linkText'];
			return {
				$el: $(el),
				context: data,
				target: target,
				linkText: linkText
			};
		};
		if ($html.hasClass('transclusion')) {
			return [_find($html)];
		} else {
			return $.map($html.find('.transclusion'), _find);
		}
	};

	var insertUnclusion = function(unclusion) {
		$('<a class="transclude"/>')
			.data(unclusion.context)
			.attr('href', unclusion.target)
			.html(unclusion.linkText)
			.insertBefore(unclusion.$el);
		unclusion.$el.remove();
	};

	var unclude = function(html) {
		var $html = $(html),
			unclusions = findUnclusions($html);
		$.each(unclusions, function(i, unclusion) {
			insertUnclusion(unclusion);
		});

		return (unclusions.length > 0) ? $html : null;
	};

	return {
		transclude: transclude,
		unclude: unclude,
		attachStore: attachStore
	};

}());
