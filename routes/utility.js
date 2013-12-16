var log = require('log4js').getLogger(), 
	fs = require('fs'),
	zlib = require('zlib'),
	unzip = require('unzip'),	
	path = require('path'),
	User = require("../model/user"),
	Building = require("../model/building"),
	Floor = require("../model/floor"),
	Store = require("../model/store"),    
	Ad = require("../model/ad"),
	AccountActivateToken = require("../model/accountActivateToken"),	
	mailer = require('../config/nodemailerSetup'),
	mkdirp = require("mkdirp"),
	config = require('../config/config.js'),
	builder = require('xmlbuilder'),	
	archiver = require('archiver'),
	parseString = require('xml2js').parseString;


/**
 * Utility function 
 */
function Utility(){}

Utility.applicationInfo = {
	sampleBuildingId : ""
}

// Error code and response error msg
Utility.errorResInfo = {
		
	SUCCESS : {
		msg: {},
		code: 200					
	},	
				
	ERROR_PERMISSION_DENY : {		
		msg: "You have no permission to access",
		code: 403		
	},

	BUILDING_OVER_LIMITATION_DENY : {		
		msg: "Building number is over limitation.",
		code: 403		
	},

	FLOOR_OVER_LIMITATION_DENY : {		
		msg: "Floor number is over limitation.",
		code: 403		
	},

	BASEMENT_OVER_LIMITATION_DENY : {		
		msg: "Basement number is over limitation.",
		code: 403		
	},					
	
	INTERNAL_SERVER_ERROR : {
		msg: "Internal server error, please try again later",
		code: 500				
	},
	
	INCORRECT_PARAMS : {
		msg: "Incorrect params",
		code: 400				
	},
	
	INCORRECT_FILE_TYPE : {
		msg: "Incorrect file type",
		code: 400				
	},

	EMPTY_RESULT : {
		msg: "empty result",
		code: 204				
	},

	
};

// Check the permission about specific model relative to specific user
Utility.validatePermission = function(user, obj, type, next, isRead){
	
	switch(type){
		
		// Building Model
		case Building.modelName:
			
			var result = false;
			if ( isRead && obj.pub ) {

				result = true;

			} else if ( (obj && obj.userId == user.id.toString()) || user.role == User.ROLES.ADMIN) {

				result = true;

			} else {

				result = false;

			}			
			next(result);
			break;
		
		// Floor Model	
		case Floor.modelName:
			
			var result = false;			
			if(user.role == User.ROLES.ADMIN) {

				result = true;
				next(result);

			} else {

				Building.findById( obj.buildingId, function(err, building) {

					if(err) {

						log.error(err);					
					
					} else {

						if( building && building.userId == user.id.toString() )
							result = true;

						if( building && isRead && building.pub )
							result = true;

					}
					next(result);

				});

			}
			break;
		
		// Store Model	
		case Store.modelName:

			var result = false;			
			if(user.role == User.ROLES.ADMIN) {

				result = true;
				next(result);

			} else {

				Floor.findById( obj.floorId, function(err, floor) {

					if(err) {

						log.error(err);
						next(result);					
					
					} else {

						if(floor) {

							Building.findById( floor.buildingId, function(err, building) {

								if(err) {

									log.error(err);
									
								} else {

									if( building && building.userId == user.id.toString() )
										result = true;

									if( building && isRead && building.pub )
										result = true;									

								}

								next(result);

							});

						} else {

							next(result);

						}
							

					}

				});

			}	

			break;
		
		// Ad Model	
		case Ad.modelName:

			var result = false;			
			if(user.role == User.ROLES.ADMIN) {

				result = true;
				next(result);

			} else {

				Store.findById( obj.storeId, function(err, store) {

					if(err) {

						next(result);

					} else {

						if(store) {

							Floor.findById( store.floorId, function(err, floor) {

								if(err) {

									next(result);

								} else {

									if(floor) {

										Building.findById( floor.buildingId, function(err, building) {

											if(err) {

												log.error(err);					
											
											} else {

												if( building && building.userId == user.id.toString() )
													result = true;

												if( building && isRead && building.pub )
													result = true;												

											}
											next(result);																					

										});

									} else {

										next(result);

									}

								}

							});

						} else {

							next(result);

						}

					}

				});

			}		
			break;
			
		default:
			break;
			
	}
	
};

