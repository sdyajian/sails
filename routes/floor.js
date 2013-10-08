var log = require('log4js').getLogger(),
	Store = require("../model/store"),
    Floor = require("../model/floor"),
    Building = require("../model/building"),
    fs = require('fs'),
	path = require('path'),
	mkdirp = require("mkdirp"),
	parseString = require('xml2js').parseString,
	config = require('../config/config');
	

// Static variable
var	mapinfo_path = "/" + config.mapInfoPath;

// GET Page of specific building
exports.show = function(req, res) {

	Floor.findById(req.params._id, function(err, floor) {

		if (err)
			log.error(err);

		if(floor)
			res.render("floor/floor-show.html", {
				floor: floor
			});

	});

};

// GET Interface for read specific floor
exports.read = function(req, res) {

	// Get floor
	Floor.findById(req.params._id, function(err, floor) {

		if (err)
			log.error(err);

		if (floor) {
			res.send(200, floor);
		}

	});

};

// GET Interface for list floors of specific building
exports.list = function(req, res) {

	Floor.find({

		buildingId: req.query.buildingId

	}).sort({layer: -1}).execFind(function(error, floors){

		if (error)
			log.error(error);

		res.send(200, floors);

	});

};

// POST Interface for create floor of building
exports.create = function(req, res) {

	if(req.body.buildingId && req.body.layer){

		Building.findById(req.body.buildingId, function(error, building){
			
			var layer;
			if(req.body.layer>0){
				building.upfloor = building.upfloor + 1;
				layer = building.upfloor;
			}else{
				building.downfloor =  building.downfloor + 1;
				layer = -(building.downfloor);				
			}

			building.save(function(err, building){
				
				if(err)
					log.error(err);
				
				if(building)
					new Floor({
	
						layer: layer,
	
						buildingId: req.body.buildingId
	
					}).save(function(error, floor){
	
							building.save(function(){
								res.send(200, floor);
							});
	
					});				
				
			});

		});		
		
	}

};

// POST Interface for update floor of building
exports.update = function(req, res) {

    if(req.body._id){

        // Get building
        Floor.findById(req.body._id, function(err, floor){

            if(err)
                log.error(err);

            if(floor){
                floor.name = req.body.name;
                floor.desc = req.body.desc;
                floor.save(function(){
                    res.send(200, floor);
                });
            }

        });

    }

};

// POST Interface for upload path.xml and map.xml
exports.uploadMapAndPath = function(req, res) {

	if(req.body._id && req.files.map && req.files.path){

	    Floor.findById(req.body._id, function(err, floor) {

	        // Get the temporary location of the file
	        var tmpPathPath = req.files.path.path,
	            tmpPathMap = req.files.map.path;

	        // File path: /${USER._ID}/${BUILDING._ID}/${FLOOR._ID}
	        var webLocation = req.user._id + "/" + floor.buildingId + "/" + floor.layer,
	            folderPath = path.dirname() + mapinfo_path + '/' + webLocation;	        
            mkdirp(folderPath, function(err, dd) {
                if (err)
                    log.error(err);

                var targetPathPath = folderPath + "/path.xml",
                    targetPathMap = folderPath + "/map.xml";

                log.info("targetPathPath: " + targetPathPath);
                log.info("targetPathMap: " + targetPathMap);

                // Move file from temp to target
                fs.rename(tmpPathPath, targetPathPath, function(err) {

                    if (err)
                        log.error(err);

                    fs.rename(tmpPathMap, targetPathMap, function(err) {

                        if (err)
                            log.error(err);

                        floor.path = webLocation + "/path.xml";
                        floor.map = webLocation + "/map.xml";
                        floor.lastXmlUpdateTime = new Date();                        
                        floor.save(function(err, floor) {

                            if (err)
                                log.error(err);

                            if (floor)
                                res.send(200, floor);

                            // Delete the temporary file
                            fs.unlink(tmpPathMap, function(err){});
                            fs.unlink(tmpPathPath, function(err){});

                        });

                    });

                });

            });

	    });

	}

};

