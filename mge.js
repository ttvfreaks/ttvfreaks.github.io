$(document).ready(function() { 
    
    $.ajax({
        type: "POST",
        url: "https://mge.family/api/gameData.json",
        cache: true,
        success: function (result) {
            var response = JSON.parse(JSON.stringify(result))

            console.log(response)
            
        },
        contentType: 'application/json',
        dataType: 'json',                
    });

});