$(document).ready(function(){

	setTimeout(function(){

		/* Toggle edit button and exchange display adn edit mode */
		$(document).on('mouseenter', ".display-block", function(){

			// Toggle edit button
			$(this).find(".edit-button").fadeIn();
			$(this).find(".remove-button").fadeIn();

		}).on('mouseleave', ".display-block", function(){

			// Toggle edit button
			$(this).find(".edit-button").fadeOut();
			$(this).find(".remove-button").fadeOut();

			
		}).on('click', ".edit-button", function(){

			// Toggle edit block
			$(this).parent().hide();
			$(this).parent().parent().find(".edit-block").fadeIn();

		}).on('click', ".close-button", function(){

			// Toggle display block
			$(this).parent().hide();
			$(this).parent().parent().find(".display-block").fadeIn();

		});

		//------------------------------------------------

		// Detect change of ad image, then show the upload button
		$(document).on('change', ".upload-file", function() {
			$(this).parent().next().show();
		});
		
	}, 500);
	
	// Notification Message Dialog
	$().toastmessage({
		sticky : false,
		position: 'top-center'
	});	
	
});