// POST Interface for upload render.xml and region.xml
exports.uploadRenderAndRegion = function(req, res) {

	if(req.body._id && req.files.render && req.files.region){

	    Floor.findById(req.body._id, function(err, floor) {

            // Get the temporary location of the file
            var tmpPathRender = req.files.render.path,
                tmpPathRegion = req.files.region.path;

            // File path: /${USER._ID}/${BUILDING._ID}/${FLOOR._ID}
            var webLocation = req.user._id + "/" + floor.buildingId + "/" + floor.layer,
                folderPath = path.dirname() + mapinfo_path + '/' + webLocation;

            mkdirp(folderPath, function(err, dd) {
                if (err)
                    log.error(err);

                var targetPathRender = folderPath + "/render.xml",
                    targetPathRegion = folderPath + "/region.xml";

                log.info("targetPathRender: " + tmpPathRender);
                log.info("targetPathRegion: " + tmpPathRegion);

                // Move file from temp to target
                fs.rename(tmpPathRender, targetPathRender, function(err) {

                    if (err)
                        log.error(err);

                    fs.rename(tmpPathRegion, targetPathRegion, function(err) {

                        if (err)
                            log.error(err);

                        floor.render = webLocation + "/render.xml";
                        floor.region = webLocation + "/region.xml";
                        floor.save(function(err, floor) {

                            if (err)
                                log.error(err);

                            if (floor)
                                res.send(200, floor);

                            // Start to parse region.xml
                            fs.readFile(targetPathRegion, 'utf8', function (err, data) {

                                if(err)
                                  log.error(err);

                                if(data)
                                    parseRegion(data, req.body._id);

                                // Delete the temporary file
                                fs.unlink(tmpPathRender, function(err){});
                                fs.unlink(tmpPathRegion, function(err){});
                            });

                        });

                    });

                });

            });

	    });

	}

};


// Function for parse regions and create stores on these floor
function parseRegion(regionXMLString, floorId, next){
	
	parseString(regionXMLString, function (err, result) {
		
	    var ways = result.osm.way;
	    Store.find({
	    	
	    	floorId : floorId
	    	
	    }, function(err, stores){

	    	if(err)
	    		log.error(err);

		    ways.forEach(function(way){

		    	var tags = way.tag;
		    	tags.forEach(function(tag){

		    		//console.log(tag.$);
		    		var tagInfo = tag.$;
		    		if(tagInfo.k == "label"){

		    			var name = tagInfo.v,
		    				isDuplicate = false;
		    			console.log(name);

		    			// Check is duplicate
		    			for(var i=0; i< stores.length; i++){
		    				if(name == stores[i].name){
		    					isDuplicate = true;
		    					break;
		    				}
		    			}

		    			if(!isDuplicate){

	    					Store.create({

	    						name: tagInfo.v,
	    						floorId: floorId

	    					}, function(error, store){
	    						if(error)
	    							log.error(error);

	    						if(store)
	    							log.info("Create new store " + name + " successfully");
	    					});

		    			}else{

		    				log.info("Duplicate store name " + name);

		    			}

		    		}

		    	});

		    });


	    });


	});

}

// GET Interface for get mapzip file of specific building
exports.getMapzip = function(req, res){
	
    if(req.query.mapzip){

        var fileName = req.query.mapzip,
            filePath = path.dirname() + "/" + config.mapInfoPath + '/' + fileName,
            stat = fs.statSync(filePath);
            
        try{

            res.writeHead(200, {
                "Content-type": "application/octet-stream",
                "Content-disposition": "attachment; filename=mapzip",
                "Content-Length": stat.size
            });

            var readStream = fs.createReadStream(filePath);

            // We replaced all the event handlers with a simple call to util.pump()
            readStream.pipe(res);

        }catch(e){

            log.error(e);

        }
    }

};

// POST Interface for upload mapzip
exports.uploadMapzip = function(req, res) {
	
    if(req.body._id && req.files.mapzip){

        // Get file name and extension
        var fileName = req.files.mapzip.name,
            extension = path.extname(fileName).toLowerCase() === '.zip' ? ".zip" : null ||
                        path.extname(fileName).toLowerCase() === '.rar' ? ".rar" : null;

        // Check file format by extension
        if(extension){

            // Get floor
            Floor.findById(req.body._id, function(err, floor) {

                if(err)
                    log.error(err);

                if(floor){

                    // Get the temporary location of the file
                    var tmpPath = req.files.mapzip.path;

                    // File path: /${USER._ID}/${BUILDING._ID}/${FLOOR._ID}
                    var webLocation = req.user._id + "/" + floor.buildingId + "/" + floor.layer,
                        folderPath = path.dirname() + mapinfo_path + '/' + webLocation;

                    mkdirp(folderPath, function(err, dd) {

                        var targetPath = folderPath + "/mapzip" + extension;
                        fs.rename(tmpPath, targetPath, function(err) {

                            if (err)
                                log.error(err);

                            floor.mapzip = webLocation + "/mapzip" + extension;
                            floor.save(function(err, floor) {

                                if (err)
                                    log.error(err);

                                if (floor)
                                    res.send(200, floor);

                                // Delete the temporary file
                                fs.unlink(tmpPath, function(err){});

                            });

                        });

                    });

                }

            });

        }else{

            res.send(200, { msg: "File extension should be .zip or .rar." });
        }

    }

};
