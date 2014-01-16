
/*
 * GET home page.
 */

exports.welcome = function(req, res){

  	res.render('welcome', { title: 'Hello, World!' });
};


exports.index = function(req, res){
	//console.log("kkrearafdsfdd");
  res.render('index', { title: 'Six-degrees' });
};


exports.search = function(req, res){
	//console.log("kkrearafdsfdd");
  res.render('search', { title: 'Search' });
};




