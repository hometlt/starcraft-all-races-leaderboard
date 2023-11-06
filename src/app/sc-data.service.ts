import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {filter, Observable, of} from "rxjs";
import {NavigationEnd, Router} from "@angular/router";
import {Meta, Title} from "@angular/platform-browser";



@Injectable({
  providedIn: 'root'
})
export class SCDataService {

  modID: string
  playerID: string
  regionID: string
  leaderboardData: any
  playerData: any
  leaderboardFilteredData: any
  modsData: any

  minGames = 5
  minWins = 1
  maxActive = 0

  constructor(private http: HttpClient,
              private router: Router,
              private title: Title,
              private meta: Meta
  ) {

    this.http.get(`data/mods.json`).subscribe(data => this.modsData = data)

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(e => {
      let [mod,region,player] = this.router.url.substring(1).split("/")

      mod = mod?.toLowerCase()
      region = region?.toLowerCase()
      player = player?.toLowerCase()

      this.playerID = player

      this.playerData = this.playerID &&  this.leaderboardData?.find((d:any) => d.id === this.playerID)

      if(this.modID !== mod || this.regionID !== region){
        this.modID = mod
        this.regionID = region

        if(mod && region){
          this.http.get(`data/${mod}-${region}/rating.json`).subscribe(data => {

              this.leaderboardData = data

              this.leaderboardFilteredData = this.leaderboardData.filter((r: any )=> {
                if(this.minGames && r.games.length < this.minGames)return false
                if(this.maxActive && r.time > this.maxActive)return false
                if(this.minWins && r.win < this.minWins)return false
                return true
              })

              // let title = data ? 'ARC Wiki - ' + unitData.Race + ' ' + unitData.Name : 'ARC'
              // let icon =  unitData ? 'http://arc.hometlt.ru' + this.imagesRoot + unitData.Icon + '.png' : 'favioon.png'
              // let url =   `http://arc.hometlt.ru/datas/${this.modID}/${unitData.Race}/${unitData.id}`
              //
              // this.title.setTitle(title);
              // this.meta.updateTag({property: 'og:title', content: title});
              // this.meta.updateTag({property: 'og:image', content: icon});
              // this.meta.updateTag({property: 'og:type', content: 'website'});
              // this.meta.updateTag({property: 'og:url', content: url})


            this.playerData = this.playerID && this.leaderboardData?.find((d:any) => d.id === this.playerID)
          })

        }
        else{
          this.leaderboardData = null
        }
      }
    })
  }
}
