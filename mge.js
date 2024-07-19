
$(document).ready(function() { 

    function translateState(state){
        switch(state){
            case "rolling game":
                return "Поиск игры"
            case "capturing":
                return "Захват сектора"
            case "capture completion":
                return "Завершение захвата"
            case "map interaction":
                return "Взаимодействие с картой"
            default:
              return "Что то с радарами"
        }
    }

    function addPlayers(data){

        $.each(data["players"], function( index, player ) {
            var text = $("#player-template").html()

            var exp = player["level"]["experience"]["current"]/player["level"]["experience"]["maximum"] * 100

            text = text.replaceAll("%name%", player["name"])
                       .replaceAll("%avatar%", player["avatar"]["image"])
                       .replaceAll("%lvl%", player["level"]["current"])
                       .replaceAll("%bar%", `linear-gradient(90deg, #3f4d0b ${exp}%, rgb(0,0,0,0) ${100 - exp}%);`)
                       .replaceAll("%exp%", `${player["level"]["experience"]["current"]}/${player["level"]["experience"]["maximum"]}`)
                       .replaceAll("%bits%", player["money"])
                       .replaceAll("%income%", player["dailyIncome"])
                       .replaceAll("%daily%", player["actionPoints"]["turns"]["daily"]["current"])
                       .replaceAll("%weekly%", player["actionPoints"]["turns"]["weekly"]["current"])
                       .replaceAll("%state%", translateState(player["states"]["main"]["value"]))
                       
                       .replaceAll("%hp%",        player["hp"]["current"])
                       .replaceAll("%bp%",        player["combatPower"]["current"])
                       .replaceAll("%influence%", player["influence"])
                       .replaceAll("%move%",      player["actionPoints"]["movement"]["current"])
                       .replaceAll("%morale%",    player["morale"]["current"])
                       .replaceAll("%police%",    player["policeInterest"]["current"])
                       .replaceAll("%tokens%",    player["congressTokens"])
                       .replaceAll("%vision%",    player["actionPoints"]["exploring"]["current"])
                       
                       .replaceAll("%maxhp%",     player["hp"]["maximum"])
                       .replaceAll("%maxbp%",     player["combatPower"]["maximum"])
                       .replaceAll("%maxmorale%", player["morale"]["maximum"])
                       .replaceAll("%maxpolice%", player["policeInterest"]["maximum"])
                       .replaceAll("%maxvision%", player["actionPoints"]["exploring"]["maximum"])
            
            if ('currentGame' in player){
                text = text.replaceAll("%game_label%", '<br>Текущая игра:')
                           .replaceAll("%game%", '<br>' + player["currentGame"]['name'])
            }
            else{
                text = text.replaceAll("%game_label%", '')
                .replaceAll("%game%", '')
            }
            
            console.log(text)

            if (index <= 3){
                $("#col-1").append(text)
            }
            else{
                $("#col-2").append(text)
            }
        });
    }

    $.get("https://mge.family/api/gameData.json", function (data) {
        addPlayers(data)
    });   
    
    // addPlayers(test)

});