// Function for create sample building
Utility.createSampleBuilding = function(nuser, next){
	
	// Start to create default building after response
	log.info('sampleBuildingId: ' + Utility.applicationInfo.sampleBuildingId);
	Building.findById(Utility.applicationInfo.sampleBuildingId, function(err, sampleBuilding){

		if(err)
			log.error(err);

		if(sampleBuilding){

			log.info("start to generate sample building of user: " + nuser._id);
		    new Building({

		        name: sampleBuilding.name,
		        desc: sampleBuilding.desc,
				downfloor: sampleBuilding.downfloor,
				upfloor: sampleBuilding.upfloor,		        
		        userId: nuser.id,
		        pub: sampleBuilding.pub,
		        	
		    }).save(function(err, building){
		    	
		    	if(err){
		    		
		    		log.error(err);
		    		
		    	}else{
		    	
		            if(building){

						// Main Folder path
						var folderPath = path.dirname() + "/" + config.mapInfoPath + "/" + nuser.id,
							buildingFolderPath = folderPath + "/" + building.id,
							buildingWebLocation = nuser.id + "/" + building.id,
							clientImagePath = folderPath + "/client-image",
							sampleBuildingPath = path.dirname() + "/" + config.mapInfoPath + "/" + sampleBuilding.userId + "/" + sampleBuilding.id;   

						log.info("start to generate sample floor folder: " + buildingFolderPath);
			 								
						// Make sure building folder path exist, if not created
						mkdirp(buildingFolderPath, function(err, dd) {
							
							if(err){
								
								log.error(err);buildingFolderPath
								
							}else{
								
								// Make sure client-image folder path exist, if not created (TODO: for put user's images for future)
								mkdirp(clientImagePath, function(err, dd) {
									
									if(err){
										
										log.error(err);
										
									}else{
										
										// Copy sample building mapzip
										fs.readdir(sampleBuildingPath, function(err, files){

											if(err){

												log.error(err);

											} else {

												// Copy the default xml files and zip to floor folder of default building of user
												for(var i=0; i<files.length; i++){

													var filePath = sampleBuildingPath + "/" + files[i],
														stat = fs.statSync(filePath);
													if(stat.isDirectory()){

														// Get sample folder data
														(function(theLayer){

															var floorFolderPath = buildingFolderPath + "/" + theLayer,
																floorWebLocation = buildingWebLocation + "/" + theLayer,
																floors = [];

															// Make sure building and floor folder of user exist	
															mkdirp(floorFolderPath, function(err, dd) {

																if(err)
																	log.error(err);

																fs.readdir( sampleBuildingPath + "/" + theLayer, function(err, files2){
																	
																	if(err){
																		
																		log.error(err);
																		
																	}else{																						

																		var archiveM = archiver('zip'),																			
																			outputM = fs.createWriteStream( floorFolderPath + "/map.zip");													

																		outputM.on('close', function() {
																		  log.info('archiver finish package map.zip');
																		});

																		archiveM.on('error', function(err) {
																		  if(err)
																		  	log.error(err);
																		});

																		archiveM.pipe(outputM);

																		var tempFiles = [];
																																									
																		// Copy the default xml files and zip to floor folder of default building of user																		
																		for(var j=0; j<files2.length; j++){

																			if( files2[j].indexOf("map.zip") != -1){

																				var rss = fs.createReadStream(sampleBuildingPath + "/" + theLayer + "/" + files2[j]);
																				rss.pipe(unzip.Parse())
																				  .on('entry', function (entry) {
																				    var fileName = entry.path;
   																					var ws = fs.createWriteStream(floorFolderPath + "/temp-" + fileName);
   																					entry.pipe(ws);
   																					tempFiles.push("temp-" + fileName);
																				});

																				rss.on('end', function(){

																					console.log(tempFiles);
																					for(var g=0; g<tempFiles.length; g++)
																						archiveM.append(fs.createReadStream(floorFolderPath + "/" + tempFiles[g]), 
																							{ name: tempFiles[g].replace("temp-", "") });

																					archiveM.finalize(function(err, bytes) {																			
																						if (err)
																							log.error(err);

																						log.info(bytes + ' total bytes');

																					});		

																				})

																			} else {

																				fs.createReadStream( sampleBuildingPath + "/" + theLayer + "/" + files2[j], {																
																					encoding: 'utf8',
																					autoClose: true																
																				} ).pipe( fs.createWriteStream( floorFolderPath + "/" + files2[j] ) );	

																			}
																				
																		}																	
																		
																		// Find sample floor
																		Floor.findOne({

																			buildingId: sampleBuilding._id,
																			layer: theLayer

																		}, function(err, sampleFloor){

																			if(err)
																				log.err(err);

																			if(sampleFloor){

																				// Create new floor
																				new Floor({
																					
																					name: sampleFloor.name,
																					desc: sampleFloor.desc,																					
																					layer: sampleFloor.layer,													
																					map: floorWebLocation + '/map.xml',
																					path: floorWebLocation + '/path.xml',
																					render: floorWebLocation + '/render.xml',
																					region: floorWebLocation + '/region.xml',
																					mapzip: floorWebLocation + '/map.zip',																			
																					buildingId: building.id,
																
																				}).save(function(err, floor){

																					if(err)
																						log.error(err);
																					
																					if(floor){

																						floors.push(floor);

																						// Create default stores
																						Store.find({

																							floorId: sampleFloor._id

																						}, function(err, sampleStores){

																							if(err)
																								log.error(err);

																							if(sampleStores){

																								for(var l=0; l<sampleStores.length; l++){

																									(function(sStore, index){

																										Store.create({

																										    name: sStore.name,																			    
																										    floorId: floor._id

																										}, function(err, store){

																											if(err)
																												log.error(err);

																											var limit = building.downfloor > building.upfloor ? -(building.downfloor) : building.upfloor;
																											log.info("limit: " + limit);
																											if(index == sampleStores.length -1 && theLayer == limit){

																												Utility.genIndexXmlOfBuilding(building, function(err){

																													if(err){

																														log.error(err);

																													} else {

																														Utility.genFloorlistXmlOfBuilding(building, floors, function(err){

																															if(err){

																																log.error(err);

																															} else {

																																var archive = archiver('zip'),
																																	output = fs.createWriteStream( folderPath + "/" + building.id +'.zip');													
												
																																output.on('close', function() {
																																  log.info('archiver finish package map.zip');
																																});

																																archive.on('error', function(err) {
																																  if(err)
																																  	log.error(err);
																																});

																																archive.pipe(output);

																																// Start to package map.zip													
																																fs.readdir(buildingFolderPath, function(err, files3){
																																	
																																	if(err){
																																		
																																		log.error(err);
																																		
																																	}else{
																																		
																																		for(var n=0; n<files3.length; n++){
																																			
																																			var filePath = buildingFolderPath + "/" + files3[n];
																																			var isFolder = fs.statSync(filePath).isDirectory();
																																			
																																			if(isFolder){
																																					
																																				(function(filePathF, layer){

																																					log.info(filePathF);
																																					fs.readdir(filePathF, function(err, filesI){
																																						
																																						if(err){
																																							
																																							log.error(err);
																																							
																																						}else{
																																							
																																							for(var m=0; m<filesI.length; m++){
																																								if(filesI[m].indexOf("index.xml") != -1 || filesI[m].indexOf("aplist.xml") != -1)
																																									continue;
																																								var filePathInner = filePathF + "/" + filesI[m];
																																								console.log(filePathInner);																		
																																								archive.append(fs.createReadStream(filePathInner), { name: "/" + layer + "/" + filesI[m] });
																																																													
																																							}
																																							
																																						}
																																																									
																																					});																		
																																					
																																				}(filePath, files3[n]));
																																				
																																			} else if( files3[n].indexOf("temp") != -1 ){ 

																																				log.info("temp file");

																																			} else {

																																				console.log(filePath);
																																				archive.append(fs.createReadStream(filePath), { name: files3[n].replace("temp-", "") });

																																			}
																																																			
																																		}

																																		archive.finalize(function(err, bytes) {
																																			
																																			if (err)
																																				log.error(err);

																																			  log.info(bytes + ' total bytes');

																																			if(next)
																																				next();

																																			 building.mapzip =  buildingWebLocation + ".zip";
																																			 building.save(function(err, building){
																																			 	if(err)
																																			 		log.error(err);
																																			 });

																																		});	
																																																	
																																	}
																																															
																																});

																															}

																														});

																													}

																												});

																											}

																										});

																									}( sampleStores[l], l ) );

																								}

																							}

																						});

																					}

																				});	

																			}

																		});
																																			
																	}
																																																												
																});	

															});


														}( files[i] ) )

													}

												}		

											}

										});																						
																																								
									}
									
								});
								
							}
						
						});							            	
		            									            								            	
		            }// end if						        								        		
		    		
		    	}						        	

		    });	

		}

	});
		
};


