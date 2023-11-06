import axios from 'axios';
import fs from 'fs';

// const mods = {
//     ds: {
//         eu: 140436,
//         na: 208271,
//         kr: 69942,
//         // cn: 89106
//     }
// }


class EloRank {
  constructor(k) {
    this.k = k || 32;
  }
  updateRating(expected, actual, current) {
    return
  }
}

axios.interceptors.response.use(undefined, (err) => {
    const { config, message } = err;
    if (!config || !config.retry) {
        return Promise.reject(err);
    }
    // retry while Network timeout or Network Error
    if (!(message.includes("timeout") || message.includes("Network Error"))) {
        return Promise.reject(err);
    }
    config.retry -= 1;
    const delayRetryRequest = new Promise((resolve) => {
        setTimeout(() => {
            console.log("retry the request", config.url);
            resolve();
        }, config.retryDelay || 1000);
    });
    return delayRetryRequest.then(() => axios(config));
});

let outputDirectory = './../src/data/'
class Profiles {
    file = outputDirectory + "profiles.json"
    list = {}
    constructor(){
        this.load()
    }
    load () {
        if(fs.existsSync(this.file)){
            this.list = JSON.parse(fs.readFileSync(this.file,{encoding : 'utf-8'}))
        }
    }

    playerCode(profile){
        return + (profile.profileId + profile.realmId + profile.regionId )
    }
    save(){

      let dir = this.file.substring(0,this.file.lastIndexOf("/"))
      if(!fs.existsSync(dir)){
        fs.mkdirSync(dir)
      }
      fs.writeFileSync( this.file,JSON.stringify(profiles.list),{encoding : 'utf-8'})
    }
    async update(records){
        let newPlayers = 0
        for(let i = 0; i < records.length; i++){
            let record = records[i]
            for(let slot of record.rr){
                  if(!profiles.list[slot.id]){
                      try {
                          let res  = await axios.get(`https://sc2arcade.com/api/profiles/${slot.id}`, {
                              retry: 3,
                              retryDelay: 3000,
                          })
                          profiles.list[slot.id] = {
                              profileGameId: res.data.profileGameId,
                              battleTag: res.data.battleTag,
                              name: res.data.name,
                              avatar: res.data.avatar
                          }
                          newPlayers++

                      }
                      catch (e){
                          console.log(e.message)
                          break;
                      }
                  }
                  // readline.cursorTo(process.stdout, 0, 0)
                  // process.stdout.write(`${i} / ${records.length}`)

            }
        }
        if(newPlayers){
            console.log(`${newPlayers} New Players`)
        }

    }
}

class Lobbies {

    static regions = {
        na: 1,
        eu: 2,
        kr: 3,
    }
    records = []
    file = ''
    region = 0
    mod = 0
    constructor(profiles,name, region, modId){
        this.name = name
        this.region = Lobbies.regions[region]
        this.mod = modId
        this.profiles = profiles
        let directory = `${outputDirectory}${name}`
        this.file = directory + "/records.json";
        this.ratingsFile = directory + "/rating.json";
        this.load()
    }
    static get(name, regionId, modId){
        return new Lobbies(name, regionId, modId)
    }
    load(){
        if(fs.existsSync(this.file)){
            this.records = JSON.parse(fs.readFileSync(this.file,{encoding : 'utf-8'}))
        }
        else{
          this.records = []
        }
    }
    async update(){

        let records = []
        let next = ''
        let found
        do {
            let res
            try{
                res = await axios.get(`https://sc2arcade.com/api/lobbies/history`, {
                    retry: 3,
                    retryDelay: 1000,
                    params: {
                        regionId: this.region,
                        mapId: this.mod,
                        includeMatchResult: true,
                        includeMatchPlayers: true,
                        // includeMapInfo: true,
                        // includeSlots: true,
                        // includeSlotsProfile: true,
                        after: next,
                        limit: 500
                    }
                })
            }
            catch (e){
                console.log(e.message)
                break;
            }

            let results = res.data.results.filter(r => r.match?.completedAt)
            if(this.records.length){
              let lr = this.records[0];
              found = results.find(r => r.id === lr.id);
              if(found){
                results.splice(results.indexOf(found))
              }
            }




            for(let r of results){

              let rr = [];

              for(let pm of r.match.profileMatches){
                let pid = + (pm.profile.profileId + "" + pm.profile.realmId + "" + pm.profile.regionId )
                rr.push({
                  pid: pid,
                  p: pm.profile.name,
                  d: pm.decision
                })
                if(!this.profiles.list[pid]){
                  this.profiles.list[pid] = pm.profile
                }
              }

              records.push({
                id: r.id,
                // bbid:r.bnetBucketId,
                // brid:r.bnetRecordId,
                cr: r.createdAt.substring(2,19),
                cl: r.closedAt.substring(2,19),
                co: r.match?.completedAt.substring(2,19),
                mid: r.mapBnetId,
                rr
              })
            }



            next = res.data.page.next

        } while(next && !found)

        if(records.length){
            console.log(`${this.name}: ${records.length} New Games`)
            this.records.unshift(...records)

          let dir = this.file.substring(0,this.file.lastIndexOf("/"))
            if(!fs.existsSync(dir)){
                fs.mkdirSync(dir)
            }
            fs.writeFileSync(this.file,JSON.stringify(this.records, null,"  "))
        }

    }

