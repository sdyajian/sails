var utility = Utility.getInstance();

function CustomFieldsGenerator(setting, $scope, $compile, Poi) {

	var poi = $scope.poi,
		poiClone = $scope.poiClone;

	// Loading modal
	var loadingModal = $("#loadingModal");	

	// Default setting
	var defaultSetting = {
		wrapperId: "customFieldsWrapper",
		createButton: "customFieldsCreateButton",
		typeMenu: "customFieldsTypeMenu",
		displayArea: "customFieldsDisplayArea",
		templateCustomField: "templateCustomField"
	}

	for(var key in setting){
		if(setting[key])
			defaultSetting = setting[key];
	}

	var me = this,
		wrapper = $("#" + defaultSetting.wrapperId),
		createButton = $("#" + defaultSetting.createButton),
		typeMenu = $("#" + defaultSetting.typeMenu),
		displayArea = $("#" + defaultSetting.displayArea),
		templateCustomField = $("#" + defaultSetting.templateCustomField),
		templateCustomField = $("#" + defaultSetting.templateCustomField),
		templateCreateImage = $("#" + defaultSetting.templateCreateImage);
	
	// Function for toogle the field type menu
	var typeMenuStatus = true;			
	me.toogleTypeMenu = function(){
		if(typeMenuStatus){
			createButton.addClass("customFieldAddButtonToggle");
			typeMenu.show();
			typeMenuStatus = false;
		} else {
			createButton.removeClass("customFieldAddButtonToggle");			
			typeMenu.hide();
			typeMenuStatus = true;
		}
	}

	// Event Handler for get the selected type and create field of this type
	typeMenu.on("click", function(e){
		// Hide type menu
		me.toogleTypeMenu();

		// Create field of specific type
		var source = e.target || e.source;		
		if(source.id.indexOf("Image") != -1){
			me.createImageField();
		} else if(source.id.indexOf("Link") != -1) {
			me.createLinkField();
		} else if(source.id.indexOf("Video") != -1) {
			me.createVideoField();
		} else if(source.id.indexOf("Audio") != -1) {		
			me.createAudioField();
		} else if(source.id.indexOf("File") != -1) {		
			me.createFileField();
		} else {
			me.createTextField();
		}
	});

	// Event Handler for toogle display and edit mode
	$(document).on('click', 
		".customFieldsButtonEdit, .templateCustomFieldsDisplay .customFieldsKey," +
		 ".templateCustomFieldsDisplay .customFieldsValue", function(){		
		// Start other fields edit first
		unEditFields();	
		$(this).parent().hide();
		$(this).parent().next().fadeIn();
	}).on('click', ".customFieldsButtonCancel", function(){
		$(this).parent().hide();
		$(this).parent().prev().fadeIn();
	});

	// Event Handler for select text content while click edit input fields
	$(document).on('click', 
		".templateCustomFieldsEdit .customFieldsKey," +
		 ".templateCustomFieldsEdit .customFieldsValue", function(){
		 $(this).select();		
	});

	// Function for get key number
	function getNextKeyNumber(){
		var result = poi.customFields.length; 
		return result++;
	}

	// Function for show error message
	function showErrorMsg(res){
		var errorMsg = res && res.data && res.data.msg;
		$().toastmessage('showErrorToast', errorMsg);					
	}

	// Function for show error message
	function showSuccessMsg(type){
		if(type == 'remove')
			$().toastmessage('showSuccessToast', dialogInfo.removeSuccess);		
		else if(type == 'update')
			$().toastmessage('showSuccessToast', dialogInfo.updateSuccess);									
		else 	
			$().toastmessage('showSuccessToast', dialogInfo.createSuccess);			
	}

	// Function for sync to server
	function syncToServer(poi, type){
		poi.$save(function(){
			poiClone = angular.copy(poi);
			showSuccessMsg(type);
		}, function(res){
			angular.copy(poiClone, poi);
			showErrorMsg(res);
		});		
	}

	// ------------------------------------------------------------------------
	
	// Function for remove specific field
	me.removeField = function(index){
		poi.customFields.splice(index, 1);
		syncToServer(poi, "remove");
	}

	// Function for cancel edit field
	me.cancelField = function(){
		angular.copy(poiClone, poi);
	}

	// Functon for update field
	me.updateField = function(e){
		var updateButton = angular.element(e.currentTarget),
			wrapper = updateButton.parent(),
			fieldKeyInput = wrapper.find('input[name=fieldKey]'),
			errorMsgObj = wrapper.find('.error-msg')

		// Check key is empty or not	
		if(utility.emptyValidate(fieldKeyInput, errorMsgObj))
			syncToServer(poi, 'update');
	}

	// ------------------------------------------------------------------------

	// Function for create text field
	me.createTextField = function(){
		var currentCuout = getNextKeyNumber();		
		$scope.$apply(function(){
			poi.customFields.unshift({ 
				key: "key" + currentCuout, 
				value:"value" + currentCuout, 
				type: 1 
			});
			syncToServer(poi);		
		});		
	}

	// Function for toggle the display and edit mode of text field
	// Since change line symbol is different between normal text and html
	me.toggleMultipleLineMode = function(e, mode, field) {
		var newValue = field.value;
		if(mode) 	// edit -> display
			newValue = newValue.replace(/(?:\r\n|\r|\n)/g, '<br/>');
		else 		// display -> edit
			newValue = newValue.replace(/(<br\/>)/g, '\n');
		field.value = newValue;	
		
		// Cancel edit need to rollback 
		if(mode)
			me.cancelField();
	}

	// ------------------------------------------------------------------------

	// Function for create link field
	me.createLinkField = function(){
		var currentCuout = getNextKeyNumber();
		$scope.$apply(function(){
			poi.customFields.push({ 
				key: "key" + currentCuout, 
				value:"value" + currentCuout, 
				type: 2
			});
			syncToServer(poi);
		});		
	}

	// ------------------------------------------------------------------------

	// Function for create image field
	me.createImageField = function(){
		var currentCuout = getNextKeyNumber();
		$scope.$apply(function(){
			poi.customFields.push({ 
				key: "key" + currentCuout, 
				value: "", 
				type: 3
			});
			syncToServer(poi);
		});
	}


	// Function for submit poi file(image, audio file)
	me.submitPoiFile = function(e, obj, type){
		
		var field = obj,
			saveButton = angular.element(e.currentTarget),
			form = saveButton.prev(),
			inputFields = form.find("input"),
			fileValueInput = form.find("input[name='file']"),
			fileKeyInput = form.find("input[name='fieldKey']"),
			errorMsgObj = form.parent().find('.error-msg');

		// Ajax from setup
		var options = {

			beforeSubmit : function(){ // pre-submit callback

				if(utility.emptyValidate(fileKeyInput, errorMsgObj)) {

					// Update key only if no file upload
					if(!fileValueInput.val()){
						
						// Update field key directly
						syncToServer(poi);				
						return false;						
					
					} else {

						// Disable
						inputFields.attr('disabled');
						errorMsgObj.hide();
						return true;

					}

				} else {

					return false;

				}

			},
			uploadProgress : function(event, position, total, percent){

				// Show upload loading effect
				loadingModal.modal("show");
			
			},
			success : function(res, statusText){ // post-submit callback

				// Update field 
				$scope.$apply(function () {
					field.value = res;
					syncToServer(poi);						
				});

				// Show upload loading effect
				loadingModal.modal("hide");

				return true;
			},
			error : function(res, status){

				// Show upload loading effect
				loadingModal.modal("hide");

				// Show error msg
				var resText = ( res.responseJSON && res.responseJSON.msg ) || "Fail to upload";
				$().toastmessage('showErrorToast', resText );		        

			},			

			clearForm : true

		};

		form.ajaxSubmit(options);
		return false;
	}

	// Event Handler about image field preview
	$(document).on("change", "div.customFieldsValue.cimage input", function(e){
		var image = this.files[0],
			wrapper = $(this).parent();
		// Check browser support file reader
		if(window.FileReader){
			// Load image and preview on parent div wrapper			
			var reader = new FileReader();
			reader.onload = function(theImage){
				if(theImage && theImage.target)
					wrapper.css("background", "url(" + theImage.target.result + ") no-repeat");
			}
			reader.readAsDataURL(image);
		}
	});

	// ------------------------------------------------------------------------

	// Function for create video field
	me.createVideoField = function(){
		var currentCuout = getNextKeyNumber();
		$scope.$apply(function(){
			poi.customFields.push({ 
				key: "key" + currentCuout, 
				value:"", 
				type: 4
			});
			syncToServer(poi);
		});		
	}

	// ------------------------------------------------------------------------

	// Function for create audio field
	me.createAudioField = function(){
		var currentCuout = getNextKeyNumber();
		$scope.$apply(function(){
			poi.customFields.push({ 
				key: "key" + currentCuout, 
				value:"", 
				type: 5
			});
			syncToServer(poi);
		});
	}

	// ------------------------------------------------------------------------

	// Function for create file field
	me.createFileField = function(){
		var currentCuout = getNextKeyNumber();
		$scope.$apply(function(){
			poi.customFields.push({ 
				key: "key" + currentCuout, 
				value:"", 
				type: 6
			});
			syncToServer(poi);
		});		
	}

}