// Function for package mapzip of specific building
Utility.packageMapzip = function(buildingId, next){

		var bid = buildingId,
			errorResInfo = Utility.errorResInfo,
			errorOjb = {};
		Building.findById(bid, function(err, building){
		
			if(err){
				
				log.error(err);
				errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
				errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
    			next(errorOjb);			 
				
			} else {
	
				if(building){
					
					// Get all floors and sort ascend
					Floor.find({
						
						buildingId: building.id
						
					}).sort({layer: 1}).execFind( function(err, floors){
						
						if(err){
							
							log.error(err);
							errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
							errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
			    			next(errorOjb);			 
							
						}else{
							
							// Main Folder path
							var folderPath = path.dirname() + "/" + config.mapInfoPath + "/" + building.userId,
								buildingFolderPath = folderPath + "/" + building.id;   
				 								
							// Make sure folder path exist, if not created
							mkdirp(buildingFolderPath, function(err, dd) {
								
								if(err){
									
									log.error(err);
									errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
									errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
					    			next(errorOjb);			 
									
								}else{
																
									// Construct floorlist.xml
									var floorListTag = builder.create('FloorList', {
											'location': '',
											'version': '1.0', 
											'encoding': 'UTF-8',
											'standalone': 'yes'
									});
									
									for(var i=0; i<floors.length; i++)
										floorListTag.ele('floor', {
											'name': floors[i].layer,
											'desc': floors[i].name ? floors[i].name : '',
											'number': floors[i].layer,
											'id': floors[i].id
										});
									
									var floorListXML = floorListTag.end({ pretty: true});
									fs.writeFile(buildingFolderPath + "/floorlist.xml", floorListXML.toString(), function(err) {
										
									    if(err) {
									    	
											log.error(err);
											errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
											errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
							    			next(errorOjb);			 
									    	
									    } else {
									    	
									        log.info("floorlist.xml has been created or updated");
									        
									        // Construct index.xml
											var sailsBuildingTag = builder.create('sailsbuilding', {
													'location': '',
													'version': '1.0', 
													'encoding': 'UTF-8',
													'standalone': 'yes'
											}).ele('building', {
												'name': building.name ? building.name : '',
												'id': building.id
											}).ele('read', {
												'filepath' : 'floorlist.xml',
												'type' : 'floorlist'
											});
											var indexXML = sailsBuildingTag.end({ pretty: true});
											fs.writeFile(buildingFolderPath + "/index.xml", indexXML.toString(), function(err) {
												
												if(err) {
													
													log.error(err);
													errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
													errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
									    			next(errorOjb);			 
													
												} else {
													
													log.info("index.xml has been created or updated");
				
													var locationMapzipPath = folderPath + "/" + building.id + ".zip",
											 			targetPath = building.userId + "/" + building.id + ".zip",
											 			output = fs.createWriteStream(locationMapzipPath),
											 			archive = archiver('zip');
												
													output.on('close', function() {
													  log.info('archiver finish package map.zip');
													});

													archive.on('error', function(err) {
													  if(err)
													  	log.error(err);
													});

													archive.pipe(output);
													
													// Start to package map.zip
													fs.readdir(buildingFolderPath, function(err, files){
														
														if(err){
															
															log.error(err);
															
														}else{
															
															for(var i=0; i<files.length; i++){
																
																var filePath = buildingFolderPath + "/" + files[i];
																var isFolder = fs.statSync(filePath).isDirectory();
																
																log.info(filePath);
																log.info(isFolder);
																if(isFolder){
																		
																	(function(filePathF, layer){

																		fs.readdir(filePathF, function(err, filesI){
																			
																			if(err){
																				
																				log.error(err);
																				
																			}else{
																				
																				for(var j=0; j<filesI.length; j++){
																					
																					var filePathInner = filePathF + "/" + filesI[j];
																					if( filesI[j].indexOf("temp") != -1 )
																						continue;
																					else																		
																						archive.append(fs.createReadStream(filePathInner), { name: "/" + layer + "/" + filesI[j] });
																																										
																				}

																				// if(filesI.length == 0)
																				//	archive.append(fs.createReadStream(filePath), { name: "/" + layer + "/.tmp" });
																				
																			}
																																						
																		});																		
																		
																	}(filePath, files[i]));
																	
																}else{
																	archive.append(fs.createReadStream(filePath), { name: files[i] });																		
																}
																																
															}
															
															archive.finalize(function(err, bytes) {
																  if (err)
																    throw err;

																  log.info(bytes + ' total bytes');
															});	
																														
														}
																												
													});
													
													building.mapzip = targetPath;
													building.mapzipUpdateTime = new Date();				
													building.save(function(err, building){
														
														if(err){
															log.error(err);
															errorOjb.code = errorResInfo.INTERNAL_SERVER_ERROR.code;
															errorOjb.msg = errorResInfo.INTERNAL_SERVER_ERROR.msg;
											    			next(errorOjb);																
														}

														if(building){
															errorOjb.code = errorResInfo.SUCCESS.code;
															errorOjb.building = building;
															next(errorOjb);				
														}

													});																										
													
												}
												
											});
											
									    }
									    
									});							
																
								}
														
							});					
												
						}					
						
					});
					
				}
				
			}
			
		});

}