    calculate(options = {}){
        let month = 2548800000
        let day = 84960000
        let mmrScale = 1
        let mmrStart = 3000
        let mmrShift = 0

        let monthsCriteria = options.monthsCriteria || 0

        let lobbiesTotal = 0
        let gamesTotal = 0
        this.ratedGames = 0
        let players = {}

        for(let i = this.records.length;i--; ){
          let record = this.records[i]

            let date = "20" + record.co.split("T")[0]

            if(monthsCriteria && Date.now() - Date.parse(date) > monthsCriteria *  month){
                continue
            }
            lobbiesTotal++;

            if(record.rr.length === 0){
                continue;
            }
            gamesTotal++;

            if(record.rr.length !== 2){
                continue;
            }
            this.ratedGames++;


            let decisionA = record.rr[0].d;
            let decisionB = record.rr[1].d

            let playerA =record.rr[0].pid
            let playerB =record.rr[1].pid

            for(let player of [playerA,playerB]){
                if(!players[player]){
                    players[player] = {
                        rating: mmrStart,
                        games: []
                    }
                }
            }

            let winner
            let loser
            if(decisionA === "win" && decisionB === "loss"){
                winner = playerA
                loser = playerB
            }
            else if(decisionA === "loss" && decisionB === "win"){
                winner = playerB
                loser = playerA
            }
            else{
                // players[playerA].games.push({d: date, vid: playerB, v: profiles.list[B].name, r: decisionA ===  "win" ? 1 : 0})
                // players[playerB].games.push({d: date, vid: playerA, v: profiles.list[A].name, r: decisionB ===  "win" ? 1 : 0})
                continue;
            }


            //   K — коэффициент, значение которого равно 10 для сильнейших игроков (рейтинг 2400 и выше), 20 (было 15) — для игроков с рейтингом меньше, чем 2400 и 40 (было 30) — для новых игроков (первые 30 партий с момента получения рейтинга ФИДЕ), а также для игроков до 18 лет, рейтинг которых ниже 2300;

//create object with K-Factor(without it defaults to 32)
            function getK(player){
                let score= players[player].rating

                if(players[player].games.length < 5 || score < mmrStart * 0.8){
                    return 40
                }
                else if(score < mmrStart * 1.2){
                    return 30
                }
                else{
                    return 20
                }
            }


            let previousRating = {
              [playerA]: players[playerA].rating,
              [playerB]: players[playerB].rating
            }

            let profiles = this.profiles
            function eloKCalculate(A, B, k, isWinner){
              let scoreA = players[A].rating, scoreB = players[B].rating;
              let expectedScoreA =  1/(1+Math.pow(10,((scoreB-scoreA)/400)));
              let actualScoreA = isWinner ? 1: 0
              return scoreA + k * (actualScoreA - expectedScoreA)
            }


          let oldScoreWinner = players[winner].rating
          let oldScoreLoser = players[loser].rating

          let newScoreWinner = eloKCalculate(winner, loser, getK(winner), true)
          let newScoreLoser = eloKCalculate(loser, winner, getK(loser), false)

          let winnerMMRChange = Math.round((newScoreWinner - oldScoreWinner) * mmrScale )
          let loserMMRChange = Math.round((newScoreLoser - oldScoreLoser)  * mmrScale )

          players[winner].games.unshift({d: date,
            ppmmr: Math.round(previousRating[winner]),
            vpmmr: Math.round(previousRating[loser]),
            vid: loser, v: profiles.list[loser].name,
            r: 1,
            m: winnerMMRChange,
            vm: loserMMRChange,
          })


          players[loser].games.unshift({d: date,
            ppmmr: Math.round(previousRating[loser]),
            vpmmr: Math.round(previousRating[winner]),
            vid: winner, v: profiles.list[winner].name,
            r: 0,
            m: loserMMRChange ,
            vm: winnerMMRChange
          })


          players[winner].rating = newScoreWinner;
          players[loser].rating = newScoreLoser;


        }

        let data = []
        for(let player in players) {
            let stats = players[player]

            if(!stats.games.length){
              continue
            }


            let gamesWin = stats.games.filter(g => g.r === 1).length
            let gamesLoss = stats.games.filter(g => g.r === 0).length
            let gamesNone = stats.games.length - gamesWin - gamesLoss
            let winRate = Math.round(gamesWin / (gamesWin + gamesLoss) * 100)
            let lastGameDate = players[player].games[0].d


            let ago = Math.round((Date.now() - Date.parse(lastGameDate)) / day)
            // if(ago > 365){
            //     continue;
            // }
            // if(!gamesWin){
            //     continue;
            // }
            let diff = (stats.rating - mmrStart) * mmrScale
            let scaledRating = Math.round((mmrStart + diff + mmrShift ))

            // let symbol = {
            //     win: "▲",
            //     loss: "▼",
            // };

            data.push({
              id: player,
                name: this.profiles.list[player].name,
                tag: this.profiles.list[player].battleTag,
                win: gamesWin,
                lose: gamesLoss,
                rate: winRate,
                // stats: `${scaledRating}▲${gamesWin}▼${gamesLoss}⬤${gamesNone}`,
                games: stats.games,//.map(g => g.date + (symbol[g.result] || '⬤') + g.opponent),
                mmr: scaledRating,
                // mmr: stats.rating,
                time: ago

                // lastGameDate,
                // firstGameDate: players[player].games[players[player].games.length - 1].date.split("T")[0],
                // gamesTotal: stats.games.length,
                // gamesWin,
                // gamesLoss,
                //   string: `${player.padEnd(12," ")} ${String(scaledRating).padStart(5," ")}★   ${String(winRate).padStart(3," ")}%  ${String(stats.games.length).padStart(4," ")}⚑  ${String(ago).padStart(4," ")}d`
                // string: `${player.padEnd(12," ")} ${String(scaledRating).padStart(4," ")} ${String(winRate).padStart(3," ")}%`
            })


        }


        data.sort((a,b)=> a.mmr < b.mmr ? 1 : -1)

      this.data = data

        fs.writeFileSync(this.ratingsFile,JSON.stringify(data, null, 4))
    }
    print(options = {}){
      let limit = options.limit || 1000
      let minGamesCriteria = options.minGamesCriteria || 5

      let data = this.data

      let filtered = minGamesCriteria ? data.filter(r => r.games.length >= minGamesCriteria) : data



      function playerString(data){

        if(!data.tag){
          data.tag =""
          // console.log(data.name + " hase no tag")
        }
        return `${data.name.padEnd(12," ")} ${data.tag.padEnd(22," ")} ${String(data.mmr).padStart(5," ")}★   ${String(data.rate).padStart(3," ")}%  ${String(data.games.length).padStart(4," ")}⚑  ${String(data.time).padStart(4," ")}d`
      }


      console.log(`===== MOD: ${this.name} =====`)
      // console.log(`Public Lobbies: ${lobbiesTotal}`)
      // console.log(`Public Games Played: ${gamesTotal}`)
      console.log(`Public Games Rated: ${this.ratedGames}`)
      console.log(`Players Total: ${data.length}`)
      // console.log(`Players Active: ${filtered.length}`)

      console.log(`----------------------------------------`)
      console.log(`Name          Rating  Wins Games  Active`)
      console.log(`----------------------------------------`)
      for(let p =0 ; p < filtered.length && p < limit ; p++) console.log(playerString(filtered[p]))
      console.log(`----------------------------------------`)

    }
}

let profiles = new Profiles()

let mods = {
    arc: {
        na: 339136,
        eu: 239035,
        kr: 152312,
    },
    scion: {
        na: 296214,
        eu: 207314,
        kr: 122362
    }
}

for(let mod in mods) {
    for(let region in mods[mod]) {
        let lobbies = new Lobbies(profiles,`${mod}-${region}`, region, mods[mod][region])
        await lobbies.update()
        // await profiles.update(lobbies.records)
        profiles.save()
        lobbies.calculate()
      lobbies.print()
    }
}