// Function for parse regions and create stores on the floor
Utility.parseRegion = function(regionXMLString, floorId, next){
	
	parseString(regionXMLString, function (err, result) {
		
	    var ways = result.osm.way,
	    	storeNamesTemp = [];
	    Store.find({
	    	
	    	floorId : floorId
	    	
	    }, function(err, stores){

	    	if(err)
	    		log.error(err);
	    	
	    	if(ways){
	    			
	    		// Create stores in region.xml
	    		for(var i=0; i<ways.length; i++){

	    			var way = ways[i],
			    		tags = way.tag;

			    	for(var j=0; j<tags.length; j++){

		    			var tag = tags[j],
			    			tagInfo = tag.$;
			    		if(tagInfo.k == "label"){
	
			    			var name = tagInfo.v,
			    				isDuplicate = false;
			    			storeNamesTemp.push(name);
	
			    			// Check is duplicate
			    			for(var k=0; k< stores.length; k++){
			    				if(name == stores[k].name){
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

			    	}

	    		}

	    		// Delete the stores not in region.xml
	    		for(var i=0; i<stores.length; i++){	    		
		    		
	    			var isFound = false;
		    		for(var j=0; j<storeNamesTemp.length; j++){
		    			if(stores[i].name == storeNamesTemp[j]){
		    				isFound = true;
		    			}
		    		}

		    		if(!isFound){
		    			stores[i].remove(function(err){
		    				if(err)
		    					log.error(err);
		    			});
		    		}

	    		}
	    	}
	    	
	    });


	});

}


// Function for generate index.xml of building
Utility.genIndexXmlOfBuilding = function(building, next){

	var buildingFolderPath = path.dirname() + "/" + config.mapInfoPath + "/" + building.userId + "/" + building.id,
		errorOjb = null;

	// Make sure buidling folder path exist already	
	mkdirp(buildingFolderPath, function(err, dd) {
		
		if(err){
			
			log.error(err);
			errorOjb = {
				code: errorResInfo.INTERNAL_SERVER_ERROR.code,
				msg: errorResInfo.INTERNAL_SERVER_ERROR.msg	
			};
			next(errorOjb);			 
			
		}else{

			// Generate index.xml document
			var	sailsBuildingTag = builder.create('sailsbuilding', {

					'location': '',
					'version': '1.0', 
					'encoding': 'UTF-8',
					'standalone': 'yes'

				}).ele('building', {

					'name': building.name ? building.name : '',
					'id': building.id

				}).ele('read', {

					'filepath' : 'floorlist.xml',
					'type' : 'floorlist'

				}),
				indexXML = sailsBuildingTag.end({ pretty: true});

			// Write to file	
			fs.writeFile(buildingFolderPath + "/index.xml", indexXML.toString(), function(err) {

				if(err){

					log.error(err);
					errorOjb = {
						code: errorResInfo.INTERNAL_SERVER_ERROR.code,
						msg: errorResInfo.INTERNAL_SERVER_ERROR.msg	
					};
				
				}
				next(errorOjb);			  

			});

		}

	});

}

// Function for generate floorlist.xml of building
Utility.genFloorlistXmlOfBuilding = function(building, floors, next){

	var buildingFolderPath = path.dirname() + "/" + config.mapInfoPath + "/" + building.userId + "/" + building.id,
		errorOjb = null;

	// Make sure buidling folder path exist already	
	mkdirp(buildingFolderPath, function(err, dd) {

		if(err){
			
			log.error(err);
			errorOjb = {
				code: errorResInfo.INTERNAL_SERVER_ERROR.code,
				msg: errorResInfo.INTERNAL_SERVER_ERROR.msg	
			};
			next(errorOjb);			 
			
		}else{

			// Construct floorlist.xml
			var floorListTag = builder.create('FloorList', {

					'location': '',
					'version': '1.0', 
					'encoding': 'UTF-8',
					'standalone': 'yes'

			});
			
			for(var i=0; i<floors.length; i++)
				floorListTag.ele('floor', {

					'name': floors[i].layer,
					'desc': floors[i].name ? floors[i].name : '',
					'number': floors[i].layer,
					'id': floors[i].id

				});
			
			var floorListXML = floorListTag.end({ pretty: true});
			fs.writeFile(buildingFolderPath + "/floorlist.xml", floorListXML.toString(), function(err) {
				
			    if(err) {
			    	
					log.error(err);
					errorOjb = {
						code: errorResInfo.INTERNAL_SERVER_ERROR.code,
						msg: errorResInfo.INTERNAL_SERVER_ERROR.msg	
					};

				}
				next(errorOjb);

			});		

		}

	});

}


// Function for package mapzip by Achiver(real part of package map.zip by achiver)
Utility.packiageMapzipAchiver = function(building, isAdminSample, next){

	var archive = archiver('zip'),
		folderPath =  isAdminSample ? path.dirname() + "/" + config.sampleBuildingPath : path.dirname() + "/" + config.mapInfoPath + "/" + nuser.id,
		buildingFolderPath = isAdminSample ? folderPath : folderPath + "/" + building.id,
		outPutPath = "",
		output = fs.createWriteStream( folderPath + "/" + building.id +'.zip');													

	output.on('close', function() {
	  log.info('archiver finish package map.zip');
	});

	archive.on('error', function(err) {
	  if(err)
	  	log.error(err);
	});

	archive.pipe(output);

	// Start to package map.zip													
	fs.readdir(buildingFolderPath, function(err, files3){
		
		if(err){
			
			log.error(err);
			
		}else{
			
			for(var n=0; n<files3.length; n++){
				
				var filePath = buildingFolderPath + "/" + files3[n];
				var isFolder = fs.statSync(filePath).isDirectory();
				
				if(isFolder){
						
					(function(filePathF, layer){

						log.info(filePathF);
						fs.readdir(filePathF, function(err, filesI){
							
							if(err){
								
								log.error(err);
								
							}else{
								
								for(var m=0; m<filesI.length; m++){
									
									var filePathInner = filePathF + "/" + filesI[m];
									console.log(filePathInner);																		
									archive.append(fs.createReadStream(filePathInner), { name: "/" + layer + "/" + filesI[m] });
																														
								}
								
							}
																										
						});																		
						
					}(filePath, files3[n]));
					
				}else{

					console.log(filePath);
					archive.append(fs.createReadStream(filePath), { name: files3[n] });

				}
																				
			}

			archive.finalize(function(err, bytes) {
				
				if (err)
					log.error(err);

				  log.info(bytes + ' total bytes');

				if(next)
					next();

			});	
																		
		}
																
	});

}


module.exports = Utility;